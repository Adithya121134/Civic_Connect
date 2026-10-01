import crypto from 'crypto';
import { db } from '../db';

export interface NotificationPayload {
  recipient_user_id: string;
  recipient_role: 'RESIDENT' | 'DEPARTMENT_USER' | 'FIELD_WORKER' | 'ADMIN';
  department_id?: string | null;
  notification_type:
    | 'REPORT_SUBMITTED'
    | 'ASSIGNED'
    | 'WORK_STARTED'
    | 'WORK_PROGRESS'
    | 'WORK_COMPLETED'
    | 'VERIFICATION_REQUEST'
    | 'VERIFIED'
    | 'REOPENED'
    | 'ESCALATED'
    | 'SLA_WARNING'
    | 'SLA_BREACH'
    | 'MATERIAL_VARIANCE'
    | 'SYSTEM_ALERT';
  title: string;
  message: string;
  incident_id?: string | null;
  related_department_id?: string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: Record<string, any>;
}

export interface AuthenticatedActor {
  id: string;
  role: string;
  department_id?: string | null;
}

export const notificationService = {
  /**
   * Insert a new real notification into the database
   */
  createNotification(payload: NotificationPayload) {
    const id = 'notif-' + crypto.randomUUID();
    const now = new Date().toISOString();
    const recipientUserId = payload.recipient_user_id;
    const recipientRole = payload.recipient_role;
    const deptId = payload.department_id || payload.related_department_id || null;
    const relatedDeptId = payload.related_department_id || payload.department_id || null;
    const incidentId = payload.incident_id || null;
    const priority = payload.priority || 'MEDIUM';
    const metadataStr = JSON.stringify(payload.metadata || {});

    try {
      db.prepare(`
        INSERT INTO notifications (
          id,
          recipient_user_id,
          recipient_id,
          recipient_role,
          department_id,
          related_department_id,
          notification_type,
          title,
          message,
          incident_id,
          related_incident_id,
          is_read,
          priority,
          metadata,
          created_at,
          read_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL)
      `).run(
        id,
        recipientUserId,
        recipientUserId,
        recipientRole,
        deptId,
        relatedDeptId,
        payload.notification_type,
        payload.title,
        payload.message,
        incidentId,
        incidentId,
        priority,
        metadataStr,
        now
      );

      return { id, success: true };
    } catch (err: any) {
      console.error('[NotificationService] Error creating notification:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Retrieve notifications strictly filtered for the authenticated actor.
   * Citizen A NEVER sees Citizen B's or Department notifications.
   * Department A NEVER sees Department B's notifications.
   */
  getNotificationsForUser(actor: AuthenticatedActor, options: { unreadOnly?: boolean; limit?: number } = {}) {
    const limit = options.limit || 50;

    let whereClause = '';
    const params: any[] = [];

    if (actor.role === 'RESIDENT') {
      // Citizen data isolation: ONLY notifications specifically addressed to this citizen
      whereClause = `(recipient_user_id = ? OR recipient_id = ?) AND recipient_role = 'RESIDENT'`;
      params.push(actor.id, actor.id);
    } else if (actor.role === 'ADMIN') {
      // Municipal administrator: Admin channel notifications OR addressed specifically to this admin user
      whereClause = `(recipient_user_id = ? OR recipient_id = ? OR recipient_role = 'ADMIN' OR recipient_id = 'admin-channel')`;
      params.push(actor.id, actor.id);
    } else {
      // Department User / Field Worker: Department isolation
      // Either addressed to user directly OR addressed to their specific department channel
      const deptId = actor.department_id || '';
      whereClause = `(
        (recipient_user_id = ? OR recipient_id = ?)
        OR (
          (department_id = ? OR related_department_id = ? OR recipient_id = ?)
          AND recipient_role IN ('DEPARTMENT_USER', 'FIELD_WORKER', 'DEPARTMENT', 'OFFICER')
        )
      )`;
      params.push(actor.id, actor.id, deptId, deptId, `dept-channel-${deptId}`);
    }

    if (options.unreadOnly) {
      whereClause += ` AND is_read = 0`;
    }

    const query = `
      SELECT 
        id,
        COALESCE(recipient_user_id, recipient_id) as recipient_user_id,
        recipient_role,
        COALESCE(related_department_id, department_id) as department_id,
        COALESCE(notification_type, 'GENERAL') as notification_type,
        title,
        message,
        COALESCE(related_incident_id, incident_id) as incident_id,
        is_read,
        COALESCE(priority, 'MEDIUM') as priority,
        COALESCE(metadata, '{}') as metadata,
        created_at,
        read_at
      FROM notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const notifications = db.prepare(query).all(...params, limit) as any[];

    // Parse metadata JSON safely
    const formatted = notifications.map((n) => {
      let parsedMeta = {};
      try {
        parsedMeta = n.metadata ? JSON.parse(n.metadata) : {};
      } catch {
        parsedMeta = {};
      }
      return {
        id: n.id,
        recipientUserId: n.recipient_user_id,
        recipientRole: n.recipient_role,
        departmentId: n.department_id,
        notificationType: n.notification_type,
        title: n.title,
        message: n.message,
        incidentId: n.incident_id,
        isRead: Boolean(n.is_read),
        priority: n.priority,
        metadata: parsedMeta,
        createdAt: n.created_at,
        readAt: n.read_at
      };
    });

    // Unread count
    const unreadCountRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM notifications
      WHERE (${whereClause}) AND is_read = 0
    `).get(...params) as { count: number };

    return {
      notifications: formatted,
      unreadCount: unreadCountRow?.count || 0,
      totalCount: formatted.length
    };
  },

  /**
   * Mark a single notification as read if authorized
   */
  markAsRead(notificationId: string, actor: AuthenticatedActor): boolean {
    const existing = db.prepare(`
      SELECT * FROM notifications WHERE id = ?
    `).get(notificationId) as any;

    if (!existing) {
      return false;
    }

    // Verify actor is authorized to read this notification
    const isDirectRecipient = existing.recipient_user_id === actor.id || existing.recipient_id === actor.id;
    const isAuthorizedDept =
      (actor.role === 'DEPARTMENT_USER' || actor.role === 'FIELD_WORKER') &&
      (existing.department_id === actor.department_id || existing.related_department_id === actor.department_id);
    const isAdmin = actor.role === 'ADMIN';

    if (!isDirectRecipient && !isAuthorizedDept && !isAdmin) {
      return false;
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = ?
      WHERE id = ?
    `).run(now, notificationId);

    return true;
  },

  /**
   * Mark all unread notifications as read for this authenticated user
   */
  markAllAsRead(actor: AuthenticatedActor): number {
    const now = new Date().toISOString();

    if (actor.role === 'RESIDENT') {
      const result = db.prepare(`
        UPDATE notifications
        SET is_read = 1, read_at = ?
        WHERE (recipient_user_id = ? OR recipient_id = ?) AND recipient_role = 'RESIDENT' AND is_read = 0
      `).run(now, actor.id, actor.id);
      return Number(result.changes);
    } else if (actor.role === 'ADMIN') {
      const result = db.prepare(`
        UPDATE notifications
        SET is_read = 1, read_at = ?
        WHERE (recipient_user_id = ? OR recipient_id = ? OR recipient_role = 'ADMIN' OR recipient_id = 'admin-channel') AND is_read = 0
      `).run(now, actor.id, actor.id);
      return Number(result.changes);
    } else {
      const deptId = actor.department_id || '';
      const result = db.prepare(`
        UPDATE notifications
        SET is_read = 1, read_at = ?
        WHERE (
          (recipient_user_id = ? OR recipient_id = ?)
          OR (
            (department_id = ? OR related_department_id = ? OR recipient_id = ?)
            AND recipient_role IN ('DEPARTMENT_USER', 'FIELD_WORKER', 'DEPARTMENT', 'OFFICER')
          )
        ) AND is_read = 0
      `).run(now, actor.id, actor.id, deptId, deptId, `dept-channel-${deptId}`);
      return Number(result.changes);
    }
  },

  /**
   * Count unread notifications
   */
  getUnreadCount(actor: AuthenticatedActor): number {
    const result = this.getNotificationsForUser(actor, { unreadOnly: true, limit: 1 });
    return result.unreadCount;
  }
};
