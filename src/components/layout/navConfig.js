import {
  Home,
  Bell,
  Rss,
  ClipboardList,
  GraduationCap,
  Award,
  Network,
  MessageCircle,
  Settings,
  Briefcase,
  UserCircle,
} from "lucide-react";

/**
 * Navigation is built from the signed-in account's type. This is the
 * user-visible half of the type rule — the enforcing half is server-side
 * (requireType in the backend), so hiding a link here is convenience, not
 * security: typing the URL of the other type's page still gets refused.
 *
 * Group names follow the Student features document exactly (Main /
 * Documents / Management / Insights / System); the alumni set is the same
 * shape with their own modules.
 */
const STUDENT_NAV = [
  {
    label: "Main",
    items: [
      { label: "Home", to: "/", icon: Home, end: true },
      { label: "Announcements", to: "/announcements", icon: Bell, badgeKey: "announcements" },
      { label: "Campus Feed", to: "/campus-feed", icon: Rss, badgeKey: "campusFeed" },
    ],
  },
  {
    label: "Documents",
    items: [{ label: "Document Queue", to: "/document-queue", icon: ClipboardList, badgeKey: "documentQueue" }],
  },
  {
    label: "Management",
    items: [
      { label: "Scholarships", to: "/scholarships", icon: GraduationCap, badgeKey: "scholarships" },
      { label: "My Achievements", to: "/achievements", icon: Award, badgeKey: "achievements" },
      { label: "Student Leaders Directory", to: "/student-leaders", icon: Network, badgeKey: "studentLeaders" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "SAA Chat", to: "/saa-chat", icon: MessageCircle, badgeKey: "saaChat" },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

const ALUMNI_NAV = [
  {
    label: "Main",
    items: [
      { label: "Home", to: "/", icon: Home, end: true },
      { label: "Announcements", to: "/announcements", icon: Bell, badgeKey: "announcements" },
    ],
  },
  {
    label: "Documents",
    items: [{ label: "Document Queue", to: "/document-queue", icon: ClipboardList, badgeKey: "documentQueue" }],
  },
  {
    label: "Opportunities",
    items: [{ label: "Job Opportunities", to: "/jobs", icon: Briefcase, badgeKey: "jobs" }],
  },
  {
    label: "My Records",
    items: [{ label: "Alumni Profile", to: "/profile", icon: UserCircle }],
  },
  {
    label: "System",
    items: [
      { label: "SAA Chat", to: "/saa-chat", icon: MessageCircle, badgeKey: "saaChat" },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

export function navGroupsFor(type) {
  return type === "alumni" ? ALUMNI_NAV : STUDENT_NAV;
}
