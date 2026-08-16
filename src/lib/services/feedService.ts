import type { FeedDoc, FeedType } from "../domain/types";
import type { AppRepository } from "../repos/types";
import { newId } from "../repos/types";

export async function addFeedItem(
  repo: AppRepository,
  params: {
    groupId: string;
    type: FeedType;
    uid: string;
    planId?: string;
    nodeId?: string;
    evidenceId?: string;
    petLevel?: number;
    achievementId?: string;
  },
): Promise<FeedDoc> {
  const doc: FeedDoc = {
    id: newId("feed"),
    groupId: params.groupId,
    type: params.type,
    uid: params.uid,
    likeUids: [],
    createdAt: repo.now(),
  };
  if (params.planId) doc.planId = params.planId;
  if (params.nodeId) doc.nodeId = params.nodeId;
  if (params.evidenceId) doc.evidenceId = params.evidenceId;
  if (params.petLevel != null) doc.petLevel = params.petLevel;
  if (params.achievementId) doc.achievementId = params.achievementId;
  await repo.addFeed(doc);
  return doc;
}

export async function toggleLike(repo: AppRepository, groupId: string, feedId: string, uid: string) {
  const list = await repo.listFeed(groupId);
  const item = list.find((f) => f.id === feedId);
  if (!item) throw new Error("找不到這則動態。");
  const set = new Set(item.likeUids);
  if (set.has(uid)) set.delete(uid);
  else set.add(uid);
  item.likeUids = [...set];
  await repo.saveFeed(item);
  return item;
}

export function filterFeed(items: FeedDoc[], filter: "all" | "cleared" | "pet"): FeedDoc[] {
  if (filter === "cleared") return items.filter((i) => i.type === "cleared");
  if (filter === "pet") return items.filter((i) => i.type === "pet_level_up" || i.type === "achievement");
  return items;
}

export async function unreadCount(
  repo: AppRepository,
  uid: string,
  groupId: string,
): Promise<number> {
  const last = await repo.getLastRead(uid, groupId);
  const items = await repo.listFeed(groupId);
  return items.filter((i) => i.createdAt > last && i.uid !== uid).length;
}
