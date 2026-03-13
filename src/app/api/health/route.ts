import { NextResponse } from 'next/server';

const AI_AGENT_URL = process.env.AI_AGENT_SERVICE_URL || 'http://localhost:8001';
const GIS_URL = process.env.GIS_SERVICE_URL || 'http://localhost:8002';

async function pingService(url: string): Promise<'operational' | 'unavailable'> {
  try {
    const res = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok ? 'operational' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export async function GET() {
  const [aiStatus, gisStatus] = await Promise.all([
    pingService(AI_AGENT_URL),
    pingService(GIS_URL),
  ]);

  const allOk = aiStatus === 'operational' && gisStatus === 'operational';

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      services: {
        api: 'operational',
        ai_agent: aiStatus,
        gis: gisStatus,
        crypto: 'operational',
      },
      features: [
        'RBAC-ABAC access control',
        'UPI payment integration',
        'CRDT collaborative editing',
        'SHA-256 document hashing',
        'GIS eco-zone proximity analysis',
        'AI regulatory compliance check',
        'AI EDS draft generation',
      ],
    },
    { status: allOk ? 200 : 207 }
  );
}
