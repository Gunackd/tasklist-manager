import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';

export interface UserDoc {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  resetToken?: string | null;
  resetTokenExpiry?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListDoc {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  color?: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDoc {
  _id: string;
  taskListId: string;
  userId: string;
  title: string;
  categories?: ('S' | 'NS' | 'M' | 'A')[];
  category?: 'S' | 'NS' | 'M' | 'A';
  completed: boolean;
  inProgress?: boolean;
  order: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function normalizeTaskCategories(doc: any): ('S' | 'NS' | 'M' | 'A')[] {
  if (Array.isArray(doc?.categories)) {
    return doc.categories.filter((c: any) => ['S', 'NS', 'M', 'A'].includes(c));
  }
  if (doc?.category && ['S', 'NS', 'M', 'A'].includes(doc.category)) {
    return [doc.category];
  }
  return ['S'];
}

interface LocalDatabase {
  users: UserDoc[];
  taskLists: TaskListDoc[];
  tasks: TaskDoc[];
}

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? '/tmp' : path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create data directory, using in-memory fallback:', e);
}

let memoryDb: LocalDatabase = {
  users: [],
  taskLists: [],
  tasks: [],
};

// Load existing data from file if present
function loadLocalDb(): LocalDatabase {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        users: parsed.users || [],
        taskLists: parsed.taskLists || [],
        tasks: parsed.tasks || [],
      };
    }
  } catch (err) {
    console.error('Failed to read local database file:', err);
  }
  return { users: [], taskLists: [], tasks: [] };
}

function saveLocalDb() {
  try {
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(memoryDb, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('Failed to persist database file:', err);
  }
}

memoryDb = loadLocalDb();

let isMongoConnected = false;

// Optional MongoDB Mongoose schemas
const MUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  avatarUrl: { type: String },
  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Number, default: null },
}, { timestamps: true });

const MTaskListSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  color: { type: String, default: 'blue' },
  order: { type: Number, default: 0 },
}, { timestamps: true });

const MTaskSchema = new mongoose.Schema({
  taskListId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  categories: { type: [String], default: ['S'], index: true },
  category: { type: String, default: 'S', index: true },
  completed: { type: Boolean, default: false },
  inProgress: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  completedAt: { type: String, default: null },
}, { timestamps: true });

MTaskSchema.index({ userId: 1, categories: 1 });
MTaskSchema.index({ userId: 1, category: 1 });

export let MUser: mongoose.Model<any>;
export let MTaskList: mongoose.Model<any>;
export let MTask: mongoose.Model<any>;

export async function initDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri && !mongoUri.includes('username:password')) {
    try {
      console.log('Connecting to MongoDB Atlas...');
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 4000,
      });
      isMongoConnected = true;
      MUser = mongoose.models.User || mongoose.model('User', MUserSchema);
      MTaskList = mongoose.models.TaskList || mongoose.model('TaskList', MTaskListSchema);
      MTask = mongoose.models.Task || mongoose.model('Task', MTaskSchema);
      console.log('Successfully connected to MongoDB Atlas!');
      return;
    } catch (err) {
      console.warn('MongoDB connection failed or timeout, falling back to persistent disk database:', (err as Error).message);
      isMongoConnected = false;
    }
  } else {
    console.log('Using persistent disk database at:', DATA_FILE);
  }
}

export function getDatabaseStatus() {
  return {
    isMongo: isMongoConnected,
    type: isMongoConnected ? 'MongoDB Atlas' : 'Persistent File Cloud DB (JSON/Disk)',
    totalUsers: memoryDb.users.length,
    totalLists: memoryDb.taskLists.length,
    totalTasks: memoryDb.tasks.length,
  };
}

