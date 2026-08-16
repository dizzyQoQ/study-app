import { ensureUser } from "../lib/services/groupService";
import { MemoryRepository } from "../lib/repos/memory";
import type { UserDoc } from "../lib/domain/types";

export function createRepo(): MemoryRepository {
  const repo = new MemoryRepository();
  repo.clock = Date.UTC(2026, 7, 16, 12, 0, 0);
  return repo;
}

export async function createUser(
  repo: MemoryRepository,
  uid: string,
  name = uid,
): Promise<UserDoc> {
  return ensureUser(repo, {
    uid,
    displayName: name,
    photoURL: "",
    email: `${uid}@test.local`,
  });
}
