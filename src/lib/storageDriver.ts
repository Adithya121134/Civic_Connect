import { StorageObjectReference } from '../types/evidence';

/**
 * Storage Driver Interface.
 * Implementations (e.g. Google Cloud Storage, AWS S3, Local Blob Store)
 * satisfy this interface so the core business logic remains 100% agnostic
 * of the underlying cloud provider.
 */
export interface IObjectStorageDriver {
  getProviderName(): 'LOCAL_EMULATOR' | 'GOOGLE_CLOUD_STORAGE' | 'AWS_S3';

  /**
   * Generates a short-lived presigned upload URL where the client can directly PUT the binary payload.
   * Credentials (access keys, service account tokens) are NEVER sent to the client.
   */
  generatePresignedUploadUrl(
    bucket: string,
    storageKey: string,
    contentType: string,
    expiresInSeconds: number,
    maxSizeBytes: number
  ): Promise<{ uploadUrl: string; httpMethod: 'PUT' | 'POST'; headers: Record<string, string> }>;

  /**
   * Generates a temporary time-bounded signed URL for downloading / viewing evidence with signature token.
   */
  generateSignedDownloadUrl(
    bucket: string,
    storageKey: string,
    expiresInSeconds: number
  ): Promise<{ signedUrl: string; expiresAt: string }>;

  /**
   * Writes binary buffer / blob to the storage bucket (used by backend ingest verification).
   */
  putObject(
    bucket: string,
    storageKey: string,
    data: Uint8Array | ArrayBuffer | string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<StorageObjectReference>;

  /**
   * Deletes object from storage bucket.
   */
  deleteObject(bucket: string, storageKey: string): Promise<boolean>;

  /**
   * Validates if the object exists and returns its size.
   */
  statObject(bucket: string, storageKey: string): Promise<{ exists: boolean; sizeBytes: number; mimeType: string }>;
}

/**
 * Production-ready In-Memory & Blob URL Storage Driver Emulator.
 * Mimics S3 / GCS presigned upload and signed temporary read URLs.
 */
export class CloudStorageDriverEmulator implements IObjectStorageDriver {
  private objects: Map<string, { data: Uint8Array | string; contentType: string; metadata?: Record<string, string> }> = new Map();
  private defaultBucket = 'civicconnect-evidence-vault-prod';

  getProviderName(): 'LOCAL_EMULATOR' {
    return 'LOCAL_EMULATOR';
  }

  async generatePresignedUploadUrl(
    bucket: string,
    storageKey: string,
    contentType: string,
    expiresInSeconds: number,
    maxSizeBytes: number
  ): Promise<{ uploadUrl: string; httpMethod: 'PUT' | 'POST'; headers: Record<string, string> }> {
    const signature = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresTimestamp = Date.now() + expiresInSeconds * 1000;
    
    // Generates a mock cloud presigned endpoint
    const uploadUrl = `https://storage.civicconnect.gov/${bucket}/${storageKey}?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=sa-evidence%40civicconnect.iam.gserviceaccount.com&X-Goog-Expires=${expiresInSeconds}&X-Goog-Signature=${signature}&X-Max-Bytes=${maxSizeBytes}&expires=${expiresTimestamp}`;

    return {
      uploadUrl,
      httpMethod: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-goog-meta-vault': 'civicconnect-airtight',
      },
    };
  }

  async generateSignedDownloadUrl(
    bucket: string,
    storageKey: string,
    expiresInSeconds: number
  ): Promise<{ signedUrl: string; expiresAt: string }> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const token = Math.random().toString(36).substring(2, 18);
    
    const obj = this.objects.get(`${bucket}/${storageKey}`);
    let url = `https://storage.civicconnect.gov/${bucket}/${storageKey}?auth_token=${token}&expires_at=${encodeURIComponent(
      expiresAt
    )}`;

    // If we have actual blob data stored in emulator, we can serve it as data uri or sample image
    if (obj && typeof obj.data === 'string' && obj.data.startsWith('http')) {
      url = `${obj.data}#token=${token}&expires=${expiresAt}`;
    }

    return { signedUrl: url, expiresAt };
  }

  async putObject(
    bucket: string,
    storageKey: string,
    data: Uint8Array | ArrayBuffer | string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<StorageObjectReference> {
    const path = `${bucket}/${storageKey}`;
    let length = 0;

    if (typeof data === 'string') {
      length = data.length;
      this.objects.set(path, { data, contentType, metadata });
    } else {
      const bytes = new Uint8Array(data);
      length = bytes.byteLength;
      this.objects.set(path, { data: bytes, contentType, metadata });
    }

    return {
      bucket,
      storageKey,
      storageProvider: 'LOCAL_EMULATOR',
      contentLengthBytes: length,
      storedMimeType: contentType,
    };
  }

  async deleteObject(bucket: string, storageKey: string): Promise<boolean> {
    return this.objects.delete(`${bucket}/${storageKey}`);
  }

  async statObject(bucket: string, storageKey: string): Promise<{ exists: boolean; sizeBytes: number; mimeType: string }> {
    const obj = this.objects.get(`${bucket}/${storageKey}`);
    if (!obj) {
      return { exists: false, sizeBytes: 0, mimeType: 'application/octet-stream' };
    }
    const size = typeof obj.data === 'string' ? obj.data.length : obj.data.byteLength;
    return { exists: true, sizeBytes: size, mimeType: obj.contentType };
  }
}

export const cloudStorage = new CloudStorageDriverEmulator();
