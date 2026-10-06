import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Bell,
  GraduationCap,
  Award,
  Briefcase,
  UserCircle,
  ChevronRight,
  Activity,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSummary } from "../context/SummaryContext.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import QuickActions from "../components/ui/QuickActions.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import ErrorState from "../components/ui/ErrorState.jsx";
import { phNow } from "../utils/time.js";

const TONE_DOT = {
  warning: "bg-status-warning",
  success: "bg-status-success",
  danger: "bg-status-danger",
  info: "bg-status-info",
};

function WelcomeBanner({ name, type }) {
  // "Today" in the Philippines, whatever the device's own clock zone is.
  const { weekday: day, longDate: date } = phNow();
  const firstName = (name || "").trim().split(/\s+/)[0] || "there";

  return (
    <div
      className="mb-6 overflow-hidden rounded-xl2 px-5 py-6 text-white shadow-card sm:px-8 sm:py-7"
      style={{ backgroundImage: "linear-gradient(120deg, #1e1b4b 0%, #312e81 55%, #3730a3 100%)" }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[2px] text-gold">
        {type === "alumni" ? "Alumni Portal" : "Student Portal"}
      </p>
      <h1 className="mt-1.5 font-display text-2xl font-extrabold sm:text-[28px]">Welcome back, {firstName}!</h1>
      <p className="mt-1 text-sm text-white/60">
        {day}, {date}
      </p>
    </div>
  );
}

function ActivityFeed({ activity }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-semibold text-slate-800">
        <Activity size={17} className="text-brand-blue" />
        Activity updates
      </h2>
      <div className="overflow-hidden rounded-xl2 border border-slate-200 bg-white shadow-card">
        {activity.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            Nothing needs your attention right now.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activity.map((item) => (
              <li key={item.id}>
                <Link to={item.to || "/"} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50">
                  <span className={`size-2 shrink-0 rounded-full ${TONE_DOT[item.tone] || "bg-slate-300"}`} />
                  <p className="flex-1 text-sm text-slate-600">{item.message}</p>
                  <ChevronRight size={15} className="shrink-0 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { summary, state, refresh } = useSummary();

  // Refetch every time Home is opened, so a decision the SAA made while
  // the tab sat open isn't stale — same behavior as the Admin Panel's Home.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "loading" && !summary) return <LoadingState label="Loading your dashboard..." />;
  if (state === "error" && !summary) return <ErrorState message="Couldn't load your dashboard." onRetry={refresh} />;
  if (!summary) return null;

  const isStudent = user?.type === "student";

  const cards = [
    {
      key: "documents",
      icon: ClipboardList,
      iconClass: "bg-sky-100 text-sky-600",
      title: "Document Queue",
      to: "/document-queue",
      metrics: [
        { label: "Pending SAA", value: summary.documents.pending, tone: "warning" },
        { label: "Approved", value: summary.documents.approved, tone: "success" },
      ],
    },
    {
      key: "announcements",
      icon: Bell,
      iconClass: "bg-amber-100 text-amber-600",
      title: "Announcements",
      to: "/announcements",
      metrics: [
        { label: "New this week", value: summary.announcements.recent },
        { label: "Urgent", value: summary.announcements.urgent, tone: "danger" },
      ],
    },
  ];

  if (isStudent) {
    cards.push(
      {
        key: "scholarships",
        icon: GraduationCap,
        iconClass: "bg-emerald-100 text-emerald-600",
        title: "Scholarships",
        to: "/scholarships",
        metrics: [
          { label: "Active scholarships", value: summary.scholarships.active },
          { label: "My applications", value: summary.scholarships.total },
        ],
      },
      {
        key: "achievements",
        icon: Award,
        iconClass: "bg-violet-100 text-violet-600",
        title: "My Achievements",
        to: "/achievements",
        metrics: [
          { label: "Pending validation", value: summary.achievements.pending, tone: "warning" },
          { label: "Approved", value: summary.achievements.approved, tone: "success" },
        ],
      }
    );
  } else {
    cards.push(
      {
        key: "jobs",
        icon: Briefcase,
        iconClass: "bg-emerald-100 text-emerald-600",
        title: "Job Opportunities",
        to: "/jobs",
        metrics: [
          { label: "Open postings", value: summary.jobs.active },
          { label: "Closing in 2 weeks", value: summary.jobs.closingSoon, tone: "warning" },
        ],
      },
      {
        key: "profile",
        icon: UserCircle,
        iconClass: "bg-violet-100 text-violet-600",
        title: "Alumni Profile",
        to: "/profile",
        metrics: [
          { label: "Employment status", value: summary.profile.employmentStatus || "—" },
          {
            label: "Tracer record",
            value: summary.profile.incomplete ? "Incomplete" : "Up to date",
            tone: summary.profile.incomplete ? "warning" : "success",
          },
        ],
      }
    );
  }

  return (
    <>
      <WelcomeBanner name={user?.name} type={user?.type} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <StatCard
            key={c.key}
            icon={c.icon}
            iconClass={c.iconClass}
            title={c.title}
            metrics={c.metrics}
            to={c.to}
          />
        ))}
      </div>

      <QuickActions />

      <ActivityFeed activity={summary.activity} />
    </>
  );
}
