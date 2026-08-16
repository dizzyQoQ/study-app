import { httpsCallable } from "firebase/functions";
import { getFirebase, isFirebaseConfigured } from "./firebase/app";
import { FirebaseRepository } from "./repos/firebase";
import { MemoryRepository } from "./repos/memory";
import type { AppRepository } from "./repos/types";
import { runDecomposePipeline } from "./services/decomposeService";
import type { DecomposeResult } from "./services/decomposeService";

const memorySingleton = new MemoryRepository();

export function createRepository(): AppRepository {
  if (isFirebaseConfigured()) {
    return new FirebaseRepository(getFirebase().db);
  }
  return memorySingleton;
}

export function usesCloudBackend(): boolean {
  return isFirebaseConfigured();
}

export async function requestDecompose(repo: AppRepository, goalText: string): Promise<DecomposeResult> {
  if (isFirebaseConfigured()) {
    try {
      const callable = httpsCallable<{ goalText: string }, DecomposeResult>(
        getFirebase().functions,
        "decomposeGoal",
      );
      const res = await callable({ goalText });
      return res.data;
    } catch {
      return runDecomposePipeline(goalText, {
        getCache: (k) => repo.getCache(k),
        saveCache: (d) => repo.saveCache(d),
        callGemini: async () => {
          throw new Error("callable failed");
        },
        now: () => repo.now(),
      });
    }
  }
  return runDecomposePipeline(goalText, {
    getCache: (k) => repo.getCache(k),
    saveCache: (d) => repo.saveCache(d),
    callGemini: async () => {
      throw new Error("no gemini on client");
    },
    now: () => repo.now(),
  });
}
