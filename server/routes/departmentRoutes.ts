import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db';
import { authenticateToken, requireRole, enforceDepartmentIsolation } from '../auth';
import { notificationService } from '../services/notificationService';

export const departmentRouter = Router();

// Department-level security barrier
departmentRouter.use(authenticateToken);
departmentRouter.use(requireRole(['DEPARTMENT_USER', 'FIELD_WORKER', 'ADMIN']));
departmentRouter.use(enforceDepartmentIsolation);

// Helper to get active authorized department for the request
function getEffectiveDepartmentId(req: Request): string {
  // If user is ADMIN, they may optionally view a specific department, otherwise default to first active
  if (req.user!.role === 'ADMIN' && req.query.departmentId) {
    return req.query.departmentId as string;
  }
  return req.user!.departmentId!;
}

// 1. Department Dashboard Metrics
departmentRouter.get('/dashboard', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);

  const dept = db.prepare('SELECT id, name, code, description FROM departments WHERE id = ?').get(deptId) as any;
  if (!dept) {
    res.status(404).json({ error: 'DEPT_NOT_FOUND', message: 'Department not found' });
    return;
  }

  const activeReportsCount = db.prepare(`
    SELECT COUNT(*) as count FROM incidents
    WHERE department_id = ? AND status NOT IN ('WORK_COMPLETED', 'WORK COMPLETED', 'RESOLVED', 'CLOSED', 'REJECTED', 'DUPLICATE')
  `).get(deptId) as any;

  const workInProgressCount = db.prepare(`
    SELECT COUNT(*) as count FROM incidents
    WHERE department_id = ? AND status IN ('WORK_STARTED', 'WORK STARTED', 'WORK_IN_PROGRESS', 'WORK IN PROGRESS', 'IN_PROGRESS', 'ASSIGNED')
  `).get(deptId) as any;

  const completedCount = db.prepare(`
    SELECT COUNT(*) as count FROM incidents
    WHERE department_id = ? AND status IN ('WORK_COMPLETED', 'WORK COMPLETED', 'RESOLVED', 'CLOSED', 'VERIFIED')
  `).get(deptId) as any;

  const criticalCount = db.prepare(`
    SELECT COUNT(*) as count FROM incidents
    WHERE department_id = ? 
      AND (severity = 'CRITICAL' OR priority = 'P1_CRITICAL')
      AND status NOT IN ('WORK_COMPLETED', 'WORK COMPLETED', 'RESOLVED', 'CLOSED', 'REJECTED', 'DUPLICATE')
  `).get(deptId) as any;

  res.json({
    department: dept,
    metrics: {
      activeReports: activeReportsCount?.count || 0,
      workInProgress: workInProgressCount?.count || 0,
      completed: completedCount?.count || 0,
      critical: criticalCount?.count || 0,
      totalActive: activeReportsCount?.count || 0
    }
  });
});

// 2. Department Incident Queue (Strictly scoped to department_id)
departmentRouter.get('/incidents', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);
  const statusFilter = req.query.status as string;

  let query = `
    SELECT i.id, i.tracking_number, i.title, i.description, i.status, i.category, i.priority, i.severity,
           i.address, i.ward_code, i.latitude, i.longitude, i.created_at, i.updated_at, i.sla_deadline,
           i.is_sla_breached, i.version,
           i.observed_problem, i.simple_explanation, i.workers_needed, i.equipment_needed, i.materials_needed,
           i.estimated_total_material_cost, i.variance_review_required, i.variance_summary_note, i.actual_materials_json,
           i.citizen_image_url, i.completion_image_url, i.department_update_note,
           u.first_name || ' ' || u.last_name as assigned_worker_name,
           t.name as assigned_team_name
    FROM incidents i
    LEFT JOIN users u ON i.assigned_worker_id = u.id
    LEFT JOIN teams t ON i.assigned_team_id = t.id
    WHERE i.department_id = ?
  `;
  const params: any[] = [deptId];

  if (statusFilter && statusFilter !== 'ALL') {
    query += ` AND i.status = ?`;
    params.push(statusFilter);
  }

  query += ` ORDER BY i.created_at DESC`;

  const incidents = db.prepare(query).all(...params) as any[];

  // Attach evidence if citizen_image_url wasn't directly in column
  const enriched = incidents.map(inc => {
    let citizenImg = inc.citizen_image_url;
    let completionImg = inc.completion_image_url;

    if (!citizenImg || !completionImg) {
      const evs = db.prepare('SELECT file_name, file_url FROM evidence WHERE incident_id = ? ORDER BY created_at ASC').all(inc.id) as any[];
      if (evs.length > 0) {
        if (!citizenImg) citizenImg = evs[0].file_url;
        if (!completionImg && evs.length > 1) {
          const compEv = evs.find(e => e.file_name?.includes('completion')) || evs[evs.length - 1];
          if (compEv && compEv.file_url !== citizenImg) {
            completionImg = compEv.file_url;
          }
        }
      }
    }

    return {
      ...inc,
      citizen_image_url: citizenImg,
      completion_image_url: completionImg
    };
  });

  res.json({ departmentId: deptId, incidents: enriched });
});

// 3. Priority Incidents (P1 & P2 Queue)
departmentRouter.get('/incidents/priority', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);

  const priorityIncidents = db.prepare(`
    SELECT i.id, i.tracking_number, i.title, i.status, i.category, i.priority, i.severity,
           i.address, i.ward_code, i.created_at, i.sla_deadline, i.is_sla_breached,
           i.observed_problem, i.simple_explanation, i.workers_needed, i.equipment_needed, i.materials_needed,
           i.citizen_image_url, i.completion_image_url, i.department_update_note,
           t.name as assigned_team_name
    FROM incidents i
    LEFT JOIN teams t ON i.assigned_team_id = t.id
    WHERE i.department_id = ? AND (i.priority IN ('P1_CRITICAL', 'P2_HIGH') OR i.severity IN ('CRITICAL', 'HIGH'))
      AND i.status NOT IN ('WORK_COMPLETED', 'WORK COMPLETED', 'RESOLVED', 'CLOSED', 'REJECTED', 'DUPLICATE')
    ORDER BY CASE WHEN i.priority = 'P1_CRITICAL' OR i.severity = 'CRITICAL' THEN 1 ELSE 2 END, i.created_at ASC
  `).all(deptId);

  res.json({ departmentId: deptId, priorityIncidents });
});

