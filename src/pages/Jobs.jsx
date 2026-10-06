import { useCallback, useEffect, useState } from "react";
import { Briefcase, MapPin, Building2, CalendarClock, ExternalLink, Search, ChevronDown } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLiveRefresh } from "../context/LiveUpdatesContext.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import ErrorState from "../components/ui/ErrorState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { inputClass } from "../components/ui/formStyles.js";
import { formatLongDate } from "../utils/time.js";

function formatDeadline(value) {
  return formatLongDate(value, null);
}

/**
 * Career board for alumni. OSAA-TRACK is an employment directory, not an
 * application system — applying happens on the employer's own link, which
 * is why there's no "Apply" action stored here.
 */
export default function Jobs() {
  const { handleSessionInvalidated } = useAuth();
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async (opts) => {
    setState((s) => (s === "ready" ? "ready" : "loading"));
    try {
      const data = await api.get("/api/portal/jobs");
      setItems(data.items);
      setState("ready");
    } catch (err) {
      if (handleSessionInvalidated(err)) return;
      setState((s) => (opts?.background && s === "ready" ? "ready" : "error"));
    }
  }, [handleSessionInvalidated]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(["job-postings"], load);

  if (state === "loading") return <LoadingState label="Loading opportunities..." />;
  if (state === "error") return <ErrorState message="Couldn't load job opportunities." onRetry={load} />;

  const term = search.trim().toLowerCase();
  const shown = term
    ? items.filter((j) =>
        [j.title, j.company, j.industry, j.location].filter(Boolean).some((v) => v.toLowerCase().includes(term))
      )
    : items;

  return (
    <>
      <div className="mb-5">
        <h1 className="font-heading text-xl font-bold text-slate-800 sm:text-2xl">Job Opportunities</h1>
        <p className="mt-1 text-sm text-slate-500">Verified vacancies published by the SAA office for PSU alumni.</p>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, company, industry, or location"
          className={`${inputClass} pl-9`}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={term ? "No matching postings" : "No open postings"}
          description={term ? "Try a different search term." : "New opportunities will appear here as the SAA publishes them."}
        />
      ) : (
        <ul className="space-y-3">
          {shown.map((j) => {
            const open = openId === j.id;
            const deadline = formatDeadline(j.deadline);
            return (
              <li key={j.id} className="overflow-hidden rounded-xl2 border border-slate-200 bg-white shadow-card">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : j.id)}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5"
                >
                  <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <Briefcase size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-heading text-[15px] font-semibold text-slate-800">{j.title}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Building2 size={12} /> {j.company}
                      </span>
                      {j.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} /> {j.location}
                        </span>
                      )}
                      {j.industry && <span className="rounded-full bg-slate-100 px-2 py-0.5">{j.industry}</span>}
                      {deadline && (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <CalendarClock size={12} /> Apply by {deadline}
                        </span>
                      )}
                    </p>
                  </div>
                  <ChevronDown size={17} className={`mt-1 shrink-0 text-slate-300 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div className="space-y-4 border-t border-slate-100 px-4 py-4 sm:px-5">
                    {j.description && (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{j.description}</p>
                      </div>
                    )}
                    {j.requirements && (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Requirements</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{j.requirements}</p>
                      </div>
                    )}
                    {j.external_link ? (
                      <a
                        href={j.external_link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        <ExternalLink size={14} /> Apply on the employer&rsquo;s site
                      </a>
                    ) : (
                      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-500">
                        No online application link was provided. Contact the SAA office through SAA Chat for details on how
                        to apply.
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