// Unified Database Provider
export const db = {
  users: {
    async findByEmail(email: string): Promise<UserDoc | null> {
      const normalized = email.trim().toLowerCase();
      if (isMongoConnected) {
        const doc = await MUser.findOne({ email: normalized }).lean();
        if (!doc) return null;
        return { ...doc, _id: doc._id.toString() } as unknown as UserDoc;
      }
      return memoryDb.users.find(u => u.email.toLowerCase() === normalized) || null;
    },

    async findById(id: string): Promise<UserDoc | null> {
      if (isMongoConnected) {
        const doc = await MUser.findById(id).lean();
        if (!doc) return null;
        return { ...doc, _id: doc._id.toString() } as unknown as UserDoc;
      }
      return memoryDb.users.find(u => u._id === id) || null;
    },

    async create(userData: Omit<UserDoc, '_id' | 'createdAt' | 'updatedAt'>): Promise<UserDoc> {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const created = await MUser.create({
          ...userData,
          email: userData.email.toLowerCase(),
        });
        const doc = created.toObject();
        return { ...doc, _id: doc._id.toString() } as unknown as UserDoc;
      }

      const newUser: UserDoc = {
        _id: `usr_${crypto.randomUUID()}`,
        name: userData.name,
        email: userData.email.toLowerCase(),
        passwordHash: userData.passwordHash,
        avatarUrl: userData.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name)}`,
        resetToken: userData.resetToken || null,
        resetTokenExpiry: userData.resetTokenExpiry || null,
        createdAt: now,
        updatedAt: now,
      };

      memoryDb.users.push(newUser);
      saveLocalDb();
      return newUser;
    },

    async update(id: string, updates: Partial<UserDoc>): Promise<UserDoc | null> {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const updated = await MUser.findByIdAndUpdate(id, { ...updates, updatedAt: now }, { new: true }).lean();
        if (!updated) return null;
        return { ...updated, _id: updated._id.toString() } as unknown as UserDoc;
      }

      const index = memoryDb.users.findIndex(u => u._id === id);
      if (index === -1) return null;
      memoryDb.users[index] = {
        ...memoryDb.users[index],
        ...updates,
        updatedAt: now,
      };
      saveLocalDb();
      return memoryDb.users[index];
    },

    async findByResetToken(token: string): Promise<UserDoc | null> {
      const now = Date.now();
      if (isMongoConnected) {
        const doc = await MUser.findOne({
          resetToken: token,
          resetTokenExpiry: { $gt: now },
        }).lean();
        if (!doc) return null;
        return { ...doc, _id: doc._id.toString() } as unknown as UserDoc;
      }
      return memoryDb.users.find(u => u.resetToken === token && (u.resetTokenExpiry || 0) > now) || null;
    }
  },

  taskLists: {
    async findByUserId(userId: string): Promise<TaskListDoc[]> {
      if (isMongoConnected) {
        const docs = await MTaskList.find({ userId }).sort({ order: 1, createdAt: -1 }).lean();
        return docs.map(d => ({ ...d, _id: d._id.toString() })) as unknown as TaskListDoc[];
      }
      return memoryDb.taskLists
        .filter(l => l.userId === userId)
        .sort((a, b) => {
          const orderA = a.order ?? 0;
          const orderB = b.order ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    },

    async findById(id: string): Promise<TaskListDoc | null> {
      if (isMongoConnected) {
        const doc = await MTaskList.findById(id).lean();
        if (!doc) return null;
        return { ...doc, _id: doc._id.toString() } as unknown as TaskListDoc;
      }
      return memoryDb.taskLists.find(l => l._id === id) || null;
    },

    async create(listData: { userId: string; title: string; description?: string; color?: string; order?: number }): Promise<TaskListDoc> {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const count = await MTaskList.countDocuments({ userId: listData.userId });
        const created = await MTaskList.create({
          ...listData,
          order: listData.order ?? count,
        });
        const doc = created.toObject();
        return { ...doc, _id: doc._id.toString() } as unknown as TaskListDoc;
      }

      const userLists = memoryDb.taskLists.filter(l => l.userId === listData.userId);
      const newList: TaskListDoc = {
        _id: `list_${crypto.randomUUID()}`,
        userId: listData.userId,
        title: listData.title,
        description: listData.description || '',
        color: listData.color || 'blue',
        order: listData.order ?? userLists.length,
        createdAt: now,
        updatedAt: now,
      };
      memoryDb.taskLists.push(newList);
      saveLocalDb();
      return newList;
    },

    async reorder(userId: string, listIds: string[]): Promise<boolean> {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const bulkOps = listIds.map((id, index) => ({
          updateOne: {
            filter: { _id: id, userId },
            update: { $set: { order: index, updatedAt: now } },
          },
        }));
        if (bulkOps.length > 0) {
          await MTaskList.bulkWrite(bulkOps);
        }
        return true;
      }

      listIds.forEach((id, index) => {
        const item = memoryDb.taskLists.find(l => l._id === id && l.userId === userId);
        if (item) {
          item.order = index;
          item.updatedAt = now;
        }
      });
      saveLocalDb();
      return true;
    },

    async update(id: string, userId: string, updates: Partial<TaskListDoc>): Promise<TaskListDoc | null> {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const updated = await MTaskList.findOneAndUpdate(
          { _id: id, userId },
          { ...updates, updatedAt: now },
          { new: true }
        ).lean();
        if (!updated) return null;
        return { ...updated, _id: updated._id.toString() } as unknown as TaskListDoc;
      }

      const index = memoryDb.taskLists.findIndex(l => l._id === id && l.userId === userId);
      if (index === -1) return null;
      memoryDb.taskLists[index] = {
        ...memoryDb.taskLists[index],
        ...updates,
        updatedAt: now,
      };
      saveLocalDb();
      return memoryDb.taskLists[index];
    },

    async delete(id: string, userId: string): Promise<boolean> {
      if (isMongoConnected) {
        const res = await MTaskList.deleteOne({ _id: id, userId });
        if (res.deletedCount > 0) {
          await MTask.deleteMany({ taskListId: id });
          return true;
        }
        return false;
      }

      const initialLength = memoryDb.taskLists.length;
      memoryDb.taskLists = memoryDb.taskLists.filter(l => !(l._id === id && l.userId === userId));
      if (memoryDb.taskLists.length < initialLength) {
        // Also cascade delete tasks in this list
        memoryDb.tasks = memoryDb.tasks.filter(t => t.taskListId !== id);
        saveLocalDb();
        return true;
      }
      return false;
    }
  },

  tasks: {
    async findByListId(taskListId: string): Promise<TaskDoc[]> {
      if (isMongoConnected) {
        const docs = await MTask.find({ taskListId }).sort({ order: 1, createdAt: 1 }).lean();
        return docs.map(d => {
          const cats = normalizeTaskCategories(d);
          return { ...d, _id: d._id.toString(), categories: cats, category: cats[0] || 'S' } as unknown as TaskDoc;
        });
      }
      return memoryDb.tasks
        .filter(t => t.taskListId === taskListId)
        .map(t => {
          const cats = normalizeTaskCategories(t);
          return { ...t, categories: cats, category: cats[0] || 'S' };
        })
        .sort((a, b) => a.order - b.order || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },

    async findById(id: string): Promise<TaskDoc | null> {
      if (isMongoConnected) {
        const doc = await MTask.findById(id).lean();
        if (!doc) return null;
        const cats = normalizeTaskCategories(doc);
        return { ...doc, _id: doc._id.toString(), categories: cats, category: cats[0] || 'S' } as unknown as TaskDoc;
      }
      const found = memoryDb.tasks.find(t => t._id === id);
      if (!found) return null;
      const cats = normalizeTaskCategories(found);
      return { ...found, categories: cats, category: cats[0] || 'S' };
    },

    async findByUserId(
      userId: string,
      categories?: string[] | string,
      includeCompleted: boolean = false
    ): Promise<TaskDoc[]> {
      let validCategories: ('S' | 'NS' | 'M' | 'A')[] = [];
      if (Array.isArray(categories)) {
        validCategories = categories.filter((c: any) => ['S', 'NS', 'M', 'A'].includes(c)) as any;
      } else if (typeof categories === 'string' && categories.trim()) {
        validCategories = categories
          .split(',')
          .map(c => c.trim())
          .filter((c: any) => ['S', 'NS', 'M', 'A'].includes(c)) as any;
      }

      if (isMongoConnected) {
        const filter: any = { userId };
        if (!includeCompleted) {
          filter.completed = false;
        }
        if (validCategories.length > 0) {
          const orConditions: any[] = [
            { categories: { $in: validCategories } },
            { category: { $in: validCategories } },
          ];
          if (validCategories.includes('S')) {
            orConditions.push(
              { categories: { $exists: false } },
              { categories: { $size: 0 } },
              { category: { $exists: false } },
              { category: null }
            );
          }
          filter.$or = orConditions;
        }
        const docs = await MTask.find(filter).sort({ order: 1, createdAt: 1 }).lean();
        return docs.map(d => {
          const cats = normalizeTaskCategories(d);
          return { ...d, _id: d._id.toString(), categories: cats, category: cats[0] || 'S' } as unknown as TaskDoc;
        });
      }

      return memoryDb.tasks
        .filter(t => {
          if (t.userId !== userId) return false;
          if (!includeCompleted && t.completed) return false;
          if (validCategories.length === 0) return true;
          const cats = normalizeTaskCategories(t);
          return validCategories.some(c => cats.includes(c));
        })
        .map(t => {
          const cats = normalizeTaskCategories(t);
          return { ...t, categories: cats, category: cats[0] || 'S' };
        })
        .sort((a, b) => a.order - b.order || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },

    async create(taskData: {
      taskListId: string;
      userId: string;
      title: string;
      categories?: ('S' | 'NS' | 'M' | 'A')[];
      category?: 'S' | 'NS' | 'M' | 'A';
      order?: number;
    }): Promise<TaskDoc> {
      const now = new Date().toISOString();
      const categories = normalizeTaskCategories(taskData);
      const category = categories[0] || 'S';
      let order = taskData.order;
      if (order === undefined) {
        const existing = await this.findByListId(taskData.taskListId);
        order = existing.length > 0 ? Math.max(...existing.map(e => e.order)) + 1 : 0;
      }

      if (isMongoConnected) {
        const created = await MTask.create({ ...taskData, categories, category, order, completed: false });
        const doc = created.toObject();
        return { ...doc, _id: doc._id.toString(), categories, category } as unknown as TaskDoc;
      }

      const newTask: TaskDoc = {
        _id: `task_${crypto.randomUUID()}`,
        taskListId: taskData.taskListId,
        userId: taskData.userId,
        title: taskData.title,
        categories,
        category,
        completed: false,
        order,
        createdAt: now,
        updatedAt: now,
      };
      memoryDb.tasks.push(newTask);
      saveLocalDb();
      return newTask;
    },

    async createMany(
      taskListId: string,
      userId: string,
      items: ({ title: string; categories?: ('S' | 'NS' | 'M' | 'A')[]; category?: 'S' | 'NS' | 'M' | 'A' } | string)[],
      defaultCategories: ('S' | 'NS' | 'M' | 'A')[] = ['S']
    ): Promise<TaskDoc[]> {
      const now = new Date().toISOString();
      const existing = await this.findByListId(taskListId);
      let startOrder = existing.length > 0 ? Math.max(...existing.map(e => e.order)) + 1 : 0;

      const newTasks: TaskDoc[] = items.map((item, idx) => {
        const title = typeof item === 'string' ? item : item.title;
        let categories: ('S' | 'NS' | 'M' | 'A')[] = defaultCategories;
        if (typeof item === 'object') {
          categories = normalizeTaskCategories(item);
        }
        return {
          _id: `task_${crypto.randomUUID()}`,
          taskListId,
          userId,
          title,
          categories,
          category: categories[0] || 'S',
          completed: false,
          order: startOrder + idx,
          createdAt: now,
          updatedAt: now,
        };
      });

      if (isMongoConnected) {
        const toInsert = newTasks.map(t => ({
          taskListId: t.taskListId,
          userId: t.userId,
          title: t.title,
          categories: t.categories,
          category: t.category,
          completed: false,
          order: t.order,
        }));
        const createdDocs = await MTask.insertMany(toInsert);
        return createdDocs.map(d => {
          const cats = normalizeTaskCategories(d);
          return { ...d.toObject(), _id: d._id.toString(), categories: cats, category: cats[0] || 'S' } as unknown as TaskDoc;
        });
      }

      memoryDb.tasks.push(...newTasks);
      saveLocalDb();
      return newTasks;
    },

    async update(id: string, userId: string, updates: Partial<TaskDoc>): Promise<TaskDoc | null> {
      const now = new Date().toISOString();
      const safeUpdates: any = { ...updates };
      if (updates.inProgress !== undefined) {
        const isProg = Boolean(updates.inProgress);
        safeUpdates.inProgress = isProg;
        if (isProg && updates.completed === undefined) {
          safeUpdates.completed = false;
          safeUpdates.completedAt = null;
        }
      }
      if (updates.completed !== undefined) {
        const isDone = Boolean(updates.completed);
        safeUpdates.completed = isDone;
        if (isDone && updates.inProgress === undefined) {
          safeUpdates.inProgress = false;
        }
      }
      if (updates.categories !== undefined) {
        const cats = normalizeTaskCategories({ categories: updates.categories });
        safeUpdates.categories = cats;
        safeUpdates.category = cats[0] || 'S';
      } else if (updates.category !== undefined) {
        const cats = normalizeTaskCategories({ category: updates.category });
        safeUpdates.categories = cats;
        safeUpdates.category = cats[0] || 'S';
      }

      if (isMongoConnected) {
        const updated = await MTask.findOneAndUpdate(
          { _id: id, userId },
          { ...safeUpdates, updatedAt: now },
          { new: true }
        ).lean();
        if (!updated) return null;
        const cats = normalizeTaskCategories(updated);
        return { ...updated, _id: updated._id.toString(), categories: cats, category: cats[0] || 'S' } as unknown as TaskDoc;
      }

      const index = memoryDb.tasks.findIndex(t => t._id === id && t.userId === userId);
      if (index === -1) return null;
      memoryDb.tasks[index] = {
        ...memoryDb.tasks[index],
        ...safeUpdates,
        updatedAt: now,
      };
      const cats = normalizeTaskCategories(memoryDb.tasks[index]);
      memoryDb.tasks[index].categories = cats;
      memoryDb.tasks[index].category = cats[0] || 'S';
      saveLocalDb();
      return memoryDb.tasks[index];
    },

    async reorder(taskListId: string, userId: string, taskIds: string[]): Promise<boolean> {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const bulkOps = taskIds.map((id, index) => ({
          updateOne: {
            filter: { _id: id, taskListId, userId },
            update: { $set: { order: index, updatedAt: now } }
          }
        }));
        await MTask.bulkWrite(bulkOps);
        return true;
      }

      for (let i = 0; i < taskIds.length; i++) {
        const id = taskIds[i];
        const task = memoryDb.tasks.find(t => t._id === id && t.taskListId === taskListId && t.userId === userId);
        if (task) {
          task.order = i;
          task.updatedAt = now;
        }
      }
      saveLocalDb();
      return true;
    },

    async delete(id: string, userId: string): Promise<boolean> {
      if (isMongoConnected) {
        const res = await MTask.deleteOne({ _id: id, userId });
        return res.deletedCount > 0;
      }

      const initialLength = memoryDb.tasks.length;
      memoryDb.tasks = memoryDb.tasks.filter(t => !(t._id === id && t.userId === userId));
      if (memoryDb.tasks.length < initialLength) {
        saveLocalDb();
        return true;
      }
      return false;
    }
  }
};
