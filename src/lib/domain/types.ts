export type NodeType = "daily" | "milestone" | "boss";
export type ProgressStatus =
  | "locked"
  | "available"
  | "pending_upload"
  | "pending_review"
  | "done"
  | "need_resubmit";
export type FeedType =
  | "checkin"
  | "evidence_submitted"
  | "cleared"
  | "pending_review"
  | "pet_level_up"
  | "achievement"
  | "member_joined";
export type PlanSource = "gemini" | "cache" | "template";
export type PetStage = "egg" | "hatchling" | "grown";
export type MemberRole = "owner" | "member";
export type EvidenceStatus = "pending_review" | "approved" | "need_resubmit";

export interface LevelNode {
  id: string;
  parentId: string;
  title: string;
  nodeType: NodeType;
  order: number;
  unlockRule: "previous_sibling_done";
  description?: string;
  focusMinutes?: number;
  custom?: boolean;
}

export interface LevelStage {
  id: string;
  title: string;
  order: number;
  nodes: LevelNode[];
}

export interface LevelTree {
  stages: LevelStage[];
}

export interface UserDoc {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  lastSelectedGroupId: string | null;
  createdAt: number;
}

export interface GroupDoc {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  reviewEnabled: boolean;
  currentPlanId: string | null;
  petId: string;
  archived: boolean;
  createdAt: number;
}

export interface MemberDoc {
  uid: string;
  role: MemberRole;
  joinedAt: number;
  weeklyContribution: number;
  totalContribution: number;
  weekKey: string;
  displayName: string;
  photoURL: string;
}

export interface PetDoc {
  id: string;
  groupId: string;
  name: string;
  level: number;
  xp: number;
  stage: PetStage;
  updatedAt: number;
}

export interface PlanDoc {
  id: string;
  groupId: string;
  goalText: string;
  source: PlanSource;
  cacheKey: string;
  tree: LevelTree;
  status: "active" | "archived";
  createdBy: string;
  createdAt: number;
}

export interface ProgressDoc {
  id: string;
  groupId: string;
  planId: string;
  uid: string;
  nodeId: string;
  status: ProgressStatus;
  note: string;
  completedAt: number | null;
  evidenceId: string | null;
}

export interface EvidenceDoc {
  id: string;
  groupId: string;
  planId: string;
  nodeId: string;
  uid: string;
  fileUrl: string;
  contentType: string;
  status: EvidenceStatus;
  reviewedBy: string | null;
  reviewedAt: number | null;
  createdAt: number;
}

export interface FeedDoc {
  id: string;
  groupId: string;
  type: FeedType;
  uid: string;
  planId?: string;
  nodeId?: string;
  evidenceId?: string;
  petLevel?: number;
  achievementId?: string;
  likeUids: string[];
  createdAt: number;
}

export interface GoalCacheDoc {
  sourceGoal: string;
  normalizedKey: string;
  tree: LevelTree;
  source: "gemini";
  createdAt: number;
  hitCount: number;
}

export interface AchievementDoc {
  id: string;
  groupId: string;
  achievementId: "first_feed" | "first_boss" | "level_3";
  unlockedAt: number;
  unlockedByEvent: string;
}

export const XP_DAILY = 10;
export const XP_BOSS = 50;
export const ALLOWED_EVIDENCE_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
