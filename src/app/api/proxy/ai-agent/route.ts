/**
 * Proxy route: /api/proxy/ai-agent/[...path]
 *
 * Forwards browser-side requests to the AI Agent Service (FastAPI, port 8001).
 * Avoids CORS issues by keeping all cross-origin calls server-side.
 *
 * Usage (from api-client.ts):
 *   fetch('/api/proxy/ai-agent/api/scrutiny/analyze', { method: 'POST', body: ... })
 *   → forwarded to AI_AGENT_SERVICE_URL/api/scrutiny/analyze
 */

import { NextRequest, NextResponse } from 'next/server';

const AI_AGENT_SERVICE_URL =
  process.env.AI_AGENT_SERVICE_URL || 'http://localhost:8001';

async function proxyRequest(req: NextRequest): Promise<NextResponse> {
  // Strip the /api/proxy/ai-agent prefix to get the downstream path
  const url = new URL(req.url);
  const downstreamPath = url.pathname.replace(/^\/api\/proxy\/ai-agent/, '');
  const targetUrl = `${AI_AGENT_SERVICE_URL}${downstreamPath}${url.search}`;

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
      // 60 s — AI multi-agent pipelines can be slow
      signal: AbortSignal.timeout(60_000),
    });

    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'AI Agent Service unreachable', detail: message },
      { status: 503 }
    );
  }
}

export async function GET(req: NextRequest) { return proxyRequest(req); }
export async function POST(req: NextRequest) { return proxyRequest(req); }
export async function PUT(req: NextRequest) { return proxyRequest(req); }
export async function DELETE(req: NextRequest) { return proxyRequest(req); }
