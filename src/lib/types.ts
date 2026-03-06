
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
  riskSummary?: string;
}

export interface Document {
  id: string;
  applicationId: string;
  name: string;
  type: string;
  fileUrl: string;
  uploadedAt: string;
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
