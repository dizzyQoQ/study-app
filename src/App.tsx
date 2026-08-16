import { BrowserRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { SessionProvider } from "./app/SessionProvider";
import { AppShell } from "./app/AppShell";
import { HomePage } from "./features/home/HomePage";
import { MapPage } from "./features/map/MapPage";
import { PetPage } from "./features/pet/PetPage";
import { FeedPage } from "./features/feed/FeedPage";
import { useContext } from "react";
import { SessionContext } from "./app/session";

function Guard({ children }: { children: ReactNode }) {
  const session = useContext(SessionContext);
  if (!session) return null;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Guard>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/pet" element={<PetPage />} />
              <Route path="/feed" element={<FeedPage />} />
            </Route>
          </Routes>
        </Guard>
      </SessionProvider>
    </BrowserRouter>
  );
}