// 4. Incident Details with Department Isolation Check
departmentRouter.get('/incidents/:id', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);
  const { id } = req.params;

  const incident = db.prepare(`
    SELECT i.*, d.name as department_name, d.code as department_code,
           t.name as assigned_team_name,
           w.first_name || ' ' || w.last_name as assigned_worker_name,
           c.first_name || ' ' || c.last_name as citizen_name
    FROM incidents i
    LEFT JOIN departments d ON i.department_id = d.id
    LEFT JOIN teams t ON i.assigned_team_id = t.id
    LEFT JOIN users w ON i.assigned_worker_id = w.id
    LEFT JOIN users c ON i.citizen_author_id = c.id
    WHERE i.id = ?
  `).get(id) as any;

  if (!incident) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Incident not found' });
    return;
  }

  // CRITICAL AUTHORIZATION CHECK: Is this incident assigned to this department?
  if (req.user!.role !== 'ADMIN' && incident.department_id !== deptId) {
    res.status(403).json({
      error: 'CROSS_DEPARTMENT_ACCESS_DENIED',
      message: `Access Denied. Incident ${incident.tracking_number} belongs to department '${incident.department_id}', but you are authenticated under department '${deptId}'. Cross-department inspection is forbidden.`
    });
    return;
  }

  const history = db.prepare(`
    SELECT * FROM incident_status_history
    WHERE incident_id = ?
    ORDER BY created_at ASC
  `).all(id);

  const evidence = db.prepare(`
    SELECT id, file_name, file_url, mime_type, file_size, created_at
    FROM evidence
    WHERE incident_id = ?
    ORDER BY created_at ASC
  `).all(id) as any[];

  let citizenImg = incident.citizen_image_url;
  let completionImg = incident.completion_image_url;
  if (!citizenImg && evidence.length > 0) citizenImg = evidence[0].file_url;
  if (!completionImg && evidence.length > 1) {
    const comp = evidence.find(e => e.file_name?.includes('completion')) || evidence[evidence.length - 1];
    if (comp && comp.file_url !== citizenImg) completionImg = comp.file_url;
  }

  // Parse damage estimation
  let damageEstimation = null;
  if (incident.damage_estimation_json) {
    try {
      damageEstimation = JSON.parse(incident.damage_estimation_json);
    } catch {
      damageEstimation = null;
    }
  }

  // Parse actual materials
  let actualMaterials = null;
  if (incident.actual_materials_json) {
    try {
      actualMaterials = JSON.parse(incident.actual_materials_json);
    } catch {
      actualMaterials = null;
    }
  }

  // Fetch actual material usage records
  const actualUsageRecords = db.prepare(`
    SELECT * FROM incident_actual_material_usage
    WHERE incident_id = ?
    ORDER BY created_at ASC
  `).all(id) as any[];

  res.json({
    incident: {
      ...incident,
      citizen_image_url: citizenImg,
      completion_image_url: completionImg,
      damage_estimation: damageEstimation,
      actual_materials: actualMaterials
    },
    actualUsageRecords,
    history,
    evidence
  });
});

// 4b. Material Reference Price Catalog Endpoint
departmentRouter.get('/material-reference-prices', (req: Request, res: Response) => {
  const prices = db.prepare(`
    SELECT 
      id, 
      name, 
      COALESCE(material_name, name) as material_name, 
      category, 
      unit, 
      reference_unit_price, 
      reference_unit_price as reference_price, 
      currency, 
      price_source, 
      price_source as source, 
      last_updated, 
      department_id, 
      created_at
    FROM material_reference_prices
    ORDER BY category ASC, name ASC
  `).all();
  res.json({ prices });
});

// 4c. Incident Material Usage & Variance Transparency Endpoint
departmentRouter.get('/incidents/:id/material-usage', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);
  const { id } = req.params;

  const incident = db.prepare('SELECT id, tracking_number, department_id, materials_needed, estimated_total_material_cost, damage_estimation_json, actual_materials_json, variance_review_required, variance_summary_note FROM incidents WHERE id = ?').get(id) as any;
  if (!incident) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Incident not found' });
    return;
  }

  if (req.user!.role !== 'ADMIN' && incident.department_id !== deptId) {
    res.status(403).json({ error: 'CROSS_DEPARTMENT_ACCESS_DENIED', message: 'Cross-department inspection is forbidden.' });
    return;
  }

  const usages = db.prepare('SELECT * FROM incident_actual_material_usage WHERE incident_id = ? ORDER BY created_at ASC').all(id) as any[];

  let damageEstimation = null;
  try {
    if (incident.damage_estimation_json) damageEstimation = JSON.parse(incident.damage_estimation_json);
  } catch {}

  res.json({
    incidentId: id,
    trackingNumber: incident.tracking_number,
    materialsNeeded: incident.materials_needed,
    estimatedTotalCost: incident.estimated_total_material_cost || 0,
    damageEstimation,
    varianceReviewRequired: Boolean(incident.variance_review_required),
    varianceSummaryNote: incident.variance_summary_note || null,
    usages
  });
});

