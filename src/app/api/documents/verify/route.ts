import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/documents/verify
 * 
 * Server-side document integrity verification endpoint.
 * Accepts a file upload and an expected SHA-256 hash, then verifies them.
 * 
 * This provides a tamper-detection layer: the client computes the hash
 * on upload, and this endpoint can re-verify on demand.
 * 
 * Body (FormData): 
 *   - file: File
 *   - expectedHash: string (hex-encoded SHA-256)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const expectedHash = formData.get('expectedHash') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Upload a file as FormData with key "file".' },
        { status: 400 }
      );
    }

    // Read file into ArrayBuffer and compute SHA-256
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const verified = expectedHash ? computedHash === expectedHash.toLowerCase() : null;

    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      computedHash,
      expectedHash: expectedHash || null,
      verified,
      verifiedAt: new Date().toISOString(),
      ...(verified === false && {
        warning: 'Hash mismatch detected. The file may have been tampered with since upload.',
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to verify document integrity.' },
      { status: 500 }
    );
  }
}
