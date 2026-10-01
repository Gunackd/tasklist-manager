import { Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

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
    const { title } = req.body;

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

    const task = await db.tasks.create({
      taskListId: listId,
      userId,
      title: title.trim(),
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
    const { tasks } = req.body; // Array of strings or raw text

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

    // Clean numbering, bullets, and empty items
    const cleanedTitles = tasks
      .map((t: any) => (typeof t === 'string' ? t.trim() : ''))
      .map((t: string) => {
        return t
          .replace(/^\[[ xX]\]\s*/, '')
          .replace(/^[✓✔○●\-\*\+•›»\>]\s*/, '')
          .replace(/^\(?\d+[\.\)\:\-]\s*/, '')
          .replace(/^[✓✔○●\-\*\+•›»\>]\s*/, '')
          .trim();
      })
      .filter((t: string) => t.length > 0);

    if (cleanedTitles.length === 0) {
      return res.status(400).json({ message: 'No valid task titles found in submission.' });
    }

    const createdTasks = await db.tasks.createMany(listId, userId, cleanedTitles);

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
    const { title, completed, order } = req.body;

    const existing = await db.tasks.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ message: 'Access denied: Cannot modify another user\'s task.' });
    }

    const updates: Partial<{ title: string; completed: boolean; order: number }> = {};
    if (title !== undefined && title.trim()) updates.title = title.trim();
    if (completed !== undefined) updates.completed = Boolean(completed);
    if (order !== undefined) updates.order = Number(order);

    const updated = await db.tasks.update(id, userId, updates);

    return res.json(updated);
  } catch (err: any) {
    console.error('updateTask error:', err);
    return res.status(500).json({ message: 'Failed to update task: ' + err.message });
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
