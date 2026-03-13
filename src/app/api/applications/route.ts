import { NextRequest, NextResponse } from 'next/server';
import { canAccessApplication, filterApplicationsByAccess, type User, type Application } from '@/lib/types';

/**
 * POST /api/applications
 *
 * Server-side ABAC-filtered application listing endpoint.
 * User identity is read from the `Authorization: Bearer <base64-json-user>`
 * header (demo token scheme). Falls back to request body for backwards
 * compatibility with direct API calls during development.
 *
 * In production the Bearer token would be a signed JWT validated against
 * Firebase Auth / session cookie — never a client-supplied User object.
 *
 * Body (optional fallback): {
 *   user?: User,
 *   applications: Application[],
 *   statusFilter?: string[]
 * }
 */

function decodeUserFromHeader(request: NextRequest): User | null {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    // Validate minimal shape
    if (decoded?.id && decoded?.role) return decoded as User;
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Prefer Authorization header; fall back to body for dev convenience
    const user: User | null = decodeUserFromHeader(request) ?? body.user ?? null;
    const { applications, statusFilter } = body as {
      applications: Application[];
      statusFilter?: string[];
    };

    if (!user || !applications) {
      return NextResponse.json(
        { error: 'User identity (Authorization header or body.user) and "applications" are required.' },
        { status: 400 }
      );
    }

    // Apply ABAC filtering
    let filtered = filterApplicationsByAccess(user, applications);

    // Apply optional status filter
    if (statusFilter && statusFilter.length > 0) {
      filtered = filtered.filter(app => statusFilter.includes(app.status));
    }

    return NextResponse.json({
      total: applications.length,
      accessible: filtered.length,
      filtered: statusFilter ? filtered.length : null,
      applications: filtered,
      policy: {
        role: user.role,
        assignedSectors: user.assignedSectors || [],
        assignedDistrict: user.assignedDistrict || null,
      },
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to evaluate application access.' },
      { status: 500 }
    );
  }
}
