import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import RequireType from "./components/RequireType.jsx";
import PortalLayout from "./components/layout/PortalLayout.jsx";

import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import Announcements from "./pages/Announcements.jsx";
import CampusFeed from "./pages/CampusFeed.jsx";
import DocumentQueue from "./pages/DocumentQueue.jsx";
import Scholarships from "./pages/Scholarships.jsx";
import Achievements from "./pages/Achievements.jsx";
import StudentLeaders from "./pages/StudentLeaders.jsx";
import Jobs from "./pages/Jobs.jsx";
import AlumniProfile from "./pages/AlumniProfile.jsx";
import SaaChat from "./pages/SaaChat.jsx";
import Settings from "./pages/Settings.jsx";

/**
 * ONE APP, TWO DASHBOARDS.
 * Student and alumni live in the same route tree — they share the login,
 * the layout, the Document Queue, Announcements, FAQ, SAA Chat and
 * Settings. The pages that belong to only one of them are wrapped in
 * RequireType, which redirects the wrong type home rather than rendering
 * a page whose every request would be refused. The server enforces the
 * same rule independently (requireType), so this wrapper is about giving
 * a sensible experience, not about security.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<PortalLayout />}>
          {/* Shared by both account types */}
          <Route index element={<Home />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="document-queue" element={<DocumentQueue />} />
          {/* FAQ now lives in the floating help box; keep old bookmarks working. */}
          <Route path="faq" element={<Navigate to="/" replace />} />
          <Route path="saa-chat" element={<SaaChat />} />
          <Route path="settings" element={<Settings />} />

          {/* Student only */}
          <Route
            path="campus-feed"
            element={
              <RequireType type="student">
                <CampusFeed />
              </RequireType>
            }
          />
          <Route
            path="scholarships"
            element={
              <RequireType type="student">
                <Scholarships />
              </RequireType>
            }
          />
          <Route
            path="achievements"
            element={
              <RequireType type="student">
                <Achievements />
              </RequireType>
            }
          />
          <Route
            path="student-leaders"
            element={
              <RequireType type="student">
                <StudentLeaders />
              </RequireType>
            }
          />

          {/* Alumni only */}
          <Route
            path="jobs"
            element={
              <RequireType type="alumni">
                <Jobs />
              </RequireType>
            }
          />
          <Route
            path="profile"
            element={
              <RequireType type="alumni">
                <AlumniProfile />
              </RequireType>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
