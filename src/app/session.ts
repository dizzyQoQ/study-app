import { createContext, useContext } from "react";
import type {
  AchievementDoc,
  FeedDoc,
  GroupDoc,
  MemberDoc,
  PetDoc,
  PlanDoc,
  ProgressDoc,
  UserDoc,
} from "../lib/domain/types";
import type { AppRepository } from "../lib/repos/types";

export interface SessionValue {
  repo: AppRepository;
  user: UserDoc;
  groups: GroupDoc[];
  group: GroupDoc | null;
  pet: PetDoc | null;
  plan: PlanDoc | null;
  members: MemberDoc[];
  progressByUser: Record<string, ProgressDoc[]>;
  feed: FeedDoc[];
  unread: number;
  achievements: AchievementDoc[];
  online: boolean;
  cloud: boolean;
  refresh: () => Promise<void>;
  selectGroupId: (groupId: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("Session missing");
  return ctx;
}
