-- ============================================================================
-- CivicConnect: Production-Grade PostgreSQL 16+ & PostGIS 3.4+ Schema
-- Agentic Civic Issue Intelligence and Response System
-- ============================================================================

-- 0. EXTENSIONS & GLOBAL CONFIGURATION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ENUMS
CREATE TYPE user_role AS ENUM (
    'CITIZEN',
    'AUTHORITY_OFFICER',
    'FIELD_WORKER',
    'ADMINISTRATOR'
);

CREATE TYPE incident_state AS ENUM (
    'REPORTED',
    'TRIAGED',
    'ASSIGNED',
    'IN_PROGRESS',
    'WORK_REVIEW',
    'RESOLVED',
    'CLOSED',
    'REJECTED',
    'MERGED_DUPLICATE'
);

CREATE TYPE priority_level AS ENUM (
    'P1_CRITICAL',
    'P2_HIGH',
    'P3_MEDIUM',
    'P4_LOW'
);

CREATE TYPE duplicate_relation_type AS ENUM (
    'EXACT_PHYSICAL_DUPLICATE',
    'ADJACENT_SYMPTOM_DUPLICATE',
    'CORRELATED_CASCADE'
);

CREATE TYPE sla_status AS ENUM (
    'ACTIVE',
    'WARNING_BREACH_IMMUTABLE',
    'BREACHED',
    'MET',
    'PAUSED'
);

CREATE TYPE approval_decision AS ENUM (
    'APPROVED',
    'OVERRIDDEN',
    'REJECTED',
    'ESCALATED'
);

CREATE TYPE evidence_type AS ENUM (
    'CITIZEN_SUBMISSION',
    'FIELD_BEFORE_WORK',
    'FIELD_AFTER_WORK',
    'OFFICER_INSPECTION',
    'SENSOR_FEED'
);

-- ============================================================================
-- DOMAIN 1: IDENTITY, ORGANIZATION & TEAMS
-- ============================================================================

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    jurisdiction_boundary GEOMETRY(MultiPolygon, 4326),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_departments_jurisdiction_gist ON departments USING GIST (jurisdiction_boundary);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    name VARCHAR(128) NOT NULL,
    contact_phone VARCHAR(32),
    operational_coverage GEOMETRY(MultiPolygon, 4326),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_teams_department_id ON teams(department_id);
CREATE INDEX idx_teams_coverage_gist ON teams USING GIST (operational_coverage);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32),
    first_name VARCHAR(64) NOT NULL,
    last_name VARCHAR(64) NOT NULL,
    badge_number VARCHAR(64),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_users_dept CHECK (role = 'CITIZEN' OR department_id IS NOT NULL OR role = 'ADMINISTRATOR'),
    CONSTRAINT chk_users_worker_badge CHECK (role != 'FIELD_WORKER' OR badge_number IS NOT NULL)
);
CREATE UNIQUE INDEX idx_users_email_active ON users(LOWER(email)) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department_id ON users(department_id);

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_team_lead BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    left_at TIMESTAMPTZ,
    CONSTRAINT uq_team_members UNIQUE (team_id, user_id, joined_at)
);
CREATE INDEX idx_team_members_lookup ON team_members(team_id, user_id);

-- ============================================================================
-- DOMAIN 2: SLA POLICIES & CATEGORIZATION
-- ============================================================================

CREATE TABLE incident_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    default_department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    requires_citizen_reverification BOOLEAN NOT NULL DEFAULT TRUE,
    default_priority priority_level NOT NULL DEFAULT 'P3_MEDIUM',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_categories_dept ON incident_categories(default_department_id);

CREATE TABLE sla_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES incident_categories(id) ON DELETE RESTRICT,
    priority priority_level NOT NULL,
    response_time_minutes INTEGER NOT NULL,
    resolution_time_minutes INTEGER NOT NULL,
    escalation_threshold_pct INTEGER NOT NULL DEFAULT 80,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_sla_category_priority UNIQUE (category_id, priority),
    CONSTRAINT chk_sla_times CHECK (response_time_minutes > 0 AND resolution_time_minutes >= response_time_minutes),
    CONSTRAINT chk_sla_threshold CHECK (escalation_threshold_pct BETWEEN 50 AND 100)
);

-- ============================================================================
-- DOMAIN 3: INCIDENTS, OBSERVATIONS & SPATIAL DATA
-- ============================================================================

CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number VARCHAR(32) NOT NULL UNIQUE,
    category_id UUID NOT NULL REFERENCES incident_categories(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    state incident_state NOT NULL DEFAULT 'REPORTED',
    priority priority_level NOT NULL DEFAULT 'P3_MEDIUM',
    title VARCHAR(255) NOT NULL,
    canonical_description TEXT NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    address_text TEXT,
    jurisdiction_ward VARCHAR(64),
    total_observations_count INTEGER NOT NULL DEFAULT 1,
    is_reopened BOOLEAN NOT NULL DEFAULT FALSE,
    reopen_count INTEGER NOT NULL DEFAULT 0,
    sla_policy_id UUID NOT NULL REFERENCES sla_policies(id) ON DELETE RESTRICT,
    sla_response_deadline TIMESTAMPTZ NOT NULL,
    sla_resolution_deadline TIMESTAMPTZ NOT NULL,
    sla_status sla_status NOT NULL DEFAULT 'ACTIVE',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_incidents_observations CHECK (total_observations_count >= 1),
    CONSTRAINT chk_incidents_reopens CHECK (reopen_count >= 0)
);
CREATE INDEX idx_incidents_location_gist ON incidents USING GIST (location);
CREATE INDEX idx_incidents_state_priority ON incidents(state, priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_dept_state ON incidents(department_id, state) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_sla_pending ON incidents(sla_resolution_deadline) 
    WHERE state NOT IN ('RESOLVED', 'CLOSED', 'REJECTED', 'MERGED_DUPLICATE');

CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    citizen_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    raw_text TEXT NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    device_client VARCHAR(64),
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified_by_agent BOOLEAN NOT NULL DEFAULT FALSE,
    intake_source VARCHAR(32) NOT NULL DEFAULT 'CITIZEN_MOBILE_APP',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_observations_location_gist ON observations USING GIST (location);
CREATE INDEX idx_observations_incident_id ON observations(incident_id);
CREATE INDEX idx_observations_citizen_id ON observations(citizen_id);

CREATE TABLE incident_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    observation_id UUID REFERENCES observations(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    evidence_type evidence_type NOT NULL,
    storage_bucket VARCHAR(128) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    exif_captured_at TIMESTAMPTZ,
    exif_location GEOMETRY(Point, 4326),
    is_quarantined BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_evidence_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800),
    CONSTRAINT chk_evidence_parent CHECK (incident_id IS NOT NULL OR observation_id IS NOT NULL)
);
CREATE INDEX idx_evidence_incident ON incident_evidence(incident_id);
CREATE INDEX idx_evidence_observation ON incident_evidence(observation_id);
CREATE INDEX idx_evidence_hash ON incident_evidence(sha256_hash);
CREATE INDEX idx_evidence_exif_gist ON incident_evidence USING GIST (exif_location);

CREATE TABLE incident_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    from_state incident_state NOT NULL,
    to_state incident_state NOT NULL,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    changed_by_agent_execution_id UUID,
    transition_reason TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_history_actor CHECK (changed_by_user_id IS NOT NULL OR changed_by_agent_execution_id IS NOT NULL)
);
CREATE INDEX idx_status_history_incident ON incident_status_history(incident_id, created_at DESC);

CREATE TABLE incident_duplicates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE RESTRICT,
    duplicate_incident_id UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE RESTRICT,
    relation_type duplicate_relation_type NOT NULL,
    similarity_score NUMERIC(4, 3) NOT NULL,
    distance_meters NUMERIC(8, 2) NOT NULL,
    recommended_by_agent_id UUID,
    approved_by_officer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_duplicates_different CHECK (primary_incident_id != duplicate_incident_id),
    CONSTRAINT chk_duplicates_score CHECK (similarity_score BETWEEN 0.000 AND 1.000)
);
CREATE INDEX idx_duplicates_primary ON incident_duplicates(primary_incident_id);

CREATE TABLE incident_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    target_incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    relationship_description VARCHAR(128) NOT NULL,
    detected_by_agent_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_incident_relations UNIQUE (source_incident_id, target_incident_id),
    CONSTRAINT chk_relations_different CHECK (source_incident_id != target_incident_id)
);

-- ============================================================================
-- DOMAIN 4: ASSIGNMENTS, ESCALATIONS & SLA EVENTS
-- ============================================================================

CREATE TABLE incident_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    assigned_officer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_field_worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assignment_notes TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    unassigned_at TIMESTAMPTZ
);
CREATE INDEX idx_assignments_active ON incident_assignments(incident_id, is_active);
CREATE INDEX idx_assignments_worker ON incident_assignments(assigned_field_worker_id) WHERE is_active = TRUE;

