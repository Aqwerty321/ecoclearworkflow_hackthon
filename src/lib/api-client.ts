/**
 * API Client utility for communicating with Python microservices.
 *
 * Routes requests to:
 *   - AI Agent Service (port 8001): Scrutiny analysis, EDS generation, compliance checks
 *   - GIS Service (port 8002): Proximity analysis, buffer computation, intersection checks
 *
 * Falls back to Next.js API routes when Python services are unavailable
 * (e.g., during development without Docker).
 */

// Service base URLs — configurable via environment or defaults for local dev
const AI_AGENT_URL =
  typeof window === 'undefined'
    ? process.env.AI_AGENT_SERVICE_URL || 'http://localhost:8001'
    : '/api/proxy/ai-agent'; // In browser, proxy through Next.js to avoid CORS

const GIS_SERVICE_URL =
  typeof window === 'undefined'
    ? process.env.GIS_SERVICE_URL || 'http://localhost:8002'
    : '/api/proxy/gis';

// ─────────────────────── Generic Fetch Helper ─────────────────────────

interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  source: 'ai-agent' | 'gis-service' | 'fallback';
}

async function fetchService<T>(
  url: string,
  options: RequestInit = {},
  source: 'ai-agent' | 'gis-service' = 'ai-agent',
  timeoutMs: number = 30000
): Promise<ServiceResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      return { data: null, error: `HTTP ${response.status}: ${errorBody}`, source };
    }

    const data = (await response.json()) as T;
    return { data, error: null, source };
  } catch (err: unknown) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('aborted')) {
      return { data: null, error: `Request timeout (${timeoutMs}ms)`, source };
    }
    return { data: null, error: message, source };
  }
}

// ─────────────────────── AI Agent Service APIs ────────────────────────

export interface ScrutinyAnalysisRequest {
  application_id: string;
  project_name: string;
  industry_sector: string;
  category: 'A' | 'B1' | 'B2';
  project_description: string;
  location?: string;
  district?: string;
  coordinates?: { lat: number; lng: number };
  document_texts?: string[];
}

export interface ComplianceIssue {
  parameter: string;
  requirement: string;
  finding: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  regulation_reference?: string;
}

export interface ScrutinyAnalysisResponse {
  application_id: string;
  overall_risk: 'critical' | 'high' | 'medium' | 'low';
  compliance_score: number;
  summary: string;
  compliance_issues: ComplianceIssue[];
  missing_documents: string[];
  recommendations: string[];
  requires_eds: boolean;
  agent_trace: string[];
  reflector_quality_score?: number;
  reflector_adjustments: string[];
}

export async function runScrutinyAnalysis(
  request: ScrutinyAnalysisRequest
): Promise<ServiceResponse<ScrutinyAnalysisResponse>> {
  return fetchService<ScrutinyAnalysisResponse>(
    `${AI_AGENT_URL}/api/scrutiny/analyze`,
    { method: 'POST', body: JSON.stringify(request) },
    'ai-agent',
    60000 // 60s timeout for multi-agent pipeline
  );
}

export interface EDSDraftRequest {
  application_id: string;
  project_name: string;
  applicant_name?: string;
  industry_sector: string;
  category: 'A' | 'B1' | 'B2';
  compliance_issues?: ComplianceIssue[];
  missing_documents?: string[];
  additional_context?: string;
}

export interface EDSDraftResponse {
  application_id: string;
  eds_letter: string;
  subject_line: string;
  required_actions: string[];
  response_deadline_days: number;
}

export async function generateEDSDraft(
  request: EDSDraftRequest
): Promise<ServiceResponse<EDSDraftResponse>> {
  return fetchService<EDSDraftResponse>(
    `${AI_AGENT_URL}/api/eds/generate`,
    { method: 'POST', body: JSON.stringify(request) },
    'ai-agent',
    30000
  );
}

export interface ComplianceCheckRequest {
  industry_sector: string;
  category: 'A' | 'B1' | 'B2';
  project_description: string;
  parameters?: Record<string, string>;
}

export interface ComplianceCheckResponse {
  sector: string;
  category: string;
  compliance_score: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  checks: Array<{ parameter: string; status: string; category: string }>;
  missing_parameters: string[];
  applicable_regulations: string[];
}

export async function checkCompliance(
  request: ComplianceCheckRequest
): Promise<ServiceResponse<ComplianceCheckResponse>> {
  return fetchService<ComplianceCheckResponse>(
    `${AI_AGENT_URL}/api/compliance/check`,
    { method: 'POST', body: JSON.stringify(request) },
    'ai-agent'
  );
}

