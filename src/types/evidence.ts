import { UserRole } from './auth';

export type EvidenceMediaType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';

export type EvidenceValidationStatus =
  | 'PENDING_VALIDATION'
  | 'VALIDATED'
  | 'FLAGGED_MANIPULATED'
  | 'CORRUPTED'
  | 'DUPLICATE_REJECTED';

export type EvidenceVerificationStatus =
  | 'UNVERIFIED'
  | 'AI_VERIFIED'
  | 'OFFICER_CONFIRMED'
  | 'REJECTED';

export interface StorageObjectReference {
  bucket: string;
  storageKey: string;
  storageProvider: 'LOCAL_EMULATOR' | 'GOOGLE_CLOUD_STORAGE' | 'AWS_S3';
  contentLengthBytes: number;
  storedMimeType: string;
}

export interface GeographicMetadata {
  latitude?: number;
  longitude?: number;
  altitudeMeters?: number;
  accuracyMeters?: number;
  geotagSource: 'EXIF_GPS' | 'DEVICE_SENSORS' | 'MANUAL_DECLARED';
}

export interface FileTechnicalMetadata {
  originalFilename: string;
  fileSizeBytes: number;
  declaredMimeType: string;
  detectedMimeType: string;
  extension: string;
  imageDimensions?: { width: number; height: number };
  durationSeconds?: number;
  audioChannels?: number;
  exifDeviceModel?: string;
}

export interface EvidenceRecord {
  id: string;
  incidentId: string;
  uploaderId: string;
  uploaderEmail: string;
  uploaderName: string;
  uploaderRole: UserRole | 'SYSTEM';
  evidenceType: EvidenceMediaType;
  
  // Storage layer reference (Never contains raw storage credentials)
  storageRef: StorageObjectReference;
  
  // Cryptographic identity
  sha256Hash: string;
  md5Checksum: string;
  
  // Technical & Geospatial metadata
  fileMetadata: FileTechnicalMetadata;
  geoMetadata?: GeographicMetadata;
  
  // Validation & Cognitive Verification
  validationStatus: EvidenceValidationStatus;
  validationScore: number; // 0.0 - 1.0 (integrity, quality, clarity)
  verificationStatus: EvidenceVerificationStatus;
  verificationNotes?: string;
  
  // Timestamps
  capturedTimestamp: string;
  uploadTimestamp: string;
  updatedTimestamp: string;
}

export interface PresignedUploadSession {
  uploadSessionId: string;
  incidentId: string;
  uploaderId: string;
  expectedHashSha256?: string;
  targetStorageKey: string;
  uploadUrl: string;
  httpMethod: 'PUT' | 'POST';
  expiresAt: string;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
}

export interface SignedAccessUrlResponse {
  evidenceId: string;
  storageKey: string;
  signedUrl: string;
  expiresAt: string;
  readOnly: boolean;
  watermarkToken?: string;
}

export interface EvidenceAuditRecord {
  id: string;
  evidenceId: string;
  incidentId: string;
  timestamp: string;
  actorId: string;
  actorRole: UserRole | 'SYSTEM';
  actorName: string;
  action:
    | 'UPLOAD_REQUESTED'
    | 'FILE_INGESTED'
    | 'MAGIC_BYTES_INSPECTED'
    | 'HASH_VERIFIED'
    | 'DUPLICATE_CHECK_PASSED'
    | 'DUPLICATE_DETECTED'
    | 'ACCESS_SIGNED_URL_ISSUED'
    | 'VERIFICATION_STATUS_CHANGED'
    | 'EVIDENCE_DELETED';
  clientIp?: string;
  userAgent?: string;
  details: string;
}