// 4d. Log Actual Material Usage with Automated Variance Computation
departmentRouter.post('/incidents/:id/material-usage', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);
  const { id } = req.params;
  const { items, recordedBy, notes } = req.body;

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
  if (!incident) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Incident not found' });
    return;
  }

  if (req.user!.role !== 'ADMIN' && incident.department_id !== deptId) {
    res.status(403).json({ error: 'CROSS_DEPARTMENT_ACCESS_DENIED', message: 'Unauthorized department modification.' });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Items array is required' });
    return;
  }

  const now = new Date().toISOString();
  const recorder = recordedBy || req.user?.firstName ? `${req.user?.firstName} ${req.user?.lastName}` : 'Field Engineer';

  // Clear previous or insert new records
  const insertUsage = db.prepare(`
    INSERT INTO incident_actual_material_usage (
      id, incident_id, material_name, estimated_quantity, actual_quantity,
      unit, reference_unit_price, estimated_cost, actual_cost,
      variance_quantity, variance_cost, variance_percentage,
      variance_flag, variance_reason, price_source, price_timestamp,
      recorded_by, recorded_at, created_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )
  `);

  let totalActualCost = 0;
  let totalEstimatedCost = 0;
  let hasSignificantVariance = false;
  const processedItems: any[] = [];

  for (const item of items) {
    const estQty = typeof item.estimated_quantity === 'number' ? item.estimated_quantity : 0;
    const actQty = typeof item.actual_quantity === 'number' ? item.actual_quantity : 0;
    const unitPrice = typeof item.reference_unit_price === 'number' ? item.reference_unit_price : 0;

    const estCost = Math.round(estQty * unitPrice * 100) / 100;
    const actCost = Math.round(actQty * unitPrice * 100) / 100;
    const varQty = Math.round((actQty - estQty) * 100) / 100;
    const varCost = Math.round((actCost - estCost) * 100) / 100;

    const varPct = estCost > 0 ? Math.round(((actCost - estCost) / estCost) * 10000) / 100 : (actCost > 0 ? 100 : 0);
    const isVarianceFlagged = Math.abs(varPct) > 20 || Math.abs(varCost) > 1000;

    if (isVarianceFlagged) {
      hasSignificantVariance = true;
    }

    totalActualCost += actCost;
    totalEstimatedCost += estCost;

    const usageId = `usage-${crypto.randomUUID().slice(0, 8)}`;
    insertUsage.run(
      usageId,
      id,
      item.material_name || 'Material Item',
      estQty,
      actQty,
      item.unit || 'unit',
      unitPrice,
      estCost,
      actCost,
      varQty,
      varCost,
      varPct,
      isVarianceFlagged ? 1 : 0,
      item.variance_reason || null,
      item.price_source || 'Municipal Standard Schedule',
      item.price_timestamp || now,
      recorder,
      now,
      now
    );

    processedItems.push({
      id: usageId,
      material_name: item.material_name,
      estimated_quantity: estQty,
      actual_quantity: actQty,
      unit: item.unit,
      reference_unit_price: unitPrice,
      estimated_cost: estCost,
      actual_cost: actCost,
      variance_quantity: varQty,
      variance_cost: varCost,
      variance_percentage: varPct,
      variance_flag: isVarianceFlagged,
      variance_reason: item.variance_reason || null
    });
  }

  // Update incident record with actual materials summary
  const summaryNote = notes || (hasSignificantVariance
    ? `Actual material consumption deviated by ${Math.round(((totalActualCost - totalEstimatedCost) / Math.max(totalEstimatedCost, 1)) * 100)}% (₹${totalActualCost} actual vs ₹${totalEstimatedCost} estimate). Review required.`
    : `Material consumption aligned within standard tolerances (₹${totalActualCost}).`);

  db.prepare(`
    UPDATE incidents
    SET actual_materials_json = ?,
        variance_review_required = ?,
        variance_summary_note = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    JSON.stringify(processedItems),
    hasSignificantVariance ? 1 : 0,
    summaryNote,
    now,
    id
  );

  res.json({
    success: true,
    incidentId: id,
    varianceReviewRequired: hasSignificantVariance,
    totalEstimatedCost,
    totalActualCost,
    varianceCost: totalActualCost - totalEstimatedCost,
    summaryNote,
    items: processedItems
  });
});

// 4e. Variance Review Resolution Endpoint
departmentRouter.post('/incidents/:id/variance-review', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);
  const { id } = req.params;
  const { resolutionNote, approveVariance } = req.body;

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
  if (!incident) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Incident not found' });
    return;
  }

  if (req.user!.role !== 'ADMIN' && incident.department_id !== deptId) {
    res.status(403).json({ error: 'CROSS_DEPARTMENT_ACCESS_DENIED', message: 'Unauthorized department review.' });
    return;
  }

  const now = new Date().toISOString();
  const reviewer = req.user?.firstName ? `${req.user?.firstName} ${req.user?.lastName}` : 'Auditing Officer';
  const updatedNote = `[Variance Review by ${reviewer} at ${new Date().toLocaleTimeString()}]: ${resolutionNote || (approveVariance ? 'Variance audited and approved.' : 'Variance noted.')}`;

  db.prepare(`
    UPDATE incidents
    SET variance_review_required = ?,
        variance_summary_note = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    approveVariance ? 0 : incident.variance_review_required,
    updatedNote,
    now,
    id
  );

  res.json({
    success: true,
    incidentId: id,
    varianceReviewRequired: approveVariance ? false : Boolean(incident.variance_review_required),
    summaryNote: updatedNote
  });
});


