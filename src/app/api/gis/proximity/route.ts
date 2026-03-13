import { NextRequest, NextResponse } from 'next/server';
import { checkProximity, CATEGORY_BUFFER } from '@/lib/gis-data';

/**
 * POST /api/gis/proximity
 * 
 * Server-side GIS proximity analysis endpoint.
 * Accepts coordinates and category, returns eco-zone proximity results.
 * 
 * Body: { lat: number, lng: number, category?: "A" | "B1" | "B2" }
 * 
 * This mirrors the client-side checkProximity() but provides a
 * server-side API for future integration with Python GIS service.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, category } = body;

    // Validate input
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Invalid coordinates. lat and lng must be numbers.' },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of range. lat: -90 to 90, lng: -180 to 180.' },
        { status: 400 }
      );
    }

    const results = checkProximity(lat, lng);
    const categoryBuffer = CATEGORY_BUFFER[category || 'B2'] ?? 2;

    const highRiskZones = results.filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high');
    const isInBuffer = highRiskZones.length > 0;

    return NextResponse.json({
      coordinates: { lat, lng },
      category: category || 'B2',
      categoryBuffer: categoryBuffer,
      totalZonesChecked: results.length,
      highRiskCount: highRiskZones.length,
      isInEcoBuffer: isInBuffer,
      requiresAdditionalClearance: isInBuffer,
      proximityResults: results.slice(0, 5), // Top 5 closest zones
      allResults: results,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process proximity analysis.' },
      { status: 500 }
    );
  }
}
