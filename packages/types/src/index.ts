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
  INTERESTED: 'INTERESTED',
  QUALIFIED: 'QUALIFIED',
  DEMO_SCHEDULED: 'DEMO_SCHEDULED',
  DEMO_COMPLETED: 'DEMO_COMPLETED',
  ADMISSION_CONFIRMED: 'ADMISSION_CONFIRMED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  LOST: 'LOST',
  COLD: 'COLD',
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

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
  { status: 'INTERESTED', label: 'Interested', color: '#38BDF8' },
  { status: 'QUALIFIED', label: 'Qualified', color: '#A78BFA' },
  { status: 'DEMO_SCHEDULED', label: 'Demo Booked', color: '#F59E0B' },
  { status: 'DEMO_COMPLETED', label: 'Demo Done', color: '#FB923C' },
  { status: 'ADMISSION_CONFIRMED', label: 'Admission Confirmed', color: '#22C55E' },
  { status: 'PAYMENT_COMPLETED', label: 'Paid / Enrolled', color: '#16A34A' },
];

/** Meta Conversion API event mapping (from PRD) */
export const META_EVENT_MAP: Record<LeadStatus, string | null> = {
  NEW: 'Lead',
  CONTACTED: 'Contact',
  INTERESTED: 'Contact',
  QUALIFIED: 'QualifiedLead',
  DEMO_SCHEDULED: 'Schedule',
  DEMO_COMPLETED: 'Schedule',
  ADMISSION_CONFIRMED: 'Purchase',
  PAYMENT_COMPLETED: 'Purchase',
  LOST: null,
  COLD: null,
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
  conversionRate: number; // 0..1
  followUpsDue: number;
}
