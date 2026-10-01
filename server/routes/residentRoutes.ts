import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db';
import { authenticateToken, requireRole } from '../auth';
import { analyzeCivicImage } from '../aiService.js';
import { notificationService } from '../services/notificationService';

export const residentRouter = Router();

// Enforce Resident authentication for all resident routes
residentRouter.use(authenticateToken);
residentRouter.use(requireRole(['RESIDENT', 'ADMIN']));

// 0. AI Photo Analysis for Resident Reporting
residentRouter.post('/analyze-image', async (req: Request, res: Response) => {
  try {
    const { image, mimeType, location } = req.body;
    if (!image) {
      res.status(400).json({ error: 'MISSING_IMAGE', message: 'Image base64 data is required for analysis.' });
      return;
    }
    const analysis = await analyzeCivicImage(image, mimeType, location);
    res.json({ success: true, analysis });
  } catch (err: any) {
    console.error('[residentRoutes] Image analysis error:', err);
    res.status(500).json({ error: 'ANALYSIS_ERROR', message: err.message });
  }
});

// 0.1 Check Nearby Duplicates
residentRouter.post('/check-duplicate', (req: Request, res: Response) => {
  try {
    const { latitude, longitude, category, title } = req.body;
    if (!latitude || !longitude) {
      res.json({ hasDuplicate: false, candidates: [] });
      return;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    // Fetch active non-resolved incidents
    const activeIncidents = db.prepare(`
      SELECT i.id, i.tracking_number, i.title, i.category, i.priority, i.severity, i.address, i.latitude, i.longitude, i.status, i.created_at,
             d.name as department_name
      FROM incidents i
      LEFT JOIN departments d ON i.department_id = d.id
      WHERE i.status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')
      ORDER BY i.created_at DESC
      LIMIT 100
    `).all() as any[];

    // Calculate Haversine distance in meters
    function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
      const R = 6371e3;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }

    const candidates = activeIncidents
      .map(inc => {
        const distance = haversineMeters(lat, lng, Number(inc.latitude), Number(inc.longitude));
        const categoryMatch = inc.category === category;
        return {
          id: inc.id,
          trackingNumber: inc.tracking_number,
          title: inc.title,
          category: inc.category,
          status: inc.status,
          address: inc.address,
          departmentName: inc.department_name,
          distanceMeters: distance,
          isCategoryMatch: categoryMatch,
          createdAt: inc.created_at
        };
      })
      .filter(c => c.distanceMeters <= 350) // Within 350 meters
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    res.json({
      hasDuplicate: candidates.length > 0,
      candidates: candidates.slice(0, 3)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'DUPLICATE_CHECK_ERROR', message: err.message });
  }
});

// 1. Get Resident's Own Incidents
residentRouter.get('/incidents', (req: Request, res: Response) => {
  const userId = req.user!.id;

  const incidents = db.prepare(`
    SELECT i.id, i.tracking_number, i.title, i.description, i.status, i.category,
           i.priority, i.severity, i.address, i.ward_code, i.latitude, i.longitude,
           i.observed_problem, i.object_type, i.context, i.visible_risk, i.potential_impact,
           i.routing_confidence, i.requires_admin_review, i.ai_observation_json,
           i.simple_explanation, i.workers_needed, i.equipment_needed, i.materials_needed,
           i.citizen_image_url, i.completion_image_url, i.department_update_note,
           i.created_at, i.updated_at, i.resolution_notes, i.sla_deadline,
           d.name as department_name, d.code as department_code
    FROM incidents i
    LEFT JOIN departments d ON i.department_id = d.id
    WHERE i.citizen_author_id = ?
    ORDER BY i.created_at DESC
  `).all(userId);

  res.json({ incidents });
});

