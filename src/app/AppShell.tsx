import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSession } from "./session";
import { syncBannerText } from "../lib/offline";
import { GroupSwitcher } from "../features/groups/GroupSwitcher";
import { useState } from "react";
import { GroupSettings } from "../features/groups/GroupSettings";

const tabs = [
  { to: "/", label: "首頁", end: true },
  { to: "/map", label: "關卡地圖" },
  { to: "/pet", label: "寵物小隊" },
  { to: "/feed", label: "動態牆" },
];

export function AppShell() {
  const { pet, unread, online, signOutUser } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex w-56 flex-col border-r-[4px] border-[#3b2412] bg-[#6fad45] p-5 text-[#fff8e7]">
        <p className="font-rounded text-xl font-bold">共學地圖</p>
        <nav className="mt-8 space-y-2" aria-label="主分頁">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `block rounded-2xl border-[3px] border-[#3b2412] px-3 py-2 font-bold ${
                  isActive ? "bg-[#ffd166] text-[#3b2412]" : "bg-[#fff8e7]/80 text-[#3b2412]"
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pb-20 md:pb-0">
        {!online ? (
          <div role="status" className="bg-[#ffd166] py-1 text-center text-sm font-bold text-[#3b2412]">
            {syncBannerText()}
          </div>
        ) : null}
        <header className="mx-3 mt-3 flex items-center gap-3 rounded-3xl border-[4px] border-[#3b2412] bg-[#fff8e7] px-4 py-3 shadow-[4px_4px_0_0_#5c3a21]">
          <GroupSwitcher />
          <button
            aria-label="開啟寵物小隊"
            className="ml-auto rounded-full border-[3px] border-[#3b2412] bg-[#ffd166] px-3 py-1 text-sm font-bold"
            onClick={() => navigate("/pet")}
          >
            {pet ? `Lv.${pet.level}` : "—"} {pet?.name ?? "寵物"}
          </button>
          {unread > 0 ? (
            <span className="rounded-full bg-[#ff7aa2] px-2 py-0.5 text-xs font-bold text-white">{unread}</span>
          ) : null}
          <button
            className="h-9 w-9 rounded-full border-[3px] border-[#3b2412] bg-[#ff7a1a] text-sm font-bold text-white"
            aria-label="群組設定與登出"
            onClick={() => setSettingsOpen(true)}
          >
            我
          </button>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 md:max-w-5xl">
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t-[4px] border-[#3b2412] bg-[#6fad45] py-2 md:hidden"
        aria-label="主分頁"
      >
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `py-1 text-center text-xs font-bold ${isActive ? "text-[#ffd166]" : "text-[#fff8e7]"}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      {settingsOpen ? <GroupSettings onClose={() => setSettingsOpen(false)} onSignOut={signOutUser} /> : null}
    </div>
  );
}
