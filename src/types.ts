export interface LatLng {
  latitude: number;
  longitude: number;
}

export type IssueCategory = 'pothole' | 'water' | 'light' | 'garbage' | 'traffic' | 'drainage' | 'other';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'reported' | 'verified' | 'assigned' | 'in_progress' | 'resolved' | 'rejected';
export type UserRole = 'citizen' | 'officer' | 'admin';

export interface PhotoAnalysis {
  category: IssueCategory;
  severity: IssueSeverity;
  confidence: number;
  requiredAction: string;
  impactAssessment: string;
  recommendedAuthority: string;
}

export interface VerificationStatus {
  upvotes: number;
  downvotes: number;
  verifiedBy: string[]; // List of user IDs
  aiVerification: boolean;
}

export interface TimelineEvent {
  reportedAt: string; // ISO String
  verifiedAt?: string;
  assignedAt?: string;
  startedAt?: string;
  resolvedAt?: string;
  estimatedCompletionTime?: string;
}

export interface IssueUpdate {
  timestamp: string; // ISO String
  status: IssueStatus;
  message: string;
  byRole: 'citizen' | 'officer' | 'system';
  attachment?: string;
}

export interface ImpactMetrics {
  peopleAffected: number;
  priorityScore: number;
  preventedAccidents: number;
  financialSaved?: number; // Estimated savings from preventive repairs
  carbonSaved?: number; // Estimated kg of carbon saved
}

export interface Issue {
  id: string;
  reporterId: string;
  reporterName: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  location: LatLng;
  address: string;
  photoUrl: string; // Base64 or URL
  photoAnalysis?: PhotoAnalysis;
  assignedDepartment?: string;
  assignedOfficer?: string;
  verificationStatus: VerificationStatus;
  timeline: TimelineEvent;
  updates: IssueUpdate[];
  impactMetrics: ImpactMetrics;
  resolvedPhotoUrl?: string; // Photo uploaded by officer of repaired state
  voiceUrl?: string; // Base64 Audio data URI containing real recorded voice note
  gpsVerified?: boolean;
  gpsMismatchDistance?: number;
  isPendingConsensus?: boolean;
  citizenSignoffsCount?: number;
  resolutionAudit?: {
    verifiedCount: number;
    disputedCount: number;
    verifiedBy: string[];
    disputedBy: string[];
    feedbackComments?: {
      userId: string;
      userName: string;
      userAvatar: string;
      text: string;
      timestamp: string;
      type: 'praise' | 'concern';
    }[];
  };
  tags: string[];
  relatedIssues?: string[];
  aiAudit?: {
    engineeringAssessment: string;
    patchSteps: string[];
    slaFailureRisk: 'low' | 'medium' | 'high';
    requiredSubunit: string;
  };
}

export interface UserStats {
  issuesReported: number;
  issuesResolved: number;
  verifications: number;
  points: number;
  badges: string[];
}

export interface ClaimedVoucher {
  id: string;
  rewardId: string;
  rewardName: string;
  cost: number;
  redeemedAt: string;
  voucherCode: string;
  status: 'active' | 'used';
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: UserRole;
  department?: string; // PWD, Water, Electricity, Traffic, Sanitation
  joinedAt: string;
  stats: UserStats;
  claimedVouchers?: ClaimedVoucher[];
  claimedQuests?: string[];
  assignedCity?: string;
  assignedLocation?: LatLng;
}

export interface DepartmentStats {
  issuesAssigned: number;
  issuesResolved: number;
  avgResolutionTime: number; // in hours
  satisfactionRating: number; // 1 to 5
  responseRate: number; // Percentage (0-100)
}

export interface Department {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  stats: DepartmentStats;
  sla: {
    responseTimeHours: number;
    resolutionTimeDays: number;
  };
}

export interface PredictZone {
  areaName: string;
  lat: number;
  lng: number;
  confidence: number;
  prediction: string;
  reason: string;
}

export interface AnalyticsSummary {
  issuesCreated: number;
  issuesResolved: number;
  categoryDistribution: Record<string, number>;
  severityDistribution: Record<string, number>;
  departmentPerformance: Record<string, { assigned: number; resolved: number; avgTime: number }>;
  predictions: PredictZone[];
}