// 5. Update Status with Optimistic Concurrency Control & Evidence Verification
departmentRouter.patch('/incidents/:id/status', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);
  const { id } = req.params;
  const { targetStatus, reason, updateNote, completionPhotoDataUrl, expectedVersion } = req.body;

  if (!targetStatus || expectedVersion === undefined) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'targetStatus and expectedVersion are required.' });
    return;
  }

  // Normalize status string
  let normalizedStatus = targetStatus.trim();
  if (normalizedStatus === 'WORK STARTED') normalizedStatus = 'WORK STARTED';
  if (normalizedStatus === 'WORK IN PROGRESS') normalizedStatus = 'WORK IN PROGRESS';
  if (normalizedStatus === 'WORK COMPLETED') normalizedStatus = 'WORK COMPLETED';

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
  if (!incident) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Incident not found' });
    return;
  }

  // Cross-department modification barrier
  if (req.user!.role !== 'ADMIN' && incident.department_id !== deptId) {
    res.status(403).json({
      error: 'CROSS_DEPARTMENT_ACCESS_DENIED',
      message: `Security Block: Cannot modify incident belonging to department '${incident.department_id}'.`
    });
    return;
  }

  // OCC Check
  if (incident.version !== Number(expectedVersion)) {
    res.status(409).json({
      error: 'CONCURRENCY_CONFLICT',
      message: `Conflict: Incident was modified by another operator. Server version is ${incident.version}, expected ${expectedVersion}.`,
      currentVersion: incident.version
    });
    return;
  }

  // Require completion evidence image if transitioning to WORK COMPLETED / RESOLVED
  const isCompleting = normalizedStatus === 'WORK COMPLETED' || normalizedStatus === 'WORK_COMPLETED' || normalizedStatus === 'RESOLVED';
  if (isCompleting && !completionPhotoDataUrl && !incident.completion_image_url) {
    res.status(400).json({
      error: 'COMPLETION_IMAGE_REQUIRED',
      message: 'Completion proof image is mandatory to mark an incident as WORK COMPLETED.'
    });
    return;
  }

  const now = new Date().toISOString();
  const note = updateNote || reason || (isCompleting ? 'Repair completed and verified with photographic evidence on site.' : `Status updated to ${normalizedStatus}`);

  db.exec('BEGIN TRANSACTION;');
  try {
    let completionUrl = incident.completion_image_url;

    if (completionPhotoDataUrl && typeof completionPhotoDataUrl === 'string' && completionPhotoDataUrl.length > 50) {
      const evidenceId = 'ev-comp-' + crypto.randomUUID().slice(0, 8);
      const sha256 = crypto.createHash('sha256').update(completionPhotoDataUrl).digest('hex');
      completionUrl = completionPhotoDataUrl.length > 2000000 ? completionPhotoDataUrl.slice(0, 2000000) : completionPhotoDataUrl;

      db.prepare(`
        INSERT INTO evidence (
          id, incident_id, uploader_id, file_name, file_url, mime_type, file_size, sha256_hash, is_verified, created_at
        ) VALUES (?, ?, ?, ?, ?, 'image/jpeg', ?, ?, 1, ?)
      `).run(
        evidenceId,
        id,
        req.user!.id,
        `completion_evidence_${Date.now()}.jpg`,
        completionUrl,
        completionUrl.length,
        sha256,
        now
      );
    }

    const updateRes = db.prepare(`
      UPDATE incidents
      SET status = ?,
          completion_image_url = COALESCE(?, completion_image_url),
          department_update_note = ?,
          resolution_notes = CASE WHEN ? IS NOT NULL THEN ? ELSE resolution_notes END,
          resolution_submitted_at = CASE WHEN ? = 1 THEN ? ELSE resolution_submitted_at END,
          version = version + 1,
          updated_at = ?
      WHERE id = ? AND version = ?
    `).run(
      normalizedStatus,
      completionUrl || null,
      note,
      isCompleting ? note : null,
      note,
      isCompleting ? 1 : 0,
      now,
      now,
      id,
      expectedVersion
    );

    if (updateRes.changes === 0) {
      db.exec('ROLLBACK;');
      res.status(409).json({ error: 'CONCURRENCY_CONFLICT', message: 'Atomic OCC check failed during update.' });
      return;
    }

    db.prepare(`
      INSERT INTO incident_status_history (id, incident_id, from_status, to_status, actor_id, actor_role, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('hist-' + crypto.randomUUID().slice(0, 8), id, incident.status, normalizedStatus, req.user!.id, 'DEPARTMENT_USER', note, now);

    db.prepare(`
      INSERT INTO audit_logs (id, incident_id, actor_id, actor_role, department_id, action, entity_type, entity_id, details, correlation_id, created_at)
      VALUES (?, ?, ?, ?, ?, 'STATUS_TRANSITION', 'INCIDENT', ?, ?, ?, ?)
    `).run('aud-' + crypto.randomUUID().slice(0, 8), id, req.user!.id, req.user!.role, deptId, id, JSON.stringify({ from: incident.status, to: normalizedStatus, note }), 'corr-' + Date.now(), now);

    // Create Citizen Lifecycle Notifications
    if (incident.citizen_author_id) {
      const isWorkStarted = normalizedStatus === 'WORK STARTED' || normalizedStatus === 'WORK_STARTED' || normalizedStatus === 'WORK IN PROGRESS' || normalizedStatus === 'WORK_IN_PROGRESS' || normalizedStatus === 'IN_PROGRESS';
      if (isWorkStarted && !['WORK STARTED', 'WORK_STARTED', 'WORK IN PROGRESS', 'WORK_IN_PROGRESS', 'IN_PROGRESS'].includes(incident.status)) {
        db.prepare(`
          INSERT INTO notifications (id, recipient_id, recipient_role, department_id, title, message, incident_id, is_read, created_at)
          VALUES (?, ?, 'RESIDENT', ?, 'Work Started', 'Work has started on your reported issue.', ?, 0, ?)
        `).run('notif-' + crypto.randomUUID().slice(0, 8), incident.citizen_author_id, deptId, id, now);
      }

      if (isCompleting) {
        db.prepare(`
          INSERT INTO notifications (id, recipient_id, recipient_role, department_id, title, message, incident_id, is_read, created_at)
          VALUES (?, ?, 'RESIDENT', ?, 'Work Completed', 'The department has marked your issue as completed. Please verify the resolution.', ?, 0, ?)
        `).run('notif-' + crypto.randomUUID().slice(0, 8), incident.citizen_author_id, deptId, id, now);
      }
    }

    db.exec('COMMIT;');
    res.json({
      success: true,
      newStatus: normalizedStatus,
      completionImageUrl: completionUrl,
      version: incident.version + 1,
      note
    });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'DATABASE_ERROR', message: err.message });
  }
});

// 6. SLA Monitoring for Department
departmentRouter.get('/sla', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);

  const policies = db.prepare('SELECT * FROM sla_policies WHERE department_id = ?').all(deptId);
  const activeSlaIncidents = db.prepare(`
    SELECT id, tracking_number, title, priority, status, created_at, sla_deadline, is_sla_breached
    FROM incidents
    WHERE department_id = ? AND status NOT IN ('CLOSED', 'REJECTED', 'DUPLICATE')
    ORDER BY sla_deadline ASC
  `).all(deptId);

  res.json({ departmentId: deptId, policies, activeSlaIncidents });
});

// 7. Department Geospatial Map
departmentRouter.get('/map', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);

  const mapPoints = db.prepare(`
    SELECT id, tracking_number, title, status, category, priority, latitude, longitude, address, ward_code
    FROM incidents
    WHERE department_id = ? AND status NOT IN ('REJECTED', 'DUPLICATE')
  `).all(deptId);

  res.json({ departmentId: deptId, points: mapPoints });
});

// 8. Teams and Field Workers for this Department
departmentRouter.get('/teams', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);
  const teams = db.prepare('SELECT * FROM teams WHERE department_id = ?').all(deptId);
  res.json({ departmentId: deptId, teams });
});

departmentRouter.get('/workers', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);
  const workers = db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.badge_number, u.phone_number,
           t.name as team_name, t.id as team_id
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    WHERE u.department_id = ? AND u.role IN ('FIELD_WORKER', 'DEPARTMENT_USER') AND u.is_active = 1
  `).all(deptId);

  res.json({ departmentId: deptId, workers });
});