// 2. Create Civic Incident by Resident (Problem-Agnostic Intelligence)
residentRouter.post('/incidents', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    title,
    description,
    category,
    address,
    latitude,
    longitude,
    wardCode,
    severity,
    photoDataUrl,
    aiClassification,
    observedProblem,
    objectType,
    context,
    visibleRisk,
    potentialSafetyImpact,
    potentialPublicImpact,
    simpleExplanation,
    workersNeeded,
    equipmentNeeded,
    materialsNeeded,
    suggestedDepartmentId,
    routingConfidence,
    requiresAdminReview,
    userCorrections
  } = req.body;

  if (!title || !address) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Title and address are required.' });
    return;
  }

  // Deterministic Validation of Recommended Department against Authorized DB Configurations
  let targetDepartmentId = suggestedDepartmentId || 'dept-roads-infrastructure';
  let isAdminReviewRequired = Boolean(requiresAdminReview);

  // Validate that the department exists in the configured departments table
  let deptRecord = db.prepare('SELECT id, name FROM departments WHERE id = ?').get(targetDepartmentId) as any;
  if (!deptRecord) {
    // If not found in configured system, fallback to Roads & Infrastructure with admin review flag
    targetDepartmentId = 'dept-roads-infrastructure';
    deptRecord = db.prepare('SELECT id, name FROM departments WHERE id = ?').get(targetDepartmentId) as any;
    isAdminReviewRequired = true;
  }
  const targetDeptName = deptRecord?.name || 'Roads & Infrastructure';

  const confidenceScore = typeof routingConfidence === 'number' ? routingConfidence : (aiClassification?.confidence || 0.92);
  if (confidenceScore < 0.70) {
    isAdminReviewRequired = true;
  }

  const incidentId = 'inc-' + crypto.randomUUID().slice(0, 8);
  const trackingNumber = 'INC-2026-' + Math.floor(100000 + Math.random() * 900000);
  const now = new Date().toISOString();
  const slaDeadline = new Date(Date.now() + 48 * 3600000).toISOString();

  // Priority mapping from severity
  const normSeverity = (severity || 'MEDIUM').toUpperCase();
  const priority = normSeverity === 'CRITICAL' ? 'P1_CRITICAL' : normSeverity === 'HIGH' ? 'P2_HIGH' : 'P3_STANDARD';

  const finalExplanation = simpleExplanation || aiClassification?.simpleExplanation || potentialSafetyImpact || observedProblem || 'The reported issue creates a risk for the public.';
  const finalWorkers = typeof workersNeeded === 'number' ? workersNeeded : (aiClassification?.workersNeeded || 2);
  const finalEquipment = Array.isArray(equipmentNeeded) ? JSON.stringify(equipmentNeeded) : (Array.isArray(aiClassification?.equipmentNeeded) ? JSON.stringify(aiClassification.equipmentNeeded) : JSON.stringify(['Inspection & repair tools', 'Safety barriers']));
  const finalMaterials = Array.isArray(materialsNeeded) ? JSON.stringify(materialsNeeded) : (Array.isArray(aiClassification?.materialsNeeded) ? JSON.stringify(aiClassification.materialsNeeded) : JSON.stringify([]));

  const damageEstimationJson = aiClassification?.damageEstimation ? JSON.stringify(aiClassification.damageEstimation) : null;
  const totalEstCost = typeof aiClassification?.estimatedTotalMaterialCost === 'number' ? aiClassification.estimatedTotalMaterialCost : 0;

  const observationSummary = {
    observedProblem: observedProblem || title,
    objectType: objectType || 'Public Infrastructure',
    context: context || 'Municipal Area',
    visibleRisk: visibleRisk || potentialSafetyImpact || 'Public hazard',
    potentialSafetyImpact: potentialSafetyImpact || 'Pedestrian/resident safety concern',
    potentialPublicImpact: potentialPublicImpact || 'Localized public corridor impact',
    simpleExplanation: finalExplanation,
    workersNeeded: finalWorkers,
    equipmentNeeded: finalEquipment,
    materialsNeeded: finalMaterials,
    damageEstimation: aiClassification?.damageEstimation || null,
    estimatedTotalMaterialCost: totalEstCost,
    aiClassification,
    userCorrections
  };

  // Execute database transaction
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`
      INSERT INTO incidents (
        id, tracking_number, title, description, status, category, priority, severity,
        confidence_score, latitude, longitude, address, ward_code, citizen_author_id,
        department_id, assigned_team_id, assigned_worker_id, version, resolution_notes,
        resolution_submitted_at, verified_at, reopened_reason, sla_deadline, is_sla_breached,
        observed_problem, object_type, context, visible_risk, potential_impact,
        routing_confidence, requires_admin_review, ai_observation_json,
        simple_explanation, workers_needed, equipment_needed, materials_needed, citizen_image_url,
        damage_estimation_json, estimated_total_material_cost,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, 'REPORTED', ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, NULL, NULL, 1, NULL,
        NULL, NULL, NULL, ?, 0,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?
      )
    `).run(
      incidentId, trackingNumber, title, description || title, category || 'CIVIC_HAZARD', priority, normSeverity,
      confidenceScore, latitude || 11.0168, longitude || 76.9558, address, wardCode || 'WARD-04', userId,
      targetDepartmentId, slaDeadline,
      observedProblem || title,
      objectType || 'Public Asset',
      context || 'Civic Infrastructure',
      visibleRisk || 'General public hazard',
      potentialPublicImpact || 'Public service impact',
      confidenceScore,
      isAdminReviewRequired ? 1 : 0,
      JSON.stringify(observationSummary),
      finalExplanation,
      finalWorkers,
      finalEquipment,
      finalMaterials,
      photoDataUrl || null,
      damageEstimationJson,
      totalEstCost,
      now, now
    );

    // If material requirements were provided, seed baseline material usage records
    if (Array.isArray(aiClassification?.materialRequirements) && aiClassification.materialRequirements.length > 0) {
      const insertMat = db.prepare(`
        INSERT INTO incident_actual_material_usage (
          id, incident_id, material_name, estimated_quantity, actual_quantity,
          unit, reference_unit_price, estimated_cost, actual_cost,
          variance_quantity, variance_cost, variance_percentage,
          variance_flag, variance_reason, price_source, price_timestamp,
          recorded_by, recorded_at, created_at
        ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?, 0, 0, NULL, ?, ?, 'AI Vision Intake Engine', ?, ?)
      `);

      for (const m of aiClassification.materialRequirements) {
        const uPrice = m.unitPrice || 0;
        const eQty = m.quantity || 1;
        const eCost = Math.round(eQty * uPrice * 100) / 100;
        insertMat.run(
          `usage-${crypto.randomUUID().slice(0, 8)}`,
          incidentId,
          m.name,
          eQty,
          m.unit || 'unit',
          uPrice,
          eCost,
          -eQty,
          -eCost,
          m.priceSource || 'Municipal Standard Catalog',
          m.priceTimestamp || now,
          now,
          now
        );
      }
    }


    // Initial status history
    db.prepare(`
      INSERT INTO incident_status_history (id, incident_id, from_status, to_status, actor_id, actor_role, reason, created_at)
      VALUES (?, ?, 'NONE', 'REPORTED', ?, 'RESIDENT', ?, ?)
    `).run(
      'hist-' + crypto.randomUUID().slice(0, 8),
      incidentId,
      userId,
      'Report Submitted by citizen via CivicConnect mobile portal.',
      now
    );

    // Evidence persistence if photograph is attached
    if (photoDataUrl && typeof photoDataUrl === 'string' && photoDataUrl.length > 50) {
      const evidenceId = 'ev-' + crypto.randomUUID().slice(0, 8);
      const sha256 = crypto.createHash('sha256').update(photoDataUrl).digest('hex');
      db.prepare(`
        INSERT INTO evidence (
          id, incident_id, uploader_id, file_name, file_url, mime_type, file_size, sha256_hash, is_verified, created_at
        ) VALUES (?, ?, ?, ?, ?, 'image/jpeg', ?, ?, 1, ?)
      `).run(
        evidenceId,
        incidentId,
        userId,
        `citizen_evidence_${Date.now()}.jpg`,
        photoDataUrl.length > 2000000 ? photoDataUrl.slice(0, 2000000) : photoDataUrl,
        photoDataUrl.length,
        sha256,
        now
      );
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, incident_id, actor_id, actor_role, department_id, action, entity_type, entity_id, details, correlation_id, created_at)
      VALUES (?, ?, ?, 'RESIDENT', ?, 'INCIDENT_CREATED', 'INCIDENT', ?, ?, ?, ?)
    `).run(
      'aud-' + crypto.randomUUID().slice(0, 8),
      incidentId,
      userId,
      targetDepartmentId,
      incidentId,
      JSON.stringify({
        trackingNumber,
        title,
        observedProblem: observedProblem || title,
        departmentId: targetDepartmentId,
        severity: normSeverity,
        routingConfidence: confidenceScore,
        requiresAdminReview: isAdminReviewRequired
      }),
      'corr-' + Date.now(),
      now
    );

    // Notifications creation
    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, recipient_id, recipient_role, department_id, title, message, incident_id, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    // 1. Citizen notification: "Your report has been submitted."
    insertNotif.run(
      'notif-' + crypto.randomUUID().slice(0, 8),
      userId,
      'RESIDENT',
      targetDepartmentId,
      'Report Submitted',
      `Your report ${trackingNumber} has been submitted successfully.`,
      incidentId,
      now
    );

    // 2. Citizen notification: "Your report has been assigned to [Department]."
    insertNotif.run(
      'notif-' + crypto.randomUUID().slice(0, 8),
      userId,
      'RESIDENT',
      targetDepartmentId,
      'Department Assigned',
      `Your report ${trackingNumber} has been assigned to ${targetDeptName}.`,
      incidentId,
      now
    );

    // 3. Department notification for department staff
    insertNotif.run(
      'notif-' + crypto.randomUUID().slice(0, 8),
      `dept-channel-${targetDepartmentId}`,
      'DEPARTMENT_USER',
      targetDepartmentId,
      'New Incident Assigned',
      `New civic incident ${trackingNumber} assigned to ${targetDeptName}: ${title}`,
      incidentId,
      now
    );

    // 4. City-Wide Admin operational notification
    insertNotif.run(
      'notif-' + crypto.randomUUID().slice(0, 8),
      'admin-channel',
      'ADMIN',
      targetDepartmentId,
      'New Citizen Report',
      `Citizen report ${trackingNumber} routed to ${targetDeptName} (${normSeverity} severity)`,
      incidentId,
      now
    );

    db.exec('COMMIT;');

    const createdIncident = db.prepare(`
      SELECT i.*, d.name as department_name, d.code as department_code
      FROM incidents i
      LEFT JOIN departments d ON i.department_id = d.id
      WHERE i.id = ?
    `).get(incidentId);

    res.status(201).json({
      success: true,
      message: 'Civic issue report created successfully.',
      incident: createdIncident
    });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    console.error('[residentRoutes] Create incident error:', err);
    res.status(500).json({ error: 'CREATE_INCIDENT_FAILED', message: err.message });
  }
});

// 3. View Incident Details (Enforces Ownership or Public Sanitization)
residentRouter.get('/incidents/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const incident = db.prepare(`
    SELECT i.*, d.name as department_name, d.code as department_code
    FROM incidents i
    LEFT JOIN departments d ON i.department_id = d.id
    WHERE i.id = ?
  `).get(id) as any;

  if (!incident) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Incident not found' });
    return;
  }

  // If incident belongs to another resident, deny access strictly (403 Forbidden)
  const isOwner = incident.citizen_author_id === userId || req.user!.role === 'ADMIN';

  if (!isOwner) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access Denied: You do not have permission to access another citizen\'s report details.'
    });
    return;
  }

  // Full owner tracking view
  const history = db.prepare(`
    SELECT from_status, to_status, actor_role, reason, created_at
    FROM incident_status_history
    WHERE incident_id = ?
    ORDER BY created_at ASC
  `).all(id);

  res.json({
    incident: {
      ...incident,
      isOwner: true,
      history
    }
  });
});

// Alias for /reports (Section 11 requirement: GET /resident/reports)
residentRouter.get('/reports', (req: Request, res: Response) => {
  const userId = req.user!.id;

  const incidents = db.prepare(`
    SELECT i.id, i.tracking_number, i.title, i.description, i.status, i.category,
           i.priority, i.severity, i.address, i.ward_code, i.latitude, i.longitude,
           i.observed_problem, i.object_type, i.context, i.visible_risk, i.potential_impact,
           i.routing_confidence, i.requires_admin_review, i.ai_observation_json,
           i.simple_explanation, i.workers_needed, i.equipment_needed, i.materials_needed,
           i.citizen_image_url, i.completion_image_url, i.department_update_note,
           i.created_at, i.updated_at, i.resolution_notes, i.sla_deadline,
           d.name as department_name, d.code as department_code
    FROM incidents i
    LEFT JOIN departments d ON i.department_id = d.id
    WHERE i.citizen_author_id = ?
    ORDER BY i.created_at DESC
  `).all(userId);

  res.json({ incidents, reports: incidents });
});

residentRouter.get('/reports/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const incident = db.prepare(`
    SELECT i.*, d.name as department_name, d.code as department_code
    FROM incidents i
    LEFT JOIN departments d ON i.department_id = d.id
    WHERE i.id = ?
  `).get(id) as any;

  if (!incident) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Report not found' });
    return;
  }

  if (incident.citizen_author_id !== userId && req.user!.role !== 'ADMIN') {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access Denied: You do not have permission to access another citizen\'s report details.'
    });
    return;
  }

  const history = db.prepare(`
    SELECT from_status, to_status, actor_role, reason, created_at
    FROM incident_status_history
    WHERE incident_id = ?
    ORDER BY created_at ASC
  `).all(id);

  res.json({
    incident: {
      ...incident,
      isOwner: true,
      history
    },
    report: incident
  });
});

// Resident Profile Endpoint (Section 21 requirement)
residentRouter.get('/profile', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const user = db.prepare(`
    SELECT id, email, first_name, last_name, full_name, role, phone_number,
             email_verified, phone_verified, status, created_at
    FROM users WHERE id = ?
  `).get(userId) as any;

  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Citizen profile not found' });
    return;
  }

  res.json({
    success: true,
    profile: {
      userId: user.id,
      fullName: user.full_name || `${user.first_name} ${user.last_name}`.trim(),
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone_number,
      role: user.role,
      emailVerified: Boolean(user.email_verified),
      phoneVerified: Boolean(user.phone_verified),
      status: user.status || 'ACTIVE',
      createdAt: user.created_at
    }
  });
});

// 4. Confirm Resolution by Resident
residentRouter.post('/incidents/:id/confirm-resolution', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { feedback } = req.body;

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
  if (!incident) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Incident not found' });
    return;
  }

  if (incident.citizen_author_id !== userId && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'You can only confirm resolution on incidents you authored.' });
    return;
  }

  if (incident.status !== 'RESOLUTION_SUBMITTED' && incident.status !== 'VERIFYING' && incident.status !== 'VERIFIED') {
    res.status(400).json({ error: 'INVALID_STATUS', message: `Cannot confirm resolution on an incident in state '${incident.status}'. Must be pending verification.` });
    return;
  }

  const now = new Date().toISOString();
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`
      UPDATE incidents
      SET status = 'CLOSED', version = version + 1, closed_at = ?, updated_at = ?
      WHERE id = ? AND version = ?
    `).run(now, now, id, incident.version);

    db.prepare(`
      INSERT INTO incident_status_history (id, incident_id, from_status, to_status, actor_id, actor_role, reason, created_at)
      VALUES (?, ?, ?, 'CLOSED', ?, 'RESIDENT', ?, ?)
    `).run('hist-' + crypto.randomUUID().slice(0, 8), id, incident.status, userId, feedback || 'Citizen confirmed physical resolution', now);

    db.exec('COMMIT;');
    res.json({ success: true, message: 'Resolution confirmed. Incident closed.' });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'DATABASE_ERROR', message: err.message });
  }
});

// 5. Report Unresolved / Reopen Issue
residentRouter.post('/incidents/:id/reopen', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    res.status(400).json({ error: 'MISSING_REASON', message: 'A specific explanation is required to reopen an issue.' });
    return;
  }

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
  if (!incident) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Incident not found' });
    return;
  }

  if (incident.citizen_author_id !== userId && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'You can only reopen incidents you authored.' });
    return;
  }

  if (incident.status !== 'CLOSED' && incident.status !== 'VERIFIED' && incident.status !== 'RESOLUTION_SUBMITTED') {
    res.status(400).json({ error: 'INVALID_STATUS', message: `Cannot reopen an incident currently in active state '${incident.status}'.` });
    return;
  }

  const now = new Date().toISOString();
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`
      UPDATE incidents
      SET status = 'REOPENED', reopened_reason = ?, version = version + 1, updated_at = ?
      WHERE id = ? AND version = ?
    `).run(reason, now, id, incident.version);

    db.prepare(`
      INSERT INTO incident_status_history (id, incident_id, from_status, to_status, actor_id, actor_role, reason, created_at)
      VALUES (?, ?, ?, 'REOPENED', ?, 'RESIDENT', ?, ?)
    `).run('hist-' + crypto.randomUUID().slice(0, 8), id, incident.status, userId, reason, now);

    db.exec('COMMIT;');
    res.json({ success: true, message: 'Incident reopened. Department notified for re-inspection.' });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'DATABASE_ERROR', message: err.message });
  }
});

// 6. Public Permitted Civic Map View
residentRouter.get('/map', (req: Request, res: Response) => {
  // Public map returns civic incident coordinates with citizen identity completely scrubbed
  const incidents = db.prepare(`
    SELECT i.id, i.tracking_number, i.title, i.status, i.category, i.priority,
           i.latitude, i.longitude, i.address, i.ward_code, i.created_at,
           d.name as department_name, d.code as department_code
    FROM incidents i
    LEFT JOIN departments d ON i.department_id = d.id
    WHERE i.status NOT IN ('REJECTED', 'DUPLICATE')
    LIMIT 100
  `).all();

  res.json({ incidents });
});

// 7. Resident Notifications
residentRouter.get('/notifications', (req: Request, res: Response) => {
  const actor = {
    id: req.user!.id,
    role: req.user!.role
  };
  const result = notificationService.getNotificationsForUser(actor, { limit: 50 });
  res.json({ success: true, count: result.totalCount, unreadCount: result.unreadCount, notifications: result.notifications });
});
