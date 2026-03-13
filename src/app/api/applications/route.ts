import { NextRequest, NextResponse } from 'next/server';
import { canAccessApplication, filterApplicationsByAccess, type User, type Application } from '@/lib/types';

/**
 * POST /api/applications
 * 
 * Server-side ABAC-filtered application listing endpoint.
 * Accepts the requesting user's identity and returns only
 * applications they are authorized to access.
 * 
 * This demonstrates the server-side enforcement of the RBAC-ABAC
 * policy engine defined in types.ts. In production, the user identity
 * would come from a session/JWT, not the request body.
 * 
 * Body: {
 *   user: User,
 *   applications: Application[],
 *   statusFilter?: string[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, applications, statusFilter } = body as {
      user: User;
      applications: Application[];
      statusFilter?: string[];
    };

    if (!user || !applications) {
      return NextResponse.json(
        { error: 'Both "user" and "applications" are required in the request body.' },
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
