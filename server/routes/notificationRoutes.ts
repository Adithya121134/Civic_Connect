import { Router, Request, Response } from 'express';
import { authenticateToken } from '../auth';
import { notificationService } from '../services/notificationService';

export const notificationRouter = Router();

// Require authentication for all notification operations
notificationRouter.use(authenticateToken);

/**
 * GET /api/v1/notifications & GET /api/notifications
 * Strict user-isolated notifications query based ONLY on token identity.
 * Query parameter user_id is strictly ignored/forbidden to prevent unauthorized access.
 */
notificationRouter.get('/', (req: Request, res: Response) => {
  const actor = {
    id: req.user!.id,
    role: req.user!.role,
    department_id: req.user!.departmentId || null
  };

  const unreadOnly = req.query.unread === 'true';
  const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string, 10) || 50, 100) : 50;

  const result = notificationService.getNotificationsForUser(actor, { unreadOnly, limit });

  res.json({
    success: true,
    count: result.totalCount,
    unreadCount: result.unreadCount,
    notifications: result.notifications
  });
});

/**
 * GET /api/v1/notifications/unread-count
 */
notificationRouter.get('/unread-count', (req: Request, res: Response) => {
  const actor = {
    id: req.user!.id,
    role: req.user!.role,
    department_id: req.user!.departmentId || null
  };

  const unreadCount = notificationService.getUnreadCount(actor);
  res.json({ success: true, unreadCount });
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a single notification as read (with authorization check)
 */
notificationRouter.patch('/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const actor = {
    id: req.user!.id,
    role: req.user!.role,
    department_id: req.user!.departmentId || null
  };

  const success = notificationService.markAsRead(id, actor);

  if (!success) {
    res.status(404).json({
      error: 'NOT_FOUND_OR_FORBIDDEN',
      message: 'Notification not found or access denied.'
    });
    return;
  }

  res.json({ success: true, notificationId: id, isRead: true });
});

// Also support POST for clients that prefer POST
notificationRouter.post('/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const actor = {
    id: req.user!.id,
    role: req.user!.role,
    department_id: req.user!.departmentId || null
  };

  const success = notificationService.markAsRead(id, actor);

  if (!success) {
    res.status(404).json({
      error: 'NOT_FOUND_OR_FORBIDDEN',
      message: 'Notification not found or access denied.'
    });
    return;
  }

  res.json({ success: true, notificationId: id, isRead: true });
});

/**
 * POST /api/v1/notifications/mark-all-read
 * Mark all authorized unread notifications as read for current actor
 */
notificationRouter.post('/mark-all-read', (req: Request, res: Response) => {
  const actor = {
    id: req.user!.id,
    role: req.user!.role,
    department_id: req.user!.departmentId || null
  };

  const updatedCount = notificationService.markAllAsRead(actor);

  res.json({
    success: true,
    markedReadCount: updatedCount,
    unreadCount: 0
  });
});