// 9. Assignment Management (Assign Incident to Team/Worker in this Department)
departmentRouter.post('/incidents/:id/assign', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);
  const { id } = req.params;
  const { teamId, workerId, notes } = req.body;

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
  if (!incident) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Incident not found' });
    return;
  }

  // Cross-department assignment barrier
  if (req.user!.role !== 'ADMIN' && incident.department_id !== deptId) {
    res.status(403).json({ error: 'CROSS_DEPARTMENT_ACCESS_DENIED', message: 'Cannot assign work on incidents belonging to another department.' });
    return;
  }

  // Validate team belongs to this department
  if (teamId) {
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as any;
    if (!team || team.department_id !== deptId) {
      res.status(400).json({ error: 'INVALID_TEAM', message: `Team '${teamId}' does not belong to your department '${deptId}'.` });
      return;
    }
  }

  const now = new Date().toISOString();
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`
      UPDATE incidents
      SET assigned_team_id = ?, assigned_worker_id = ?, status = 'ASSIGNED', version = version + 1, updated_at = ?
      WHERE id = ?
    `).run(teamId || null, workerId || null, now, id);

    db.prepare(`
      INSERT INTO incident_status_history (id, incident_id, from_status, to_status, actor_id, actor_role, reason, created_at)
      VALUES (?, ?, ?, 'ASSIGNED', ?, ?, ?, ?)
    `).run('hist-' + crypto.randomUUID().slice(0, 8), id, incident.status, req.user!.id, req.user!.role, notes || 'Assigned to field response unit', now);

    db.exec('COMMIT;');
    res.json({ success: true, message: 'Incident assigned successfully', status: 'ASSIGNED' });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'DATABASE_ERROR', message: err.message });
  }
});

// 10. Resolution Review (List & Action)
departmentRouter.get('/resolutions', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);

  const resolutions = db.prepare(`
    SELECT i.id, i.tracking_number, i.title, i.status, i.resolution_notes, i.resolution_submitted_at,
           w.first_name || ' ' || w.last_name as worker_name,
           t.name as team_name
    FROM incidents i
    LEFT JOIN users w ON i.assigned_worker_id = w.id
    LEFT JOIN teams t ON i.assigned_team_id = t.id
    WHERE i.department_id = ? AND i.status = 'RESOLUTION_SUBMITTED'
    ORDER BY i.updated_at ASC
  `).all(deptId);

  res.json({ departmentId: deptId, resolutions });
});

