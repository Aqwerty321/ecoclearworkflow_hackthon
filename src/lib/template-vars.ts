/**
 * Template Variable Substitution Engine
 *
 * Replaces {{variable}} placeholders in template content with real values
 * from the application context. Supports all standard CECB document variables.
 */

import type { Application, User } from './types';

export interface TemplateVars {
  /** Application ID */
  app_id?: string;
  /** Project name */
  project_name?: string;
  /** Industry sector */
  sector?: string;
  /** Environmental clearance category (A / B1 / B2) */
  category?: string;
  /** Project description */
  description?: string;
  /** Project location */
  location?: string;
  /** District */
  district?: string;
  /** Applicant / proponent full name */
  proponent_name?: string;
  /** Proponent email */
  proponent_email?: string;
  /** CECB official name (current user) */
  officer_name?: string;
  /** Current date (formatted as dd/MM/yyyy) */
  today?: string;
  /** Current date-time */
  datetime?: string;
  /** Board name */
  board_name?: string;
}

/**
 * Build a TemplateVars map from application + user objects.
 */
export function buildTemplateVars(
  application: Application,
  proponent?: User | null,
  currentUser?: User | null
): TemplateVars {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();

  return {
    app_id: application.id,
    project_name: application.projectName,
    sector: application.industrySector,
    category: application.category,
    description: application.description,
    location: application.location ?? '',
    district: application.district ?? '',
    proponent_name: proponent?.name ?? '',
    proponent_email: proponent?.email ?? '',
    officer_name: currentUser?.name ?? '',
    today: `${dd}/${mm}/${yyyy}`,
    datetime: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    board_name: 'Chhattisgarh Environment Conservation Board (CECB)',
  };
}

/**
 * Replace all {{key}} occurrences in template content with values from vars.
 * Unknown keys are left as-is so the user can see what still needs filling.
 */
export function substituteTemplateVars(content: string, vars: TemplateVars): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key as keyof TemplateVars];
    return value !== undefined && value !== '' ? value : match;
  });
}

/**
 * List all unique {{variable}} tokens found in a template string.
 */
export function listTemplateVars(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map(m => m.slice(2, -2)))];
}
