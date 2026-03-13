/**
 * Cryptographic utilities for document integrity verification.
 * Uses the Web Crypto API (SubtleCrypto) for SHA-256 hashing.
 * 
 * This implements the "Document Provenance" concept from the upgrade plan:
 * every uploaded document gets a unique fingerprint (hash) that can be used
 * to detect any tampering after upload.
 */

/**
 * Computes the SHA-256 hash of a File or Blob using the Web Crypto API.
 * Returns the hash as a lowercase hex string.
 */
export async function computeSHA256(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifies a file against a known SHA-256 hash.
 * Returns true if the file's hash matches the expected hash.
 */
export async function verifySHA256(
  file: File | Blob,
  expectedHash: string
): Promise<boolean> {
  const actualHash = await computeSHA256(file);
  return actualHash === expectedHash.toLowerCase();
}

/**
 * Computes the SHA-256 hash of a string (e.g., document content).
 */
export async function hashString(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
