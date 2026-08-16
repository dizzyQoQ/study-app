import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SessionProvider } from "../app/SessionProvider";
import { AppShell } from "../app/AppShell";
import { LoginView } from "../app/SessionProvider";
import { HomePage } from "../features/home/HomePage";
import { MapPage } from "../features/map/MapPage";
import { PetPage } from "../features/pet/PetPage";
import { FeedPage } from "../features/feed/FeedPage";
import { createGroup } from "../lib/services/groupService";
import { applyPlanToGroup } from "../lib/services/planService";
import { buildTemplateTree } from "../lib/domain/templates";
import { createRepo, createUser } from "./harness";

function renderApp(repo: ReturnType<typeof createRepo>, user: Awaited<ReturnType<typeof createUser>>) {
  return render(
    <MemoryRouter>
      <SessionProvider testRepo={repo} testUser={user}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/pet" element={<PetPage />} />
            <Route path="/feed" element={<FeedPage />} />
          </Route>
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe("Phase 1 登入與外殼", () => {
  it("未登入看得到產品說明與 Google 登入", () => {
    render(<LoginView cloud onGoogle={async () => undefined} onDev={async () => undefined} />);
    expect(screen.getByText(/和朋友一起，把目標拆成關卡/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "使用 Google 登入" })).toBeInTheDocument();
  });

  it("登入後有四個主分頁：首頁、關卡地圖、寵物小隊、動態牆", async () => {
    const repo = createRepo();
    const user = await createUser(repo, "alice", "Alice");
    await createGroup(repo, { owner: user, name: "測試群" });
    renderApp(repo, user);
    const navs = await screen.findAllByLabelText("主分頁");
    expect(navs.length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: "首頁" }).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByRole("link", { name: "首頁" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "關卡地圖" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "寵物小隊" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "動態牆" }).length).toBeGreaterThan(0);
  });
});

describe("Phase 7 UI 首頁指揮台與專屬模組", () => {
  it("首頁由目標輸入、寵物看板、隊友圈、今日路線組成，不是單一 Todo 列表", async () => {
    const repo = createRepo();
    const user = await createUser(repo, "alice", "Alice");
    const { group } = await createGroup(repo, { owner: user, name: "學測英文" });
    await applyPlanToGroup(repo, {
      groupId: group.id,
      uid: user.uid,
      goalText: "學測英文",
      tree: buildTemplateTree("學測英文"),
      source: "template",
      cacheKey: "學測英文",
      confirmReplace: true,
    });
    const refreshed = (await repo.getUser("alice"))!;
    renderApp(repo, refreshed);
    expect(await screen.findByLabelText("學習目標")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "一鍵拆解" })).toBeInTheDocument();
    expect(screen.getByText("隊友今日")).toBeInTheDocument();
    expect(screen.getByText("今日路線")).toBeInTheDocument();
    expect(screen.queryByRole("listitem", { name: /todo/i })).not.toBeInTheDocument();
  });

  it("地圖使用關卡樹而不是待辦清單標題", async () => {
    const repo = createRepo();
    const user = await createUser(repo, "alice", "Alice");
    const { group } = await createGroup(repo, { owner: user, name: "學測英文" });
    await applyPlanToGroup(repo, {
      groupId: group.id,
      uid: user.uid,
      goalText: "學測英文",
      tree: buildTemplateTree("學測英文"),
      source: "template",
      cacheKey: "學測英文",
      confirmReplace: true,
    });
    render(
      <MemoryRouter initialEntries={["/map"]}>
        <SessionProvider testRepo={repo} testUser={(await repo.getUser("alice"))!}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/map" element={<MapPage />} />
            </Route>
          </Routes>
        </SessionProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("level-tree")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "關卡地圖" })).toBeInTheDocument();
    expect(screen.getAllByText("小徑").length).toBeGreaterThan(0);
    expect(screen.getAllByText("石門").length).toBeGreaterThan(0);
    expect(screen.getByTestId("add-custom-level")).toBeInTheDocument();
  });

  it("沒有私訊、留言串或 AI 家教入口", async () => {
    const repo = createRepo();
    const user = await createUser(repo, "alice", "Alice");
    await createGroup(repo, { owner: user, name: "學測英文" });
    renderApp(repo, (await repo.getUser("alice"))!);
    expect(await screen.findByText("你想學什麼？")).toBeInTheDocument();
    expect(screen.queryByText("私訊")).not.toBeInTheDocument();
    expect(screen.queryByText("留言")).not.toBeInTheDocument();
    expect(screen.queryByText("家教")).not.toBeInTheDocument();
  });
});