CREATE TABLE sla_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    sla_policy_id UUID NOT NULL REFERENCES sla_policies(id) ON DELETE RESTRICT,
    event_type VARCHAR(64) NOT NULL,
    threshold_timestamp TIMESTAMPTZ NOT NULL,
    actual_timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    breach_duration_minutes INTEGER NOT NULL DEFAULT 0,
    is_breached BOOLEAN NOT NULL DEFAULT FALSE,
    details JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_sla_events_incident ON sla_events(incident_id);
CREATE INDEX idx_sla_events_breached ON sla_events(is_breached, actual_timestamp);

CREATE TABLE incident_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    escalated_from_priority priority_level NOT NULL,
    escalated_to_priority priority_level NOT NULL,
    triggered_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    triggered_by_agent_id UUID,
    reason TEXT NOT NULL,
    escalation_level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_escalations_incident ON incident_escalations(incident_id);

-- ============================================================================
-- DOMAIN 5: RESOLUTION, PROOF & CITIZEN VERIFICATION
-- ============================================================================

CREATE TABLE resolution_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE RESTRICT,
    submitted_by_worker_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    work_summary TEXT NOT NULL,
    materials_used JSONB NOT NULL DEFAULT '[]'::jsonb,
    completion_timestamp TIMESTAMPTZ NOT NULL,
    is_accepted_by_officer BOOLEAN,
    reviewed_by_officer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_resolutions_incident ON resolution_submissions(incident_id);

CREATE TABLE resolution_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resolution_submission_id UUID NOT NULL REFERENCES resolution_submissions(id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL UNIQUE REFERENCES incident_evidence(id) ON DELETE RESTRICT,
    verification_stage VARCHAR(32) NOT NULL DEFAULT 'WORK_COMPLETION_PHOTO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_res_evidence_submission ON resolution_evidence(resolution_submission_id);

CREATE TABLE citizen_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_satisfactorily_resolved BOOLEAN NOT NULL,
    feedback_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_citizen_verification UNIQUE (incident_id, citizen_id)
);

CREATE TABLE incident_reopens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    reopened_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reopen_reason TEXT NOT NULL,
    previous_resolution_id UUID NOT NULL REFERENCES resolution_submissions(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- DOMAIN 6: AI AGENT COGNITIVE TRANSPARENCY & EXECUTION
-- ============================================================================

CREATE TABLE agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(128) NOT NULL,
    agent_version VARCHAR(32) NOT NULL,
    model_identifier VARCHAR(64) NOT NULL,
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    observation_id UUID REFERENCES observations(id) ON DELETE SET NULL,
    pipeline_run_id UUID NOT NULL,
    system_prompt_hash CHAR(64) NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    execution_duration_ms INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_agent_exec_incident ON agent_executions(incident_id);
CREATE INDEX idx_agent_exec_pipeline ON agent_executions(pipeline_run_id);
CREATE INDEX idx_agent_exec_name ON agent_executions(agent_name, created_at);

CREATE TABLE agent_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_execution_id UUID NOT NULL UNIQUE REFERENCES agent_executions(id) ON DELETE CASCADE,
    confidence_score NUMERIC(4, 3) NOT NULL,
    reasoning_summary TEXT NOT NULL,
    structured_output JSONB NOT NULL,
    raw_response_text TEXT NOT NULL,
    requires_human_review BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_agent_confidence CHECK (confidence_score BETWEEN 0.000 AND 1.000)
);
CREATE INDEX idx_agent_decisions_jsonb ON agent_decisions USING GIN (structured_output);
CREATE INDEX idx_agent_decisions_review ON agent_decisions(requires_human_review) WHERE requires_human_review = TRUE;

CREATE TABLE agent_tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_execution_id UUID NOT NULL REFERENCES agent_executions(id) ON DELETE CASCADE,
    tool_name VARCHAR(128) NOT NULL,
    call_order INTEGER NOT NULL,
    input_arguments JSONB NOT NULL,
    output_result JSONB NOT NULL,
    is_success BOOLEAN NOT NULL,
    error_details TEXT,
    execution_ms INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_agent_tool_order UNIQUE (agent_execution_id, call_order)
);
CREATE INDEX idx_agent_tools_execution ON agent_tool_calls(agent_execution_id);

