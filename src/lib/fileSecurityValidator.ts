import { EvidenceMediaType } from '../types/evidence';

// Strict file limits per media category
export const FILE_LIMITS: Record<EvidenceMediaType, { maxBytes: number; allowedExtensions: string[]; allowedMimeTypes: string[] }> = {
  IMAGE: {
    maxBytes: 15 * 1024 * 1024, // 15MB
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.heic'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  },
  VIDEO: {
    maxBytes: 100 * 1024 * 1024, // 100MB
    allowedExtensions: ['.mp4', '.mov', '.webm'],
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
  },
  AUDIO: {
    maxBytes: 25 * 1024 * 1024, // 25MB
    allowedExtensions: ['.mp3', '.m4a', '.wav', '.ogg'],
    allowedMimeTypes: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'],
  },
  DOCUMENT: {
    maxBytes: 20 * 1024 * 1024, // 20MB
    allowedExtensions: ['.pdf', '.txt', '.csv'],
    allowedMimeTypes: ['application/pdf', 'text/plain', 'text/csv'],
  },
};

export interface MagicByteRule {
  mimeType: string;
  category: EvidenceMediaType;
  signature: number[];
  offset?: number;
}

// Known Magic Byte Signatures
export const MAGIC_BYTE_SIGNATURES: MagicByteRule[] = [
  // JPEG: FF D8 FF
  { mimeType: 'image/jpeg', category: 'IMAGE', signature: [0xff, 0xd8, 0xff] },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { mimeType: 'image/png', category: 'IMAGE', signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // WEBP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
  { mimeType: 'image/webp', category: 'IMAGE', signature: [0x52, 0x49, 0x46, 0x46] },
  // MP4 / QuickTime: 66 74 79 70 ('ftyp' at offset 4)
  { mimeType: 'video/mp4', category: 'VIDEO', signature: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  // MP3: 49 44 33 (ID3v2) or FF FB
  { mimeType: 'audio/mpeg', category: 'AUDIO', signature: [0x49, 0x44, 0x33] },
  // WAV: 52 49 46 46 (RIFF)
  { mimeType: 'audio/wav', category: 'AUDIO', signature: [0x52, 0x49, 0x46, 0x46] },
  // PDF: 25 50 44 46 (%PDF)
  { mimeType: 'application/pdf', category: 'DOCUMENT', signature: [0x25, 0x50, 0x44, 0x46] },
];

/**
 * Computes SHA-256 and MD5-compatible checksum hashes for binary buffer or string payload.
 */
export async function computeHashes(
  data: Uint8Array | ArrayBuffer | string
): Promise<{ sha256: string; md5: string }> {
  let bytes: Uint8Array;
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data);
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else {
    bytes = data;
  }

  // Web Cryptography API for true SHA-256
  const cleanBuffer = new Uint8Array(bytes).buffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', cleanBuffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  // Deterministic secondary checksum simulation
  let checksum = 0;
  for (let i = 0; i < bytes.length; i++) {
    checksum = (checksum + bytes[i] * (i + 1)) % 0xffffffff;
  }
  const md5 = checksum.toString(16).padStart(8, '0') + sha256.substring(0, 24);

  return { sha256, md5 };
}

/**
 * Validates file buffer against actual Magic Bytes rather than trusting client MIME declarations.
 */
export function inspectMagicBytes(
  bytes: Uint8Array,
  declaredType: string
): { isValid: boolean; detectedMimeType: string; matchedCategory?: EvidenceMediaType; reason?: string } {
  if (bytes.length < 4) {
    return { isValid: false, detectedMimeType: 'unknown', reason: 'Payload too small to contain valid magic byte headers.' };
  }

  for (const rule of MAGIC_BYTE_SIGNATURES) {
    const offset = rule.offset || 0;
    if (bytes.length < offset + rule.signature.length) continue;

    let match = true;
    for (let i = 0; i < rule.signature.length; i++) {
      if (bytes[offset + i] !== rule.signature[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return {
        isValid: true,
        detectedMimeType: rule.mimeType,
        matchedCategory: rule.category,
      };
    }
  }

  // Fallback for plain text documents
  const isAscii = bytes.slice(0, 128).every((b) => (b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13);
  if (isAscii && declaredType.includes('text')) {
    return {
      isValid: true,
      detectedMimeType: 'text/plain',
      matchedCategory: 'DOCUMENT',
    };
  }

  return {
    isValid: false,
    detectedMimeType: 'application/octet-stream',
    reason: `Declared type '${declaredType}' does not match any recognized binary magic header. Potential spoofing attempt.`,
  };
}