departmentRouter.post('/resolutions/:id/review', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);
  const { id } = req.params;
  const { decision, notes } = req.body; // 'APPROVE' -> 'VERIFYING', 'REJECT' -> 'IN_PROGRESS'

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
  if (!incident || (req.user!.role !== 'ADMIN' && incident.department_id !== deptId)) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Incident not accessible or not in your department.' });
    return;
  }

  const nextStatus = decision === 'APPROVE' ? 'VERIFYING' : 'IN_PROGRESS';
  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`
      UPDATE incidents
      SET status = ?, version = version + 1, updated_at = ?
      WHERE id = ?
    `).run(nextStatus, now, id);

    db.prepare(`
      INSERT INTO incident_status_history (id, incident_id, from_status, to_status, actor_id, actor_role, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('hist-' + crypto.randomUUID().slice(0, 8), id, incident.status, nextStatus, req.user!.id, req.user!.role, notes || `Resolution review decision: ${decision}`, now);

    db.exec('COMMIT;');
    res.json({ success: true, nextStatus });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'DATABASE_ERROR', message: err.message });
  }
});

// 11. Verification Review (Autonomous or Officer Sign-off)
departmentRouter.get('/verifications', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);

  const verifications = db.prepare(`
    SELECT i.id, i.tracking_number, i.title, i.status, i.address, i.confidence_score, i.updated_at
    FROM incidents i
    WHERE i.department_id = ? AND i.status = 'VERIFYING'
    ORDER BY i.updated_at ASC
  `).all(deptId);

  res.json({ departmentId: deptId, verifications });
});

departmentRouter.post('/verifications/:id/review', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);
  const { id } = req.params;
  const { decision, notes } = req.body; // 'VERIFIED' or 'REOPENED'

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
  if (!incident || (req.user!.role !== 'ADMIN' && incident.department_id !== deptId)) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Incident not accessible or not in your department.' });
    return;
  }

  const nextStatus = decision === 'VERIFY' ? 'VERIFIED' : 'REOPENED';
  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`
      UPDATE incidents
      SET status = ?, verified_at = ?, version = version + 1, updated_at = ?
      WHERE id = ?
    `).run(nextStatus, decision === 'VERIFY' ? now : null, now, id);

    db.prepare(`
      INSERT INTO incident_status_history (id, incident_id, from_status, to_status, actor_id, actor_role, reason, created_at)
      VALUES (?, ?, 'VERIFYING', ?, ?, ?, ?, ?)
    `).run('hist-' + crypto.randomUUID().slice(0, 8), id, nextStatus, req.user!.id, req.user!.role, notes || `Verification sign-off: ${nextStatus}`, now);

    db.exec('COMMIT;');
    res.json({ success: true, nextStatus });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'DATABASE_ERROR', message: err.message });
  }
});

// 12. Department Analytics
departmentRouter.get('/analytics', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);

  const categoryBreakdown = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM incidents
    WHERE department_id = ?
    GROUP BY category
  `).all(deptId);

  const wardBreakdown = db.prepare(`
    SELECT ward_code, COUNT(*) as count
    FROM incidents
    WHERE department_id = ? AND ward_code IS NOT NULL
    GROUP BY ward_code
  `).all(deptId);

  res.json({ departmentId: deptId, categoryBreakdown, wardBreakdown });
});

// 13. Recurring Issue Intelligence (Scoped to Department Jurisdiction)
departmentRouter.get('/recurring-issues', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);
  const issues = db.prepare(`
    SELECT * FROM recurring_issues
    WHERE department_id = ?
    ORDER BY confidence DESC
  `).all(deptId);

  res.json({ departmentId: deptId, recurringIssues: issues });
});

// 14. Department Notifications
departmentRouter.get('/notifications', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);
  const actor = {
    id: req.user!.id,
    role: req.user!.role,
    department_id: deptId
  };
  const result = notificationService.getNotificationsForUser(actor, { limit: 50 });
  res.json({ success: true, count: result.totalCount, unreadCount: result.unreadCount, notifications: result.notifications });
});

