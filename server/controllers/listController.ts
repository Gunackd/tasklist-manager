import { Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getLists(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const lists = await db.taskLists.findByUserId(userId);

    // Compute progress and task count for each list
    const listsWithStats = await Promise.all(
      lists.map(async (list) => {
        const tasks = await db.tasks.findByListId(list._id);
        const total = tasks.length;
        const completedTasksList = tasks.filter(t => t.completed);
        const completed = completedTasksList.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        let lastCompletedTask: { _id: string; title: string; completedAt?: string | null } | null = null;
        if (completedTasksList.length > 0) {
          const sorted = [...completedTasksList].sort((a, b) => {
            const timeA = new Date(a.completedAt || a.updatedAt || a.createdAt).getTime();
            const timeB = new Date(b.completedAt || b.updatedAt || b.createdAt).getTime();
            return timeB - timeA;
          });
          lastCompletedTask = {
            _id: sorted[0]._id,
            title: sorted[0].title,
            completedAt: sorted[0].completedAt || sorted[0].updatedAt || sorted[0].createdAt,
          };
        }

        return {
          ...list,
          totalTasks: total,
          completedTasks: completed,
          progress,
          lastCompletedTask,
        };
      })
    );

    return res.json(listsWithStats);
  } catch (err: any) {
    console.error('getLists error:', err);
    return res.status(500).json({ message: 'Failed to fetch task lists: ' + err.message });
  }
}

export async function createList(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { title, description, color } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task list title is required.' });
    }

    const newList = await db.taskLists.create({
      userId,
      title: title.trim(),
      description: description ? description.trim() : '',
      color: color || 'blue',
    });

    return res.status(201).json({
      ...newList,
      totalTasks: 0,
      completedTasks: 0,
      progress: 0,
    });
  } catch (err: any) {
    console.error('createList error:', err);
    return res.status(500).json({ message: 'Failed to create task list: ' + err.message });
  }
}

export async function getListById(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const list = await db.taskLists.findById(id);
    if (!list) {
      return res.status(404).json({ message: 'Task list not found.' });
    }

    // Strict access control: verify user owns this list
    if (list.userId !== userId) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to view this list.' });
    }

    const tasks = await db.tasks.findByListId(list._id);
    const total = tasks.length;
    const completedTasksList = tasks.filter(t => t.completed);
    const completed = completedTasksList.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    let lastCompletedTask: { _id: string; title: string; completedAt?: string | null } | null = null;
    if (completedTasksList.length > 0) {
      const sorted = [...completedTasksList].sort((a, b) => {
        const timeA = new Date(a.completedAt || a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.completedAt || b.updatedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
      lastCompletedTask = {
        _id: sorted[0]._id,
        title: sorted[0].title,
        completedAt: sorted[0].completedAt || sorted[0].updatedAt || sorted[0].createdAt,
      };
    }

    return res.json({
      ...list,
      totalTasks: total,
      completedTasks: completed,
      progress,
      lastCompletedTask,
      tasks,
    });
  } catch (err: any) {
    console.error('getListById error:', err);
    return res.status(500).json({ message: 'Failed to retrieve task list: ' + err.message });
  }
}

export async function updateList(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { title, description, color } = req.body;

    const existing = await db.taskLists.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Task list not found.' });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ message: 'Access denied: You cannot modify another user\'s list.' });
    }

    const updates: Partial<{ title: string; description: string; color: string }> = {};
    if (title && title.trim()) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (color) updates.color = color;

    const updated = await db.taskLists.update(id, userId, updates);

    return res.json(updated);
  } catch (err: any) {
    console.error('updateList error:', err);
    return res.status(500).json({ message: 'Failed to update task list: ' + err.message });
  }
}

export async function deleteList(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await db.taskLists.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Task list not found.' });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ message: 'Access denied: You cannot delete another user\'s list.' });
    }

    const success = await db.taskLists.delete(id, userId);
    if (!success) {
      return res.status(500).json({ message: 'Failed to delete task list.' });
    }

    return res.json({ message: 'Task list and its tasks were permanently deleted.' });
  } catch (err: any) {
    console.error('deleteList error:', err);
    return res.status(500).json({ message: 'Failed to delete task list: ' + err.message });
  }
}

export async function reorderLists(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { listIds } = req.body;

    if (!Array.isArray(listIds)) {
      return res.status(400).json({ message: 'listIds must be an array of list IDs.' });
    }

    await db.taskLists.reorder(userId, listIds);
    return res.json({ message: 'Task lists reordered successfully.' });
  } catch (err: any) {
    console.error('reorderLists error:', err);
    return res.status(500).json({ message: 'Failed to reorder task lists: ' + err.message });
  }
}