// ─────────────────────── GIS Service APIs ─────────────────────────────

export interface ProximityRequest {
  lat: number;
  lng: number;
  category?: string;
  buffer_km?: number;
}

export interface ZoneProximity {
  zone_id: string;
  zone_name: string;
  zone_type: string;
  distance_km: number;
  within_zone: boolean;
  within_buffer: boolean;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export interface ProximityResponse {
  lat: number;
  lng: number;
  nearest_zone: string | null;
  nearest_distance_km: number | null;
  overall_risk: 'critical' | 'high' | 'medium' | 'low';
  zone_results: ZoneProximity[];
  total_zones_checked: number;
  zones_within_buffer: number;
  recommendation: string;
}

export async function analyzeProximity(
  request: ProximityRequest
): Promise<ServiceResponse<ProximityResponse>> {
  return fetchService<ProximityResponse>(
    `${GIS_SERVICE_URL}/api/gis/proximity`,
    { method: 'POST', body: JSON.stringify(request) },
    'gis-service'
  );
}

export interface BufferRequest {
  lat: number;
  lng: number;
  buffer_km: number;
}

export interface BufferResponse {
  center: { lat: number; lng: number };
  buffer_km: number;
  buffer_geojson: Record<string, unknown>;
  area_sq_km: number;
  intersecting_zones: string[];
}

export async function computeBuffer(
  request: BufferRequest
): Promise<ServiceResponse<BufferResponse>> {
  return fetchService<BufferResponse>(
    `${GIS_SERVICE_URL}/api/gis/buffer`,
    { method: 'POST', body: JSON.stringify(request) },
    'gis-service'
  );
}

export interface IntersectionRequest {
  geojson: Record<string, unknown>;
  category?: string;
}

export interface IntersectionResult {
  zone_id: string;
  zone_name: string;
  zone_type: string;
  intersects: boolean;
  overlap_area_sq_km: number | null;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
}

export interface IntersectionResponse {
  total_zones: number;
  intersecting_zones: number;
  overall_risk: 'critical' | 'high' | 'medium' | 'low';
  results: IntersectionResult[];
  recommendation: string;
}

export async function checkIntersection(
  request: IntersectionRequest
): Promise<ServiceResponse<IntersectionResponse>> {
  return fetchService<IntersectionResponse>(
    `${GIS_SERVICE_URL}/api/gis/intersection`,
    { method: 'POST', body: JSON.stringify(request) },
    'gis-service'
  );
}

// ─────────────────────── Satellite / NDVI Analysis ────────────────────

export interface SatelliteAnalysisRequest {
  lat: number;
  lng: number;
  buffer_km?: number;
  date_from?: string;
  date_to?: string;
}

export interface NDVIResult {
  mean_ndvi: number;
  min_ndvi: number;
  max_ndvi: number;
  std_ndvi: number;
  vegetation_class: string;
  vegetation_cover_pct: number;
}

export interface SatelliteAnalysisResponse {
  lat: number;
  lng: number;
  buffer_km: number;
  acquisition_date: string;
  satellite: string;
  cloud_cover_pct: number;
  ndvi: NDVIResult;
  land_use_breakdown: Record<string, number>;
  change_detection: {
    period: string;
    previous_ndvi: number;
    current_ndvi: number;
    change: number;
    trend: string;
    deforestation_risk: string;
  } | null;
  recommendation: string;
  data_source: string;
}

export async function analyzeSatellite(
  request: SatelliteAnalysisRequest
): Promise<ServiceResponse<SatelliteAnalysisResponse>> {
  return fetchService<SatelliteAnalysisResponse>(
    `${GIS_SERVICE_URL}/api/gis/satellite`,
    { method: 'POST', body: JSON.stringify(request) },
    'gis-service',
    30000
  );
}

// ─────────────────────── Health Checks ────────────────────────────────

export async function checkAIAgentHealth(): Promise<ServiceResponse<{ status: string }>> {
  return fetchService<{ status: string }>(
    `${AI_AGENT_URL}/health`,
    { method: 'GET' },
    'ai-agent',
    5000
  );
}

export async function checkGISHealth(): Promise<ServiceResponse<{ status: string }>> {
  return fetchService<{ status: string }>(
    `${GIS_SERVICE_URL}/health`,
    { method: 'GET' },
    'gis-service',
    5000
  );
}