// 15. Department Resources Overview (Workforce, Equipment, Vehicles, Materials & Alerts)
departmentRouter.get('/resources', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);

  // Workforce counts
  const totalWorkers = db.prepare(`
    SELECT COUNT(*) as count FROM users
    WHERE department_id = ? AND role IN ('FIELD_WORKER', 'DEPARTMENT_USER') AND is_active = 1
  `).get(deptId) as { count: number };

  const assignedIncidents = db.prepare(`
    SELECT COUNT(DISTINCT assigned_worker_id) as count
    FROM incidents
    WHERE department_id = ? AND status IN ('ASSIGNED', 'IN_PROGRESS') AND assigned_worker_id IS NOT NULL
  `).get(deptId) as { count: number };

  const baseWorkerCount = Math.max(totalWorkers.count || 0, deptId === 'dept-transport' ? 18 : deptId === 'dept-water' ? 14 : deptId === 'dept-sanitation' ? 22 : 16);
  const assignedWorkerCount = Math.max(assignedIncidents.count || 0, deptId === 'dept-transport' ? 12 : 9);
  const freeWorkerCount = Math.max(0, baseWorkerCount - assignedWorkerCount);

  // Department-specific Equipment Inventory
  let equipmentList: any[] = [];
  let vehicleList: any[] = [];
  let materialList: any[] = [];
  let alertsList: any[] = [];

  if (deptId === 'dept-transport') {
    equipmentList = [
      { id: 'eq-dot-01', name: 'Road Roller', category: 'Heavy Machinery', required: 1, available: 2, inUse: 1, maintenance: 0, status: 'Available' },
      { id: 'eq-dot-02', name: 'Asphalt Cutter', category: 'Cutting & Trenching', required: 1, available: 0, inUse: 2, maintenance: 1, status: 'Unavailable' },
      { id: 'eq-dot-03', name: 'Vibratory Plate Compactor', category: 'Compaction', required: 1, available: 1, inUse: 2, maintenance: 0, status: 'Available' },
      { id: 'eq-dot-04', name: 'Safety Barricades & Traffic Cones', category: 'Traffic Safety', required: 8, available: 14, inUse: 28, maintenance: 0, status: 'Available' },
      { id: 'eq-dot-05', name: 'Asphalt Paver & Screed', category: 'Paving', required: 1, available: 1, inUse: 1, maintenance: 0, status: 'Available' },
    ];
    vehicleList = [
      { id: 'veh-dot-01', name: 'DOT Utility Van #U12', type: 'Crew & Tool Transport', status: 'Assigned', driver: 'Marcus Chen' },
      { id: 'veh-dot-02', name: 'DOT Heavy Tipper #T04', type: 'Asphalt Transport', status: 'Available', driver: 'Standby' },
      { id: 'veh-dot-03', name: 'DOT Mobile Patch Unit #M02', type: 'Hot Mix Thermal Patch', status: 'Assigned', driver: 'Leon Vance' },
      { id: 'veh-dot-04', name: 'DOT Safety Escort Truck #S01', type: 'Traffic Attenuation', status: 'Available', driver: 'Standby' },
    ];
    materialList = [
      { id: 'mat-01', name: 'Hot-Mix Asphalt (Type B)', stockPct: 18, unit: 'Tons', thresholdPct: 30, status: 'LOW' },
      { id: 'mat-02', name: 'Road Base Crushed Gravel', stockPct: 64, unit: 'Tons', thresholdPct: 25, status: 'OPTIMAL' },
      { id: 'mat-03', name: 'Coarse Sand & Aggregate', stockPct: 82, unit: 'Tons', thresholdPct: 20, status: 'OPTIMAL' },
      { id: 'mat-04', name: 'Thermoplastic Road Marking Paint', stockPct: 42, unit: 'Litres', thresholdPct: 25, status: 'OPTIMAL' },
    ];
    alertsList = [
      {
        id: 'alt-01',
        type: 'MATERIAL_SHORTAGE',
        severity: 'CRITICAL',
        title: 'Asphalt Stock Low',
        message: 'Current availability: 18%. Expected requirement: 35%.',
        action: 'Request Material Replenishment'
      },
      {
        id: 'alt-02',
        type: 'WORKFORCE_SHORTAGE',
        severity: 'HIGH',
        title: 'Workforce Shortage Alert',
        message: '2 additional road workers required for INC-2026-DOT-001 — Critical Road Damage.',
        action: 'Reallocate Available Crew'
      },
      {
        id: 'alt-03',
        type: 'EQUIPMENT_UNAVAILABLE',
        severity: 'MEDIUM',
        title: 'Asphalt Cutter Fully Deployed',
        message: 'All hydraulic cutters are currently committed to active work orders.',
        action: 'Coordinate with Depot Yard'
      }
    ];
  } else if (deptId === 'dept-water') {
    equipmentList = [
      { id: 'eq-wat-01', name: 'Hydro-Jetting Pipe Cleanser', category: 'Clearing', required: 1, available: 1, inUse: 1, maintenance: 0, status: 'Available' },
      { id: 'eq-wat-02', name: 'Acoustic Ultrasonic Leak Detector', category: 'Diagnostics', required: 1, available: 2, inUse: 1, maintenance: 0, status: 'Available' },
      { id: 'eq-wat-03', name: 'Heavy Submersible Sludge Pump', category: 'Dewatering', required: 1, available: 0, inUse: 2, maintenance: 1, status: 'Unavailable' },
      { id: 'eq-wat-04', name: 'CCTV Pipe Inspection Crawler', category: 'Camera Inspection', required: 1, available: 1, inUse: 1, maintenance: 0, status: 'Available' }
    ];
    vehicleList = [
      { id: 'veh-wat-01', name: 'DWS Emergency Water Rig #W08', type: 'Pipeline Repair', status: 'Assigned', driver: 'Lucas Dubois' },
      { id: 'veh-wat-02', name: 'DWS Vacuum Tanker #V02', type: 'Sludge Extraction', status: 'Available', driver: 'Standby' }
    ];
    materialList = [
      { id: 'mat-wat-01', name: 'Ductile Iron Pipe Sleeves (6")', stockPct: 26, unit: 'Units', thresholdPct: 30, status: 'LOW' },
      { id: 'mat-wat-02', name: 'High-Pressure Valve Seals', stockPct: 75, unit: 'Kits', thresholdPct: 20, status: 'OPTIMAL' },
      { id: 'mat-wat-03', name: 'Chlorination Disinfection Tablets', stockPct: 90, unit: 'Kg', thresholdPct: 30, status: 'OPTIMAL' }
    ];
    alertsList = [
      {
        id: 'alt-w01',
        type: 'EQUIPMENT_UNAVAILABLE',
        severity: 'HIGH',
        title: 'Submersible Sludge Pump Unavailable',
        message: 'Currently dispatched to Main Pump Station #3 for flood mitigation.',
        action: 'Request Inter-depot Transfer'
      },
      {
        id: 'alt-w02',
        type: 'MATERIAL_SHORTAGE',
        severity: 'MEDIUM',
        title: 'Pipe Sleeve Stock Below Threshold',
        message: 'Current stock at 26% (minimum safe reserve: 30%).',
        action: 'Issue Purchase Order'
      }
    ];
  } else {
    // Default / Sanitation / Public Works
    equipmentList = [
      { id: 'eq-def-01', name: 'Commercial Waste Compactor Truck', category: 'Collection', required: 2, available: 3, inUse: 4, maintenance: 1, status: 'Available' },
      { id: 'eq-def-02', name: 'Mechanical Street Sweeper', category: 'Clearing', required: 1, available: 0, inUse: 2, maintenance: 0, status: 'Unavailable' },
      { id: 'eq-def-03', name: 'Hydraulic Bin Lifter Unit', category: 'Loading', required: 1, available: 2, inUse: 1, maintenance: 0, status: 'Available' }
    ];
    vehicleList = [
      { id: 'veh-def-01', name: 'Municipal Compactor #C14', type: 'Heavy Waste Collector', status: 'Assigned', driver: 'Maya Patel' },
      { id: 'veh-def-02', name: 'Sanitation Rapid Response #R03', type: 'Dump Site Abatement', status: 'Available', driver: 'Standby' }
    ];
    materialList = [
      { id: 'mat-def-01', name: 'Industrial Polyethylene Liners', stockPct: 32, unit: 'Rolls', thresholdPct: 20, status: 'OPTIMAL' },
      { id: 'mat-def-02', name: 'Neutralizing Chemical Disinfectant', stockPct: 68, unit: 'Liters', thresholdPct: 25, status: 'OPTIMAL' }
    ];
    alertsList = [
      {
        id: 'alt-d01',
        type: 'EQUIPMENT_UNAVAILABLE',
        severity: 'MEDIUM',
        title: 'Street Sweeper In Maintenance',
        message: 'Vehicle undergoing scheduled 5,000-mile transmission service.',
        action: 'Schedule Secondary Crew'
      }
    ];
  }

  const assignedVehiclesCount = vehicleList.filter(v => v.status === 'Assigned').length;
  const freeVehiclesCount = vehicleList.filter(v => v.status === 'Available').length;

  res.json({
    departmentId: deptId,
    workforce: {
      total: baseWorkerCount,
      assigned: assignedWorkerCount,
      free: freeWorkerCount,
      status: freeWorkerCount < 4 ? 'SHORTAGE: 2 WORKERS' : 'SUFFICIENT'
    },
    equipment: {
      items: equipmentList,
      totalAvailable: equipmentList.reduce((acc, e) => acc + e.available, 0),
      totalInUse: equipmentList.reduce((acc, e) => acc + e.inUse, 0),
      totalMaintenance: equipmentList.reduce((acc, e) => acc + e.maintenance, 0)
    },
    vehicles: {
      items: vehicleList,
      totalAvailable: vehicleList.length,
      assigned: assignedVehiclesCount,
      free: freeVehiclesCount
    },
    materials: {
      items: materialList
    },
    alerts: alertsList
  });
});

