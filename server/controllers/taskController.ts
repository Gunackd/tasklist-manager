import { Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getAllTasks(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;

    let categories: string[] | undefined = undefined;
    if (req.query.categories) {
      if (Array.isArray(req.query.categories)) {
        categories = req.query.categories.map(c => String(c).trim());
      } else if (typeof req.query.categories === 'string') {
        categories = req.query.categories.split(',').map(c => c.trim()).filter(Boolean);
      }
    } else if (typeof req.query.category === 'string' && req.query.category.trim() && req.query.category !== 'all') {
      categories = req.query.category.split(',').map(c => c.trim()).filter(Boolean);
    }

    const includeCompleted = req.query.includeCompleted === 'true';

    let tags: string[] | undefined = undefined;
    if (req.query.tags) {
      if (Array.isArray(req.query.tags)) {
        tags = req.query.tags.map(c => String(c).trim()).filter(Boolean);
      } else if (typeof req.query.tags === 'string') {
        tags = req.query.tags.split(',').map(c => c.trim()).filter(Boolean);
      }
    } else if (typeof req.query.tag === 'string' && req.query.tag.trim()) {
      tags = req.query.tag.split(',').map(c => c.trim()).filter(Boolean);
    }

    const [tasks, lists] = await Promise.all([
      db.tasks.findByUserId(userId, categories, includeCompleted, tags),
      db.taskLists.findByUserId(userId),
    ]);

    const listMap = new Map(lists.map(l => [l._id, { title: l.title, color: l.color }]));

    const enrichedTasks = tasks.map(t => {
      const listInfo = listMap.get(t.taskListId);
      const cats = Array.isArray(t.categories) && t.categories.length > 0 ? t.categories : [t.category || 'S'];
      return {
        ...t,
        categories: cats,
        category: cats[0] || 'S',
        taskListTitle: listInfo?.title || 'Unknown List',
        taskListColor: listInfo?.color || 'blue',
      };
    });

    return res.json(enrichedTasks);
  } catch (err: any) {
    console.error('getAllTasks error:', err);
    return res.status(500).json({ message: 'Failed to fetch tasks: ' + err.message });
  }
}

export async function getTasksByList(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { listId } = req.params;

    // Check list ownership
    const list = await db.taskLists.findById(listId);
    if (!list) {
      return res.status(404).json({ message: 'Task list not found.' });
    }
    if (list.userId !== userId) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to view tasks in this list.' });
    }

    const tasks = await db.tasks.findByListId(listId);
    return res.json(tasks);
  } catch (err: any) {
    console.error('getTasksByList error:', err);
    return res.status(500).json({ message: 'Failed to fetch tasks: ' + err.message });
  }
}

export async function createTask(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { listId } = req.params;
    const { title, categories, category, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required.' });
    }

    const list = await db.taskLists.findById(listId);
    if (!list) {
      return res.status(404).json({ message: 'Task list not found.' });
    }
    if (list.userId !== userId) {
      return res.status(403).json({ message: 'Access denied: Cannot add task to another user\'s list.' });
    }

    let parsedCategories: ('S' | 'NS' | 'M' | 'A')[] = [];
    if (Array.isArray(categories)) {
      parsedCategories = categories.filter((c: any) => ['S', 'NS', 'M', 'A'].includes(c));
    } else if (category && ['S', 'NS', 'M', 'A'].includes(category)) {
      parsedCategories = [category];
    }

    if (parsedCategories.length === 0) {
      parsedCategories = ['S'];
    }

    let parsedTags: string[] = [];
    if (Array.isArray(tags)) {
      parsedTags = Array.from(new Set(tags.map((t: any) => String(t).trim()).filter(Boolean)));
    } else if (typeof tags === 'string' && tags.trim()) {
      parsedTags = [tags.trim()];
    }

    const task = await db.tasks.create({
      taskListId: listId,
      userId,
      title: title.trim(),
      tags: parsedTags,
      categories: parsedCategories,
      category: parsedCategories[0] || 'S',
    });

    return res.status(201).json(task);
  } catch (err: any) {
    console.error('createTask error:', err);
    return res.status(500).json({ message: 'Failed to create task: ' + err.message });
  }
}

