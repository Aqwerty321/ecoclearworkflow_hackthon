
export type UserRole = 'Admin' | 'Project Proponent' | 'Scrutiny Team' | 'MoM Team';

export type ApplicationStatus = 
  | 'Draft' 
  | 'Submitted' 
  | 'UnderScrutiny' 
  | 'EDS' 
  | 'Referred' 
  | 'MoMGenerated' 
  | 'Finalized';

export type Category = 'A' | 'B1' | 'B2';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  // ABAC attributes for hybrid RBAC-ABAC access control
  assignedSectors?: string[];    // Sectors this user can access (Scrutiny/MoM)
  assignedDistrict?: string;     // Geographic jurisdiction (e.g., "Raipur", "Bilaspur")
  assignedState?: string;        // State jurisdiction (default: "Chhattisgarh")
}

export interface Application {
  id: string;
  projectName: string;
  industrySector: string;
  category: Category;
  description: string;
  applicantId: string;
  status: ApplicationStatus;
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
  updatedAt: string;
  location?: string;
  district?: string;        // District where project is located
  riskSummary?: string;
  // GIS fields
  coordinates?: {
    lat: number;
    lng: number;
  };
  siteGeoJSON?: string;     // GeoJSON polygon of project site boundary
  // Payment fields
  transactionId?: string;   // UPI transaction reference
  paidAmount?: number;       // Amount paid in INR
  paidAt?: string;           // ISO timestamp of payment
}

export interface Document {
  id: string;
  applicationId: string;
  name: string;
  type: string;
  fileUrl: string;
  uploadedAt: string;
  // Document integrity fields (SHA-256 hashing)
  sha256Hash?: string;       // Hex-encoded SHA-256 hash of the file at upload time
  fileSize?: number;         // File size in bytes at upload time
  verified?: boolean;        // Whether hash has been verified after upload
}

export interface Payment {
  id: string;
  applicationId: string;
  amount: number;
  paymentStatus: 'pending' | 'paid';
  paymentMethod: string;
  transactionId?: string;
  paidAt?: string;
}

export interface Sector {
  id: string;
  name: string;
  description: string;
}

export interface Template {
  id: string;
  templateName: string;
  content: string;
  type: 'document' | 'gist';
  category?: Category;
  createdAt: string;
  updatedAt?: string;
}

export interface EDSComment {
  id: string;
  applicationId: string;
  authorId: string;
  authorName: string;
  comment: string;
  createdAt: string;
}

export interface MinutesOfMeeting {
  id: string;
  applicationId: string;
  discussionSummary: string;
  committeeDecision: string;
  conditions: string[];
  recommendations?: string[];
  finalDocumentUrl?: string;
  finalizedAt?: string;
}

// Valid status transitions
const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  Draft: ['Submitted'],
  Submitted: ['UnderScrutiny'],
  UnderScrutiny: ['EDS', 'Referred'],
  EDS: ['Submitted'],
  Referred: ['MoMGenerated'],
  MoMGenerated: ['Finalized'],
  Finalized: [],
};

export function isValidTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface MeetingGist {
  applicationId: string;
  generatedText: string;
  editedText: string;
}

// ---- ABAC Policy Engine ----

/**
 * Evaluates whether a user can access a specific application based on
 * RBAC role + ABAC attributes (sector, district). This implements the
 * Hybrid RBAC-ABAC model from the upgrade plan.
 */
export function canAccessApplication(user: User, application: Application): boolean {
  // Admins have universal access
  if (user.role === 'Admin') return true;

  // Project Proponents can only access their own applications
  if (user.role === 'Project Proponent') {
    return application.applicantId === user.id;
  }

  // Scrutiny Team and MoM Team: check ABAC attributes
  if (user.role === 'Scrutiny Team' || user.role === 'MoM Team') {
    // If no ABAC attributes are assigned, grant access (backwards-compatible)
    const hasSectorRestriction = user.assignedSectors && user.assignedSectors.length > 0;
    const hasDistrictRestriction = !!user.assignedDistrict;

    let sectorAllowed = true;
    let districtAllowed = true;

    if (hasSectorRestriction) {
      sectorAllowed = user.assignedSectors!.includes(application.industrySector);
    }
    if (hasDistrictRestriction && application.district) {
      districtAllowed = user.assignedDistrict === application.district;
    }

    return sectorAllowed && districtAllowed;
  }

  return false;
}

/**
 * Filters a list of applications based on user ABAC attributes.
 */
export function filterApplicationsByAccess(user: User, applications: Application[]): Application[] {
  return applications.filter(app => canAccessApplication(user, app));
}

// ---- Chhattisgarh Districts ----
export const CG_DISTRICTS = [
  "Raipur", "Bilaspur", "Durg", "Korba", "Rajnandgaon",
  "Jagdalpur", "Raigarh", "Ambikapur", "Kanker", "Dhamtari",
  "Mahasamund", "Kawardha", "Janjgir-Champa", "Koriya",
  "Balod", "Baloda Bazar", "Bemetara", "Gariaband",
  "Mungeli", "Sukma", "Kondagaon", "Narayanpur",
  "Bijapur", "Balrampur", "Surajpur", "Gaurela-Pendra-Marwahi",
  "Manendragarh", "Sarangarh-Bilaigarh", "Khairagarh-Chhuikhadan-Gandai",
  "Mohla-Manpur-Ambagarh Chowki", "Sakti", "Sarangarh"
] as const;