CREATE TABLE agent_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_execution_id UUID NOT NULL REFERENCES agent_executions(id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(64) NOT NULL,
    recommended_value JSONB NOT NULL,
    current_value JSONB,
    confidence NUMERIC(4, 3) NOT NULL,
    justification TEXT NOT NULL,
    is_applied BOOLEAN NOT NULL DEFAULT FALSE,
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_agent_rec_incident ON agent_recommendations(incident_id, is_applied);

CREATE TABLE human_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL REFERENCES agent_recommendations(id) ON DELETE RESTRICT,
    officer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    decision approval_decision NOT NULL,
    officer_override_value JSONB,
    rejection_reason TEXT,
    decision_timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_human_approvals_rec ON human_approvals(recommendation_id);
CREATE INDEX idx_human_approvals_officer ON human_approvals(officer_id);

-- ============================================================================
-- DOMAIN 7: PREVENTIVE INTELLIGENCE & CIVIC HOTSPOTS
-- ============================================================================

CREATE TABLE civic_hotspots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES incident_categories(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    cluster_geom GEOMETRY(Polygon, 4326) NOT NULL,
    centroid GEOMETRY(Point, 4326) NOT NULL,
    incident_count_last_90d INTEGER NOT NULL,
    severity_score NUMERIC(5, 2) NOT NULL,
    identified_by_agent_id UUID,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_hotspots_geom_gist ON civic_hotspots USING GIST (cluster_geom);
CREATE INDEX idx_hotspots_centroid_gist ON civic_hotspots USING GIST (centroid);

CREATE TABLE recurring_issue_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_signature VARCHAR(128) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    root_cause_hypothesis TEXT NOT NULL,
    affected_area GEOMETRY(MultiPolygon, 4326),
    associated_category_id UUID NOT NULL REFERENCES incident_categories(id) ON DELETE RESTRICT,
    detection_metadata JSONB NOT NULL,
    detected_by_agent_id UUID NOT NULL REFERENCES agent_executions(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_patterns_area_gist ON recurring_issue_patterns USING GIST (affected_area);

CREATE TABLE preventive_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES recurring_issue_patterns(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    action_plan TEXT NOT NULL,
    estimated_cost_tier VARCHAR(32) NOT NULL,
    projected_incident_reduction_pct NUMERIC(4, 1) NOT NULL,
    is_approved_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- DOMAIN 8: NOTIFICATIONS & MASTER AUDIT LEDGER
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    channel VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message_body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name VARCHAR(64) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(64) NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    actor_agent_execution_id UUID REFERENCES agent_executions(id) ON DELETE RESTRICT,
    client_ip INET,
    user_agent TEXT,
    pre_change_state JSONB,
    post_change_state JSONB,
    state_diff JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_diff_gin ON audit_logs USING GIN (state_diff);

-- ============================================================================
-- TRIGGERS & INTEGRITY GUARDS
-- ============================================================================

-- State Transition Validator
CREATE OR REPLACE FUNCTION enforce_incident_state_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.state = NEW.state THEN
        RETURN NEW;
    END IF;

    IF (OLD.state = 'REPORTED' AND NEW.state IN ('TRIAGED', 'REJECTED', 'MERGED_DUPLICATE')) OR
       (OLD.state = 'TRIAGED' AND NEW.state IN ('ASSIGNED', 'REJECTED', 'MERGED_DUPLICATE')) OR
       (OLD.state = 'ASSIGNED' AND NEW.state IN ('IN_PROGRESS', 'TRIAGED')) OR
       (OLD.state = 'IN_PROGRESS' AND NEW.state IN ('WORK_REVIEW', 'ASSIGNED')) OR
       (OLD.state = 'WORK_REVIEW' AND NEW.state IN ('RESOLVED', 'IN_PROGRESS')) OR
       (OLD.state = 'RESOLVED' AND NEW.state IN ('CLOSED', 'TRIAGED')) OR
       (OLD.state = 'CLOSED' AND NEW.state = 'TRIAGED') THEN
        
        INSERT INTO incident_status_history (
            incident_id, from_state, to_state, transition_reason, metadata
        ) VALUES (
            NEW.id, OLD.state, NEW.state, 'Deterministic state transition applied', 
            jsonb_build_object('updated_at', clock_timestamp())
        );

        NEW.updated_at = clock_timestamp();
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'Illegal state transition from % to % on incident %', 
            OLD.state, NEW.state, OLD.id USING ERRCODE = 'check_violation';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_incident_state_transition
BEFORE UPDATE OF state ON incidents
FOR EACH ROW
EXECUTE FUNCTION enforce_incident_state_transition();

-- Immutability Guard on Audit Logs
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit records are strictly append-only and cannot be updated or deleted'
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_mutation
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER trg_prevent_history_mutation
BEFORE UPDATE OR DELETE ON incident_status_history
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_audit_log_mutation();
