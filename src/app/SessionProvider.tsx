import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  browserPopupRedirectResolver,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { getFirebase, isFirebaseConfigured } from "../lib/firebase/app";
import { createRepository, usesCloudBackend } from "../lib/backend";
import { ensureUser, listUserGroups, selectGroup } from "../lib/services/groupService";
import { unreadCount } from "../lib/services/feedService";
import type { UserDoc } from "../lib/domain/types";
import type { AppRepository } from "../lib/repos/types";
import { SessionContext, type SessionValue } from "./session";
import { isOnline } from "../lib/offline";
import type {
  AchievementDoc,
  FeedDoc,
  GroupDoc,
  MemberDoc,
  PetDoc,
  PlanDoc,
  ProgressDoc,
} from "../lib/domain/types";

const DEV_UID_KEY = "self-learn-dev-uid";

export function SessionProvider({
  children,
  testRepo,
  testUser,
}: {
  children: ReactNode;
  testRepo?: AppRepository;
  testUser?: UserDoc | null;
}) {
  const repo = useMemo(() => testRepo ?? createRepository(), [testRepo]);
  const [user, setUser] = useState<UserDoc | null>(testUser === undefined ? null : testUser);
  const [ready, setReady] = useState(Boolean(testRepo));
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [group, setGroup] = useState<GroupDoc | null>(null);
  const [pet, setPet] = useState<PetDoc | null>(null);
  const [plan, setPlan] = useState<PlanDoc | null>(null);
  const [members, setMembers] = useState<MemberDoc[]>([]);
  const [progressByUser, setProgressByUser] = useState<Record<string, ProgressDoc[]>>({});
  const [feed, setFeed] = useState<FeedDoc[]>([]);
  const [unread, setUnread] = useState(0);
  const [achievements, setAchievements] = useState<AchievementDoc[]>([]);
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (testRepo) return;
    if (!isFirebaseConfigured()) {
      const uid = localStorage.getItem(DEV_UID_KEY);
      if (uid) {
        void repo.getUser(uid).then((u) => {
          setUser(u);
          setReady(true);
        });
      } else {
        setReady(true);
      }
      return;
    }
    const { auth } = getFirebase();
    void getRedirectResult(auth, browserPopupRedirectResolver).catch((err) => {
      console.error("Firebase 登入失敗詳細原因:", err);
    });
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setReady(true);
        return;
      }
      const doc = await ensureUser(repo, {
        uid: fbUser.uid,
        displayName: fbUser.displayName || "旅人",
        photoURL: fbUser.photoURL || "",
        email: fbUser.email || "",
      });
      setUser(doc);
      setReady(true);
    });
  }, [repo, testRepo]);

  async function refresh(current = user) {
    if (!current) {
      setGroups([]);
      setGroup(null);
      return;
    }
    const list = await listUserGroups(repo, current.uid);
    setGroups(list);
    const selectedId = current.lastSelectedGroupId;
    const selected = list.find((g) => g.id === selectedId) ?? list[0] ?? null;
    setGroup(selected);
    if (!selected) {
      setPet(null);
      setPlan(null);
      setMembers([]);
      setProgressByUser({});
      setFeed([]);
      setUnread(0);
      setAchievements([]);
      return;
    }
    if (current.lastSelectedGroupId !== selected.id) {
      const next = await selectGroup(repo, current, selected.id);
      setUser(next);
    }
    const [petDoc, memberList, feedList] = await Promise.all([
      repo.getPet(selected.petId),
      repo.listMembers(selected.id),
      repo.listFeed(selected.id),
    ]);
    setPet(petDoc);
    setMembers(memberList);
    setFeed(feedList);
    setUnread(await unreadCount(repo, current.uid, selected.id));
    let planDoc: PlanDoc | null = null;
    if (selected.currentPlanId) {
      planDoc = await repo.getPlan(selected.currentPlanId);
    }
    setPlan(planDoc);
    const progressMap: Record<string, ProgressDoc[]> = {};
    if (planDoc) {
      for (const m of memberList) {
        progressMap[m.uid] = await repo.listProgressForPlanUser(planDoc.id, m.uid);
      }
    }
    setProgressByUser(progressMap);
    const ach: AchievementDoc[] = [];
    for (const id of ["first_feed", "first_boss", "level_3"] as const) {
      const a = await repo.getAchievement(selected.id, id);
      if (a) ach.push(a);
    }
    setAchievements(ach);
  }

  useEffect(() => {
    if (user) void refresh(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.lastSelectedGroupId]);

  async function selectGroupId(groupId: string) {
    if (!user) return;
    const next = await selectGroup(repo, user, groupId);
    setUser(next);
    await refresh(next);
  }

  async function signOutUser() {
    if (isFirebaseConfigured()) {
      await signOut(getFirebase().auth);
    } else {
      localStorage.removeItem(DEV_UID_KEY);
    }
    setUser(null);
    setGroups([]);
    setGroup(null);
  }

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center text-moss-800">載入共學地圖…</div>
    );
  }

  if (!user) {
    return (
      <LoginView
        cloud={usesCloudBackend()}
        onGoogle={signInWithGoogle}
        onDev={async () => {
          const uid = "dev-local";
          localStorage.setItem(DEV_UID_KEY, uid);
          const doc = await ensureUser(repo, {
            uid,
            displayName: "本機旅人",
            photoURL: "",
            email: "dev@localhost",
          });
          setUser(doc);
        }}
      />
    );
  }

  const value: SessionValue = {
    repo,
    user,
    groups,
    group,
    pet,
    plan,
    members,
    progressByUser,
    feed,
    unread,
    achievements,
    online,
    cloud: usesCloudBackend(),
    refresh: () => refresh(user),
    selectGroupId,
    signOutUser,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function LoginView({
  cloud,
  onGoogle,
  onDev,
}: {
  cloud: boolean;
  onGoogle: () => Promise<void>;
  onDev: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="sketch-card relative w-full max-w-md p-8">
        <span aria-hidden className="absolute -top-5 left-8 h-12 w-14 rounded-[1.6rem] border-[4px] border-[#3b2412] bg-[#ffb38a]" />
        <p className="font-rounded text-sm font-bold tracking-[0.28em] text-[#c45c26]">CO-STUDY MAP</p>
        <h1 className="font-rounded mt-2 text-4xl font-bold text-[#3b2412]">和朋友一起，把目標拆成關卡</h1>
        <p className="mt-4 leading-relaxed text-[#3b2412]/80">
          連線共學、共用一隻寵物。每日低壓打卡，頭目才需要憑據。
        </p>
        {cloud ? (
          <button
            className="sketch-btn sketch-btn-confirm mt-8 w-full"
            onClick={() =>
              onGoogle().catch((err) => {
                console.error("Firebase 登入失敗詳細原因:", err);
                const code = firebaseErrorCode(err);
                setError(code ? `登入沒有成功（${code}），請再試一次。` : "登入沒有成功，請再試一次。");
              })
            }
          >
            使用 Google 登入
          </button>
        ) : (
          <>
            <p className="mt-6 text-sm text-clay-500">尚未連接雲端。請設定 Firebase 環境變數後即可 Google 登入。</p>
            {import.meta.env.DEV ? (
              <button
                className="sketch-btn sketch-btn-confirm mt-4 w-full"
                onClick={() => onDev().catch(() => setError("本機登入失敗"))}
              >
                本機開發登入
              </button>
            ) : null}
          </>
        )}
        {error ? <p className="mt-3 text-sm text-clay-500">{error}</p> : null}
      </section>
    </main>
  );
}

export { LoginView };

async function signInWithGoogle() {
  const { auth } = getFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider, browserPopupRedirectResolver);
  } catch (err) {
    console.error("Firebase 登入失敗詳細原因:", err);
    if (shouldFallbackToRedirect(err)) {
      await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
      return;
    }
    throw err;
  }
}

function firebaseErrorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string") {
    return err.code;
  }
  return "";
}

function shouldFallbackToRedirect(err: unknown): boolean {
  const code = firebaseErrorCode(err);
  if (
    code === "auth/popup-blocked" ||
    code === "auth/cancelled-popup-request" ||
    code === "auth/internal-error"
  ) {
    return true;
  }
  const message = err instanceof Error ? err.message : String(err);
  return /popup/i.test(message);
}
