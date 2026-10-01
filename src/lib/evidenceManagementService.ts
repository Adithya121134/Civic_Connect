import {
  EvidenceRecord,
  EvidenceMediaType,
  EvidenceAuditRecord,
  PresignedUploadSession,
  SignedAccessUrlResponse,
  GeographicMetadata,
} from '../types/evidence';
import { cloudStorage } from './storageDriver';
import { FILE_LIMITS, computeHashes, inspectMagicBytes } from './fileSecurityValidator';
import { User, UserRole } from '../types/auth';

export class EvidenceManagementService {
  private evidenceStore: Map<string, EvidenceRecord> = new Map();
  // Hash lookup table to detect duplicate binary uploads across tickets
  private hashToEvidenceId: Map<string, string> = new Map();
  private auditLedger: EvidenceAuditRecord[] = [];
  private isSeeded = false;

  constructor() {
    this.seedInitialEvidence();
  }

  private seedInitialEvidence() {
    if (this.isSeeded) return;

    const baseNow = new Date();
    const seed: EvidenceRecord = {
      id: 'ev-seed-pothole-01',
      incidentId: 'inc-pothole-101',
      uploaderId: 'usr-citizen-01',
      uploaderEmail: 'citizen.elena@gmail.com',
      uploaderName: 'Elena Rostova',
      uploaderRole: 'CITIZEN',
      evidenceType: 'IMAGE',
      storageRef: {
        bucket: 'civicconnect-evidence-vault-prod',
        storageKey: 'inc-pothole-101/usr-citizen-01/market_st_subsidence_2026.jpg',
        storageProvider: 'LOCAL_EMULATOR',
        contentLengthBytes: 3421500,
        storedMimeType: 'image/jpeg',
      },
      sha256Hash: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
      md5Checksum: 'f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6',
      fileMetadata: {
        originalFilename: 'IMG_4091_MarketSt_Pothole.JPG',
        fileSizeBytes: 3421500,
        declaredMimeType: 'image/jpeg',
        detectedMimeType: 'image/jpeg',
        extension: '.jpg',
        imageDimensions: { width: 4032, height: 3024 },
        exifDeviceModel: 'iPhone 15 Pro Max',
      },
      geoMetadata: {
        latitude: 37.7749,
        longitude: -122.4194,
        altitudeMeters: 14.2,
        accuracyMeters: 4.8,
        geotagSource: 'EXIF_GPS',
      },
      validationStatus: 'VALIDATED',
      validationScore: 0.98,
      verificationStatus: 'AI_VERIFIED',
      verificationNotes: 'AI Vision confirmed active road surface pothole with clear depth cues.',
      capturedTimestamp: new Date(baseNow.getTime() - 4 * 3600000).toISOString(),
      uploadTimestamp: new Date(baseNow.getTime() - 4 * 3600000).toISOString(),
      updatedTimestamp: new Date(baseNow.getTime() - 4 * 3600000).toISOString(),
    };

    this.evidenceStore.set(seed.id, seed);
    this.hashToEvidenceId.set(seed.sha256Hash, seed.id);
    this.recordAudit({
      evidenceId: seed.id,
      incidentId: seed.incidentId,
      actorId: seed.uploaderId,
      actorRole: seed.uploaderRole,
      actorName: seed.uploaderName,
      action: 'FILE_INGESTED',
      details: 'Initial verified evidentiary record ingested into evidence vault.',
    });

    this.isSeeded = true;
  }

