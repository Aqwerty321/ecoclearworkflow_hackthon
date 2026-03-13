/**
 * Proxy route: /api/proxy/gis/[...path]
 *
 * Forwards browser-side requests to the GIS Service (FastAPI, port 8002).
 * Avoids CORS issues by keeping all cross-origin calls server-side.
 *
 * Usage (from api-client.ts):
 *   fetch('/api/proxy/gis/api/gis/proximity', { method: 'POST', body: ... })
 *   → forwarded to GIS_SERVICE_URL/api/gis/proximity
 */

import { NextRequest, NextResponse } from 'next/server';

const GIS_SERVICE_URL =
  process.env.GIS_SERVICE_URL || 'http://localhost:8002';

async function proxyRequest(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const downstreamPath = url.pathname.replace(/^\/api\/proxy\/gis/, '');
  const targetUrl = `${GIS_SERVICE_URL}${downstreamPath}${url.search}`;

  try {
    const body = req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.text()
      : undefined;

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(30_000),
    });

    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'GIS Service unreachable', detail: message },
      { status: 503 }
    );
  }
}

export async function GET(req: NextRequest) { return proxyRequest(req); }
export async function POST(req: NextRequest) { return proxyRequest(req); }
export async function PUT(req: NextRequest) { return proxyRequest(req); }
export async function DELETE(req: NextRequest) { return proxyRequest(req); }