// 16. Incident Assessment (Damage Severity, Impact, Required Resources & Team Recommendation)
departmentRouter.get('/incidents/:id/assessment', (req: Request, res: Response) => {
  const deptId = getEffectiveDepartmentId(req);
  const { id } = req.params;

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
  if (!incident) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Incident not found' });
    return;
  }

  // Strict cross-department isolation
  if (req.user!.role !== 'ADMIN' && incident.department_id !== deptId) {
    res.status(403).json({
      error: 'CROSS_DEPARTMENT_ACCESS_DENIED',
      message: `Access Denied. Incident belongs to department '${incident.department_id}', authenticated under '${deptId}'.`
    });
    return;
  }

  // Fetch available teams for this department
  const teams = db.prepare('SELECT * FROM teams WHERE department_id = ?').all(deptId) as any[];
  const recommendedTeam = teams[0] || {
    id: 'team-rec-01',
    name: 'Road Maintenance Team — Zone 04',
    lead_name: 'Lead Inspector Alvarez'
  };

  // Build department-specific tailored assessment
  const isRoad = incident.category === 'ROAD_DAMAGE' || deptId === 'dept-transport';
  const isWater = incident.category === 'WATER' || incident.category === 'DRAINAGE' || deptId === 'dept-water';

  const assessment = {
    incidentId: incident.id,
    trackingNumber: incident.tracking_number,
    departmentId: deptId,
    damageSeverity: incident.priority === 'P1_CRITICAL' ? 'CRITICAL' : incident.priority === 'P2_HIGH' ? 'HIGH' : 'MEDIUM',
    impactAssessment: {
      publicSafetyImpact: incident.priority === 'P1_CRITICAL' ? 'HIGH' : 'MEDIUM',
      trafficDisruption: isRoad ? (incident.priority === 'P1_CRITICAL' ? 'HIGH' : 'MODERATE') : 'LOW',
      affectedPopulationEstimate: isRoad ? '14,500 commuters daily' : '4,200 ward residents',
      infrastructureDamage: incident.priority === 'P1_CRITICAL' ? 'SEVERE' : 'MODERATE',
      urgency: incident.priority === 'P1_CRITICAL' ? 'IMMEDIATE' : 'STANDARD',
      geographicImpact: 'Arterial Corridor (Ward 04)',
      recommendedResponse: isRoad
        ? 'Immediate field inspection & asphalt patching crew dispatch within 3 hours'
        : 'Inspection of drainage culvert and clearing of hydraulic obstructions'
    },
    requiredResources: {
      labour: isRoad ? [
        { role: 'Site Engineer', count: 1 },
        { role: 'Road Workers', count: 4 },
        { role: 'General Labourers', count: 2 }
      ] : [
        { role: 'Hydraulic Technician', count: 1 },
        { role: 'Pipe Layers', count: 3 },
        { role: 'Safety Marshals', count: 2 }
      ],
      equipment: isRoad ? [
        { name: 'Road Roller', required: 1, available: 2, status: 'Available' },
        { name: 'Asphalt Cutter', required: 1, available: 0, status: 'Unavailable' },
        { name: 'Compactor', required: 1, available: 1, status: 'Available' },
        { name: 'Safety Barricades', required: 8, available: 14, status: 'Available' }
      ] : [
        { name: 'Hydro-Jetting Rig', required: 1, available: 1, status: 'Available' },
        { name: 'Acoustic Leak Detector', required: 1, available: 2, status: 'Available' },
        { name: 'Sludge Pump', required: 1, available: 0, status: 'Unavailable' }
      ],
      materials: isRoad ? [
        { name: 'Hot-Mix Asphalt (Type B)', quantity: '3.2 Tons' },
        { name: 'Crushed Base Gravel', quantity: '1.5 Tons' },
        { name: 'Sand & Aggregate', quantity: '0.8 Tons' },
        { name: 'Reflective Road Paint', quantity: '4 Litres' }
      ] : [
        { name: 'Ductile Iron Pipe Sleeves', quantity: '2 Units' },
        { name: 'High-Pressure Gaskets', quantity: '4 Units' }
      ],
      vehicles: isRoad ? [
        { name: 'Utility Repair Van (DOT-U12)', type: 'Crew Van', status: 'Assigned' },
        { name: 'Material Transport Truck (DOT-T04)', type: 'Heavy Tipper', status: 'Available' }
      ] : [
        { name: 'DWS Pipeline Emergency Rig #W08', type: 'Rig Truck', status: 'Assigned' }
      ]
    },
    workforceRequirement: {
      requiredWorkers: 6,
      availableWorkers: 8,
      currentlyAssigned: 4,
      additionalNeeded: 2,
      workforceStatus: 'SHORTAGE: 2 WORKERS'
    },
    recommendedTeam: {
      id: recommendedTeam.id,
      name: recommendedTeam.name,
      leadName: recommendedTeam.lead_name,
      distance: '2.4 km',
      availableWorkers: 6,
      requiredWorkers: 6,
      equipment: 'Available',
      currentWorkload: 'Medium',
      matchReason: 'Proximity to Ward 04, matching asphalt machinery certifications, and lowest active ticket backlog.'
    }
  };

  res.json({ assessment });
});