export async function bulkAddTasks(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { listId } = req.params;
    const { tasks, categories, category } = req.body; // Array of strings or { title, categories } objects

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ message: 'Expected a non-empty array of task titles.' });
    }

    const list = await db.taskLists.findById(listId);
    if (!list) {
      return res.status(404).json({ message: 'Task list not found.' });
    }
    if (list.userId !== userId) {
      return res.status(403).json({ message: 'Access denied: Cannot add tasks to another user\'s list.' });
    }

    let defaultCategories: ('S' | 'NS' | 'M' | 'A')[] = [];
    if (Array.isArray(categories)) {
      defaultCategories = categories.filter((c: any) => ['S', 'NS', 'M', 'A'].includes(c));
    } else if (category && ['S', 'NS', 'M', 'A'].includes(category)) {
      defaultCategories = [category];
    }
    if (defaultCategories.length === 0) {
      defaultCategories = ['S'];
    }

    // Parse each item (string or object with title/categories)
    const cleanedItems: { title: string; categories?: ('S' | 'NS' | 'M' | 'A')[] }[] = [];

    for (const item of tasks) {
      let rawTitle = '';
      let itemCategories: ('S' | 'NS' | 'M' | 'A')[] | undefined = undefined;

      if (typeof item === 'string') {
        rawTitle = item.trim();
      } else if (item && typeof item === 'object') {
        rawTitle = typeof item.title === 'string' ? item.title.trim() : '';
        if (Array.isArray(item.categories)) {
          itemCategories = item.categories.filter((c: any) => ['S', 'NS', 'M', 'A'].includes(c));
        } else if (item.category && ['S', 'NS', 'M', 'A'].includes(item.category)) {
          itemCategories = [item.category];
        }
      }

      // Check for inline bracketed categories e.g. [S, M], [S][NS], [A]
      const bracketMatch = rawTitle.match(/^\[([S|NS|M|A|\s|,]+)\]\s*/i);
      if (bracketMatch) {
        const found = bracketMatch[1]
          .split(/[,\s]+/)
          .map(s => s.trim().toUpperCase())
          .filter((c: any) => ['S', 'NS', 'M', 'A'].includes(c)) as ('S' | 'NS' | 'M' | 'A')[];
        if (found.length > 0) {
          itemCategories = found;
          rawTitle = rawTitle.slice(bracketMatch[0].length);
        }
      }

      // Clean numbering, bullets, checkbox markers
      const cleaned = rawTitle
        .replace(/^\[[ xX]\]\s*/, '')
        .replace(/^[✓✔○●\-\*\+•›»\>]\s*/, '')
        .replace(/^\(?\d+[\.\)\:\-]\s*/, '')
        .replace(/^[✓✔○●\-\*\+•›»\>]\s*/, '')
        .trim();

      if (cleaned.length > 0) {
        cleanedItems.push({
          title: cleaned,
          categories: itemCategories && itemCategories.length > 0 ? itemCategories : defaultCategories,
        });
      }
    }

    if (cleanedItems.length === 0) {
      return res.status(400).json({ message: 'No valid task titles found in submission.' });
    }

    const createdTasks = await db.tasks.createMany(listId, userId, cleanedItems, defaultCategories);

    return res.status(201).json({
      message: `Successfully added ${createdTasks.length} tasks`,
      tasks: createdTasks,
    });
  } catch (err: any) {
    console.error('bulkAddTasks error:', err);
    return res.status(500).json({ message: 'Failed to bulk add tasks: ' + err.message });
  }
}

