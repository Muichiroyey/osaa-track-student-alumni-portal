import { useCallback, useEffect, useState } from "react";
import {
  GraduationCap,
  CalendarClock,
  ExternalLink,
  Loader2,
  CheckCircle2,
  UploadCloud,
  Paperclip,
  Eye,
  Download,
  FileText,
  X,
} from "lucide-react";
import { api, uploadFile, downloadFile, ApiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLiveRefresh } from "../context/LiveUpdatesContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useSummary } from "../context/SummaryContext.jsx";
import Modal from "../components/ui/Modal.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import ErrorState from "../components/ui/ErrorState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import FileViewerModal from "../components/ui/FileViewerModal.jsx";
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../components/ui/formStyles.js";
import { formatLongDate } from "../utils/time.js";

function peso(amount) {
  if (amount == null) return null;
  return `\u20B1${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  return formatLongDate(value, null);
}

// "Under Review" reads better than the raw 'pending' for an applicant.
const APPLICATION_LABEL = { pending: "Under Review", accepted: "Accepted", rejected: "Rejected" };

// ── One upload slot per requirement on the posting's checklist ──────────
function RequirementRow({ requirement, file, onPick }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handle(list) {
    const picked = list?.[0];
    if (!picked) return;
    setError(null);
    setBusy(true);
    try {
      onPick(await uploadFile(picked));
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center gap-2.5">
        {file ? (
          <CheckCircle2 size={16} className="shrink-0 text-status-success" />
        ) : (
          <span className="size-4 shrink-0 rounded-full border-2 border-slate-300" />
        )}
        <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">{requirement}</span>
        <label className="shrink-0 cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
          {busy ? <Loader2 size={13} className="animate-spin" /> : file ? "Replace" : "Upload"}
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              handle(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {file && <p className="mt-1.5 truncate pl-6 text-xs text-slate-400">{file.original_name}</p>}
      {error && <p className="mt-1.5 pl-6 text-xs font-medium text-status-danger">{error}</p>}
    </li>
  );
}

function ApplyModal({ scholarship, onClose, onApplied }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [studentId, setStudentId] = useState(user?.code || "");
  const [program, setProgram] = useState(user?.department || "");
  const [files, setFiles] = useState({});
  // Anything else the application needs (e.g. the printed, filled-out and scanned application form).
  const [extras, setExtras] = useState([]);
  const [extraBusy, setExtraBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!scholarship) return null;

  async function addExtras(list) {
    const picked = Array.from(list || []);
    if (picked.length === 0) return;
    setError(null);
    setExtraBusy(true);
    try {
      const uploaded = [];
      for (const f of picked) uploaded.push(await uploadFile(f));
      setExtras((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setExtraBusy(false);
    }
  }
  const requirements = scholarship.requirements || [];
  const allUploaded = requirements.every((r) => files[r]);

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      await api.post(`/api/portal/scholarships/${scholarship.id}/apply`, {
        studentId,
        program,
        files: requirements.map((r) => ({ label: r, fileId: files[r].id })),
        extraFileIds: extras.map((f) => f.id),
      });
      notify("Application submitted — track it under My Applications.");
      onApplied();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your application.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Apply — ${scholarship.name}`} maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Student number</label>
            <input className={inputClass} value={studentId} onChange={(e) => setStudentId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Program / course</label>
            <input className={inputClass} value={program} onChange={(e) => setProgram(e.target.value)} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Required documents ({requirements.filter((r) => files[r]).length}/{requirements.length})
          </p>
          {requirements.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500">
              This posting lists no specific requirements.
            </p>
          ) : (
            <ul className="space-y-2">
              {requirements.map((r) => (
                <RequirementRow
                  key={r}
                  requirement={r}
                  file={files[r]}
                  onPick={(f) => setFiles((prev) => ({ ...prev, [r]: f }))}
                />
              ))}
            </ul>
          )}
        </div>

        {scholarship.attachments?.length > 0 && (
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            Need the application form? Download it from the scholarship card, fill it out, scan it, and attach it below.
          </p>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Additional attachments</p>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-4 text-xs text-slate-500 transition hover:border-slate-400 hover:bg-slate-50">
            {extraBusy ? <Loader2 size={16} className="animate-spin text-brand-blue" /> : <UploadCloud size={16} className="text-slate-400" />}
            {extraBusy ? "Uploading..." : "Click to attach files (e.g. your scanned application form)"}
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addExtras(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {extras.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {extras.map((f) => (
                <li key={f.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <Paperclip size={12} className="shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-slate-600">{f.original_name}</span>
                  <button
                    type="button"
                    onClick={() => setExtras((prev) => prev.filter((x) => x.id !== f.id))}
                    className="shrink-0 text-slate-400 hover:text-status-danger"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</div>}

        <div className="flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={saving || extraBusy || !allUploaded} className={primaryButtonClass}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            Submit application
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Scholarships() {
  const { handleSessionInvalidated } = useAuth();
  const { refresh: refreshSummary } = useSummary();
  const [tab, setTab] = useState("open");
  const [scholarships, setScholarships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [counts, setCounts] = useState(null);
  const [state, setState] = useState("loading");
  const [applying, setApplying] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async (opts) => {
    setState((s) => (s === "ready" ? "ready" : "loading"));
    try {
      const [open, mine] = await Promise.all([
        api.get("/api/portal/scholarships"),
        api.get("/api/portal/scholarships/my-applications"),
      ]);
      setScholarships(open.items);
      setApplications(mine.items);
      setCounts(mine.counts);
      setState("ready");
    } catch (err) {
      if (handleSessionInvalidated(err)) return;
      setState((s) => (opts?.background && s === "ready" ? "ready" : "error"));
    }
  }, [handleSessionInvalidated]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(["scholarships"], load);

  if (state === "loading" && !counts) return <LoadingState label="Loading scholarships..." />;
  if (state === "error") return <ErrorState message="Couldn't load scholarships." onRetry={load} />;

  return (
    <>
      <div className="mb-5">
        <h1 className="font-heading text-xl font-bold text-slate-800 sm:text-2xl">Scholarships</h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse open scholarship programs and track the applications you&rsquo;ve filed.
        </p>
      </div>

      <div className="mb-5 inline-flex rounded-xl2 border border-slate-200 bg-white p-1 shadow-card">
        {[
          { key: "open", label: `Open scholarships (${scholarships.length})` },
          { key: "mine", label: `My applications (${counts?.total ?? 0})` },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.key ? "bg-brand-blue text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "open" ? (
        scholarships.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No open scholarships" description="New programs will appear here." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {scholarships.map((s) => {
              const closed = Boolean(s.deadline_passed);
              const applied = Boolean(s.my_application_id);
              return (
                <article key={s.id} className="flex flex-col rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <GraduationCap size={21} />
                    </div>
                    {applied && (
                      <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                        {APPLICATION_LABEL[s.my_application_status] || "Applied"}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-3.5 font-heading text-[15px] font-semibold text-slate-800">{s.name}</h2>
                  <p className="mt-0.5 text-sm text-slate-500">{s.provider}</p>

                  <dl className="mt-3 space-y-1.5 text-xs">
                    {s.amount != null && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Amount</dt>
                        <dd className="font-semibold text-slate-700">{peso(s.amount)}</dd>
                      </div>
                    )}
                    {s.deadline && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Deadline</dt>
                        <dd className={`font-semibold ${closed ? "text-status-danger" : "text-slate-700"}`}>
                          {formatDate(s.deadline)}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {s.requirements?.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Requirements</p>
                      <ul className="space-y-1">
                        {s.requirements.map((r) => (
                          <li key={r} className="flex items-start gap-1.5 text-xs text-slate-600">
                            <Paperclip size={11} className="mt-0.5 shrink-0 text-slate-300" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {s.attachments?.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Forms &amp; downloads</p>
                      <ul className="space-y-1.5">
                        {s.attachments.map((f) => (
                          <li key={f.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                            <FileText size={13} className="shrink-0 text-slate-400" />
                            <span className="min-w-0 flex-1 truncate text-slate-600">{f.original_name}</span>
                            <button
                              type="button"
                              onClick={() => downloadFile(f.id, f.original_name)}
                              title="Download"
                              className="shrink-0 text-slate-400 hover:text-brand-blue"
                            >
                              <Download size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-2 pt-4">
                    {applied ? (
                      <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500">
                        <CheckCircle2 size={14} /> Already applied
                      </span>
                    ) : closed ? (
                      <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400">
                        <CalendarClock size={14} /> Deadline passed
                      </span>
                    ) : (
                      <button type="button" onClick={() => setApplying(s)} className={`${primaryButtonClass} flex-1`}>
                        Apply
                      </button>
                    )}
                    {s.external_link && (
                      <a
                        href={s.external_link}
                        target="_blank"
                        rel="noreferrer noopener"
                        title="Open the provider's page"
                        className="flex size-[42px] shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : applications.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No applications yet"
          description="Apply to an open scholarship and it will show up here with its status."
        />
      ) : (
        <ul className="space-y-3">
          {applications.map((a) => (
            <li key={a.id} className="rounded-xl2 border border-slate-200 bg-white p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-heading text-[15px] font-semibold text-slate-800">{a.scholarship_name}</h2>
                  <p className="text-sm text-slate-500">{a.scholarship_provider}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    a.status === "accepted"
                      ? "bg-emerald-100 text-emerald-700"
                      : a.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {APPLICATION_LABEL[a.status]}
                </span>
              </div>

              {a.status === "accepted" && (
                <p className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  You&rsquo;ve been added to the SAA&rsquo;s scholarship recipient roster.
                </p>
              )}

              {a.files?.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {a.files.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      <Paperclip size={12} className="shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate text-slate-600">{f.label || f.original_name}</span>
                      <button type="button" onClick={() => setViewing(f)} className="shrink-0 text-slate-400 hover:text-brand-blue">
                        <Eye size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {applying && (
        <ApplyModal
          scholarship={applying}
          onClose={() => setApplying(null)}
          onApplied={() => {
            load();
            refreshSummary();
            setTab("mine");
          }}
        />
      )}

      {viewing && (
        <FileViewerModal
          open
          onClose={() => setViewing(null)}
          fileName={viewing.original_name}
          viewUrl={`/api/uploads/${viewing.id}/view`}
          downloadUrl={`/api/uploads/${viewing.id}/download`}
        />
      )}
    </>
  );
}
