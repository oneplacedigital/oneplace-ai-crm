/**
 * Shared TypeScript contracts between @oneplace/api and @oneplace/web.
 * Mirrors Prisma enums so the frontend doesn't need to import @prisma/client.
 */

// --- Enums ---------------------------------------------------------------

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  MANAGER: 'MANAGER',
  COUNSELOR: 'COUNSELOR',
  VIEWER: 'VIEWER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const LeadStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  PROPOSAL_SENT: 'PROPOSAL_SENT',
  NEGOTIATION: 'NEGOTIATION',
  WON: 'WON',
  LOST: 'LOST',
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const ApprovalStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const LeadSource = {
  META_ADS: 'META_ADS',
  GOOGLE_ADS: 'GOOGLE_ADS',
  ORGANIC_SEARCH: 'ORGANIC_SEARCH',
  REFERRAL: 'REFERRAL',
  WALK_IN: 'WALK_IN',
  WEBSITE_FORM: 'WEBSITE_FORM',
  WHATSAPP: 'WHATSAPP',
  PHONE_CALL: 'PHONE_CALL',
  IMPORT: 'IMPORT',
  MANUAL: 'MANUAL',
  OTHER: 'OTHER',
} as const;
export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];

export const ActivityType = {
  NOTE: 'NOTE',
  CALL: 'CALL',
  WHATSAPP_SENT: 'WHATSAPP_SENT',
  WHATSAPP_RECEIVED: 'WHATSAPP_RECEIVED',
  EMAIL_SENT: 'EMAIL_SENT',
  EMAIL_RECEIVED: 'EMAIL_RECEIVED',
  DEMO_SCHEDULED: 'DEMO_SCHEDULED',
  DEMO_COMPLETED: 'DEMO_COMPLETED',
  STATUS_CHANGE: 'STATUS_CHANGE',
  ASSIGNMENT_CHANGE: 'ASSIGNMENT_CHANGE',
  PAYMENT_LOGGED: 'PAYMENT_LOGGED',
  AI_SUGGESTION: 'AI_SUGGESTION',
  SYSTEM: 'SYSTEM',
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

// --- Pipeline ordering & display ----------------------------------------

export const PIPELINE_STAGES: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'NEW', label: 'New Lead', color: '#94A3B8' },
  { status: 'CONTACTED', label: 'Contacted', color: '#60A5FA' },
  { status: 'QUALIFIED', label: 'Qualified', color: '#A78BFA' },
  { status: 'PROPOSAL_SENT', label: 'Proposal Sent', color: '#F59E0B' },
  { status: 'NEGOTIATION', label: 'Negotiation', color: '#FB923C' },
  { status: 'WON', label: 'Won', color: '#16A34A' },
  { status: 'LOST', label: 'Lost', color: '#EF4444' },
];

/** Meta Conversion API event mapping - generic sales funnel */
export const META_EVENT_MAP: Record<LeadStatus, string | null> = {
  NEW: 'Lead',
  CONTACTED: 'Contact',
  QUALIFIED: 'QualifiedLead',
  PROPOSAL_SENT: 'InitiateCheckout',
  NEGOTIATION: 'AddPaymentInfo',
  WON: 'Purchase',
  LOST: null,
};

// --- DTOs ----------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  brandColor?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterTenantRequest {
  tenantName: string;
  tenantSlug: string;
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  password: string;
}

export interface CreateLeadRequest {
  fullName: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  city?: string;
  source?: LeadSource;
  sourceDetail?: string;
  courseId?: string;
  assignedToId?: string;
  notes?: string;
  budgetInr?: number;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {
  status?: LeadStatus;
  priority?: number;
  nextFollowUpAt?: string | null;
  lostReason?: string;
}

export interface LeadListQuery {
  page?: number;
  pageSize?: number;
  status?: LeadStatus;
  source?: LeadSource;
  assignedToId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'score' | 'priority';
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

export interface CounselorStats {
  counselorId: string;
  counselorName: string;
  totalLeads: number;
  byStatus: Record<LeadStatus, number>;
  conversionRate: number;
  followUpsDue: number;
}