export async function updateTask(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { title, completed, order, categories, category, inProgress, tags } = req.body;

    const existing = await db.tasks.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ message: 'Access denied: Cannot modify another user\'s task.' });
    }

    const updates: Partial<{
      title: string;
      tags: string[];
      completed: boolean;
      inProgress: boolean;
      order: number;
      completedAt: string | null;
      categories: ('S' | 'NS' | 'M' | 'A')[];
      category: 'S' | 'NS' | 'M' | 'A';
    }> = {};

    if (title !== undefined && title.trim()) updates.title = title.trim();
    if (categories !== undefined && Array.isArray(categories)) {
      const valid = categories.filter((c: any) => ['S', 'NS', 'M', 'A'].includes(c));
      updates.categories = valid.length > 0 ? valid : ['S'];
      updates.category = updates.categories[0] || 'S';
    } else if (category !== undefined && ['S', 'NS', 'M', 'A'].includes(category)) {
      updates.categories = [category];
      updates.category = category as 'S' | 'NS' | 'M' | 'A';
    }

    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        updates.tags = Array.from(new Set(tags.map((t: any) => String(t).trim()).filter(Boolean)));
      } else if (typeof tags === 'string') {
        updates.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
      } else {
        updates.tags = [];
      }
    }

    if (inProgress !== undefined) {
      updates.inProgress = Boolean(inProgress);
    }
    if (completed !== undefined) {
      const isDone = Boolean(completed);
      updates.completed = isDone;
      updates.completedAt = isDone ? new Date().toISOString() : null;
    }
    if (order !== undefined) updates.order = Number(order);

    const updated = await db.tasks.update(id, userId, updates);

    return res.json(updated);
  } catch (err: any) {
    console.error('updateTask error:', err);
    return res.status(500).json({ message: 'Failed to update task: ' + err.message });
  }
}

export async function getAllUserTags(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const tasks = await db.tasks.findByUserId(userId, undefined, true);
    const tagMap: Record<string, { name: string; total: number; active: number; completed: number }> = {};

    tasks.forEach(t => {
      const taskTags = Array.isArray(t.tags) ? t.tags : [];
      taskTags.forEach(tag => {
        const trimmed = tag.trim();
        if (!trimmed) return;
        if (!tagMap[trimmed]) {
          tagMap[trimmed] = { name: trimmed, total: 0, active: 0, completed: 0 };
        }
        tagMap[trimmed].total += 1;
        if (t.completed) {
          tagMap[trimmed].completed += 1;
        } else {
          tagMap[trimmed].active += 1;
        }
      });
    });

    const tagsList = Object.values(tagMap).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    return res.json(tagsList);
  } catch (err: any) {
    console.error('getAllUserTags error:', err);
    return res.status(500).json({ message: 'Failed to fetch tags: ' + err.message });
  }
}

export async function reorderTasks(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { listId } = req.params;
    const { taskIds } = req.body; // Array of ordered task IDs

    if (!Array.isArray(taskIds)) {
      return res.status(400).json({ message: 'taskIds must be an array of IDs.' });
    }

    const list = await db.taskLists.findById(listId);
    if (!list || list.userId !== userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    await db.tasks.reorder(listId, userId, taskIds);

    const updatedTasks = await db.tasks.findByListId(listId);
    return res.json({ message: 'Tasks reordered successfully', tasks: updatedTasks });
  } catch (err: any) {
    console.error('reorderTasks error:', err);
    return res.status(500).json({ message: 'Failed to reorder tasks: ' + err.message });
  }
}

export async function deleteTask(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await db.tasks.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ message: 'Access denied: Cannot delete another user\'s task.' });
    }

    const deleted = await db.tasks.delete(id, userId);
    if (!deleted) {
      return res.status(500).json({ message: 'Failed to delete task.' });
    }

    return res.json({ message: 'Task deleted successfully.' });
  } catch (err: any) {
    console.error('deleteTask error:', err);
    return res.status(500).json({ message: 'Failed to delete task: ' + err.message });
  }
}

export async function clearCompletedTasks(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { listId } = req.params;

    const list = await db.taskLists.findById(listId);
    if (!list || list.userId !== userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const tasks = await db.tasks.findByListId(listId);
    const completedTasks = tasks.filter(t => t.completed);

    for (const t of completedTasks) {
      await db.tasks.delete(t._id, userId);
    }

    const remaining = await db.tasks.findByListId(listId);
    return res.json({
      message: `Cleared ${completedTasks.length} completed tasks.`,
      tasks: remaining,
    });
  } catch (err: any) {
    console.error('clearCompletedTasks error:', err);
    return res.status(500).json({ message: 'Failed to clear completed tasks: ' + err.message });
  }
}