  // ==========================================
  // AUDIT TRAIL
  // ==========================================
  private recordAudit(entry: Omit<EvidenceAuditRecord, 'id' | 'timestamp'>): EvidenceAuditRecord {
    const record: EvidenceAuditRecord = {
      id: 'ev-audit-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.auditLedger.unshift(record);
    if (this.auditLedger.length > 500) {
      this.auditLedger.pop();
    }
    return record;
  }

  public getEvidenceAuditTrail(evidenceId: string): EvidenceAuditRecord[] {
    return this.auditLedger.filter((a) => a.evidenceId === evidenceId);
  }

  public getAllAuditRecords(): EvidenceAuditRecord[] {
    return [...this.auditLedger];
  }

  // ==========================================
  // 1. SECURE UPLOAD SESSION REQUEST (PRESIGNED URL)
  // ==========================================
  public async requestPresignedUploadSession(params: {
    incidentId: string;
    uploader: User;
    originalFilename: string;
    fileSizeBytes: number;
    declaredMimeType: string;
    evidenceType: EvidenceMediaType;
  }): Promise<{ success: boolean; session?: PresignedUploadSession; error?: string }> {
    const limits = FILE_LIMITS[params.evidenceType];
    if (!limits) {
      return { success: false, error: `Unsupported media type '${params.evidenceType}'.` };
    }

    // 2. File size validation
    if (params.fileSizeBytes > limits.maxBytes) {
      const maxMb = (limits.maxBytes / (1024 * 1024)).toFixed(0);
      return {
        success: false,
        error: `File size (${(params.fileSizeBytes / (1024 * 1024)).toFixed(
          2
        )} MB) exceeds maximum allowed limit of ${maxMb} MB for ${params.evidenceType}.`,
      };
    }

    // 3. File extension & declared MIME validation
    const ext = '.' + (params.originalFilename.split('.').pop() || '').toLowerCase();
    if (!limits.allowedExtensions.includes(ext)) {
      return {
        success: false,
        error: `Extension '${ext}' is not permitted for ${params.evidenceType}. Allowed: ${limits.allowedExtensions.join(
          ', '
        )}`,
      };
    }

    // Generate isolated object storage path
    const sanitizedFilename = params.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `incidents/${params.incidentId}/${params.uploader.id}/${Date.now()}_${sanitizedFilename}`;
    const bucket = 'civicconnect-evidence-vault-prod';

    // Call object storage driver to generate presigned URL without exposing cloud credentials
    const presigned = await cloudStorage.generatePresignedUploadUrl(
      bucket,
      storageKey,
      params.declaredMimeType,
      900, // 15-minute expiration
      limits.maxBytes
    );

    const sessionId = 'up-sess-' + Math.random().toString(36).substring(2, 9);
    const session: PresignedUploadSession = {
      uploadSessionId: sessionId,
      incidentId: params.incidentId,
      uploaderId: params.uploader.id,
      targetStorageKey: storageKey,
      uploadUrl: presigned.uploadUrl,
      httpMethod: presigned.httpMethod,
      expiresAt: new Date(Date.now() + 900 * 1000).toISOString(),
      maxSizeBytes: limits.maxBytes,
      allowedMimeTypes: limits.allowedMimeTypes,
    };

    this.recordAudit({
      evidenceId: 'pending',
      incidentId: params.incidentId,
      actorId: params.uploader.id,
      actorRole: params.uploader.role,
      actorName: `${params.uploader.firstName} ${params.uploader.lastName}`,
      action: 'UPLOAD_REQUESTED',
      details: `Presigned upload ticket generated for ${params.originalFilename} (${params.fileSizeBytes} bytes).`,
    });

    return { success: true, session };
  }

  // ==========================================
  // 4 & 5. INGESTION, MAGIC BYTES, HASH & DUPLICATE CHECK
  // ==========================================
  public async ingestAndVerifyEvidence(params: {
    incidentId: string;
    uploader: User;
    originalFilename: string;
    declaredMimeType: string;
    evidenceType: EvidenceMediaType;
    fileData: Uint8Array | ArrayBuffer | string;
    capturedTimestamp?: string;
    geoMetadata?: GeographicMetadata;
  }): Promise<{ success: boolean; evidence?: EvidenceRecord; duplicateDetected?: boolean; error?: string }> {
    let bytes: Uint8Array;
    if (typeof params.fileData === 'string') {
      bytes = new TextEncoder().encode(params.fileData);
    } else if (params.fileData instanceof ArrayBuffer) {
      bytes = new Uint8Array(params.fileData);
    } else {
      bytes = params.fileData;
    }

    const fileSizeBytes = bytes.byteLength;
    const limits = FILE_LIMITS[params.evidenceType];

    // File size guard
    if (fileSizeBytes > limits.maxBytes) {
      return { success: false, error: 'File size exceeds allowed maximum.' };
    }

    // INSPECT MAGIC BYTES (Do not trust client-declared MIME type)
    const magicCheck = inspectMagicBytes(bytes, params.declaredMimeType);
    if (!magicCheck.isValid) {
      this.recordAudit({
        evidenceId: 'rejected',
        incidentId: params.incidentId,
        actorId: params.uploader.id,
        actorRole: params.uploader.role,
        actorName: `${params.uploader.firstName} ${params.uploader.lastName}`,
        action: 'MAGIC_BYTES_INSPECTED',
        details: `Rejected spoofed payload: ${magicCheck.reason}`,
      });
      return { success: false, error: `File verification failed: ${magicCheck.reason}` };
    }

    // GENERATE CRYPTOGRAPHIC HASHES (SHA-256)
    const { sha256, md5 } = await computeHashes(bytes);

    // DUPLICATE FILE DETECTION
    if (this.hashToEvidenceId.has(sha256)) {
      const existingId = this.hashToEvidenceId.get(sha256)!;
      const existingEvidence = this.evidenceStore.get(existingId);

      this.recordAudit({
        evidenceId: existingId,
        incidentId: params.incidentId,
        actorId: params.uploader.id,
        actorRole: params.uploader.role,
        actorName: `${params.uploader.firstName} ${params.uploader.lastName}`,
        action: 'DUPLICATE_DETECTED',
        details: `Duplicate file detected with identical SHA-256: ${sha256} (matches evidence ${existingId}).`,
      });

      return {
        success: false,
        duplicateDetected: true,
        error: `Duplicate Evidence Detected: This exact binary file (SHA-256: ${sha256.substring(
          0,
          12
        )}...) was already submitted in ticket ${existingEvidence?.incidentId || existingId}.`,
      };
    }

    // PERSIST TO OBJECT STORAGE DRIVER
    const storageKey = `incidents/${params.incidentId}/${params.uploader.id}/${Date.now()}_${params.originalFilename.replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    )}`;
    const bucket = 'civicconnect-evidence-vault-prod';

    const storageRef = await cloudStorage.putObject(
      bucket,
      storageKey,
      bytes,
      magicCheck.detectedMimeType,
      {
        uploaderId: params.uploader.id,
        incidentId: params.incidentId,
        sha256,
      }
    );

    const evidenceId = 'ev-' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    const record: EvidenceRecord = {
      id: evidenceId,
      incidentId: params.incidentId,
      uploaderId: params.uploader.id,
      uploaderEmail: params.uploader.email,
      uploaderName: `${params.uploader.firstName} ${params.uploader.lastName}`,
      uploaderRole: params.uploader.role,
      evidenceType: params.evidenceType,
      storageRef,
      sha256Hash: sha256,
      md5Checksum: md5,
      fileMetadata: {
        originalFilename: params.originalFilename,
        fileSizeBytes,
        declaredMimeType: params.declaredMimeType,
        detectedMimeType: magicCheck.detectedMimeType,
        extension: '.' + (params.originalFilename.split('.').pop() || '').toLowerCase(),
        imageDimensions: params.evidenceType === 'IMAGE' ? { width: 3840, height: 2160 } : undefined,
      },
      geoMetadata: params.geoMetadata,
      validationStatus: 'VALIDATED',
      validationScore: 0.95,
      verificationStatus: 'UNVERIFIED',
      capturedTimestamp: params.capturedTimestamp || now,
      uploadTimestamp: now,
      updatedTimestamp: now,
    };

    this.evidenceStore.set(evidenceId, record);
    this.hashToEvidenceId.set(sha256, evidenceId);

    this.recordAudit({
      evidenceId,
      incidentId: params.incidentId,
      actorId: params.uploader.id,
      actorRole: params.uploader.role,
      actorName: `${params.uploader.firstName} ${params.uploader.lastName}`,
      action: 'FILE_INGESTED',
      details: `Evidence ingested: ${params.originalFilename} (${fileSizeBytes} bytes, SHA-256: ${sha256.substring(
        0,
        10
      )}...).`,
    });

    return { success: true, evidence: record };
  }

  // ==========================================
  // 6 & 7. EVIDENCE ACCESS AUTHORIZATION & SIGNED DOWNLOAD URLS
  // ==========================================
  public async getSignedEvidenceAccessUrl(params: {
    evidenceId: string;
    requestingUser: User;
    expiresInSeconds?: number;
  }): Promise<{ success: boolean; access?: SignedAccessUrlResponse; error?: string }> {
    const evidence = this.evidenceStore.get(params.evidenceId);
    if (!evidence) {
      return { success: false, error: 'Evidence record not found.' };
    }

    const { requestingUser } = params;

    // RBAC Authorization Check:
    // - CITIZEN: Can only access their own evidence or verified public resolution evidence
    // - AUTHORITY_OFFICER, ADMIN, FIELD_WORKER: Can access incident evidence for authorized municipal workflows
    const isOwner = evidence.uploaderId === requestingUser.id;
    const isMunicipalStaff =
      requestingUser.role === 'AUTHORITY_OFFICER' ||
      requestingUser.role === 'ADMIN' ||
      requestingUser.role === 'FIELD_WORKER';

    if (!isOwner && !isMunicipalStaff) {
      this.recordAudit({
        evidenceId: evidence.id,
        incidentId: evidence.incidentId,
        actorId: requestingUser.id,
        actorRole: requestingUser.role,
        actorName: `${requestingUser.firstName} ${requestingUser.lastName}`,
        action: 'ACCESS_SIGNED_URL_ISSUED',
        details: `DENIED unauthorized signed URL request from user ${requestingUser.id}.`,
      });
      return { success: false, error: 'Access Denied: You do not have permission to view this evidentiary object.' };
    }

    const expirySeconds = params.expiresInSeconds || 300; // Default 5 minutes
    const signed = await cloudStorage.generateSignedDownloadUrl(
      evidence.storageRef.bucket,
      evidence.storageRef.storageKey,
      expirySeconds
    );

    const watermarkToken = `SEC-WM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    this.recordAudit({
      evidenceId: evidence.id,
      incidentId: evidence.incidentId,
      actorId: requestingUser.id,
      actorRole: requestingUser.role,
      actorName: `${requestingUser.firstName} ${requestingUser.lastName}`,
      action: 'ACCESS_SIGNED_URL_ISSUED',
      details: `Temporary signed URL generated (valid for ${expirySeconds}s) for user ${requestingUser.email}.`,
    });

    return {
      success: true,
      access: {
        evidenceId: evidence.id,
        storageKey: evidence.storageRef.storageKey,
        signedUrl: signed.signedUrl,
        expiresAt: signed.expiresAt,
        readOnly: true,
        watermarkToken,
      },
    };
  }

  // ==========================================
  // RETRIEVAL & LIFECYCLE QUERIES
  // ==========================================
  public getEvidenceById(id: string): EvidenceRecord | undefined {
    return this.evidenceStore.get(id);
  }

  public getEvidenceByIncident(incidentId: string): EvidenceRecord[] {
    return Array.from(this.evidenceStore.values()).filter((e) => e.incidentId === incidentId);
  }

  public getAllEvidence(): EvidenceRecord[] {
    return Array.from(this.evidenceStore.values());
  }

  public updateVerificationStatus(
    evidenceId: string,
    verificationStatus: 'AI_VERIFIED' | 'OFFICER_CONFIRMED' | 'REJECTED',
    notes: string,
    actor: User
  ): { success: boolean; evidence?: EvidenceRecord; error?: string } {
    const ev = this.evidenceStore.get(evidenceId);
    if (!ev) return { success: false, error: 'Evidence not found' };

    ev.verificationStatus = verificationStatus;
    ev.verificationNotes = notes;
    ev.updatedTimestamp = new Date().toISOString();

    this.recordAudit({
      evidenceId,
      incidentId: ev.incidentId,
      actorId: actor.id,
      actorRole: actor.role,
      actorName: `${actor.firstName} ${actor.lastName}`,
      action: 'VERIFICATION_STATUS_CHANGED',
      details: `Verification changed to ${verificationStatus}: ${notes}`,
    });

    return { success: true, evidence: ev };
  }
}

export const evidenceManager = new EvidenceManagementService();
