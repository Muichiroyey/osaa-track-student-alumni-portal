import { useCallback, useEffect, useState } from "react";
import { Award, Plus, Loader2, UploadCloud, Paperclip, Eye, X } from "lucide-react";
import { api, uploadFile, ApiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLiveRefresh } from "../context/LiveUpdatesContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useSummary } from "../context/SummaryContext.jsx";
import Modal from "../components/ui/Modal.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import ErrorState from "../components/ui/ErrorState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import FileViewerModal from "../components/ui/FileViewerModal.jsx";
import {
  inputClass,
  labelClass,
  selectClass,
  textareaClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "../components/ui/formStyles.js";
import { formatLongDate } from "../utils/time.js";

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

const STATUS_STYLE = {
  pending: { label: "Pending Validation", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700" },
};

function formatDate(value) {
  return formatLongDate(value, "—");
}

function SubmitModal({ open, onClose, colleges, onSubmitted }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState({});
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    // Pre-fill what the account already knows, so the student isn't
    // retyping their own name and course every time.
    const parts = (user?.name || "").trim().split(/\s+/);
    setForm({
      firstName: parts[0] || "",
      lastName: parts.length > 1 ? parts[parts.length - 1] : "",
      middleInitial: "",
      studentNumber: user?.code || "",
      college: "",
      program: "",
      yearLevel: "",
      title: "",
      description: "",
      dateAchieved: "",
    });
    setFiles([]);
    setError(null);
  }, [open, user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // The program list comes straight from the Admin Panel's Achievement
  // Management categories, so a submission always lands under a program
  // that exists on its "Select Program" grid.
  const programs = Object.entries(colleges || {}).flatMap(([college, list]) =>
    list.map((program) => ({ college, program }))
  );

  async function addFiles(list) {
    const picked = Array.from(list || []);
    if (picked.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = [];
      for (const f of picked) uploaded.push(await uploadFile(f));
      setFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      await api.post("/api/portal/achievements", { ...form, fileIds: files.map((f) => f.id) });
      notify("Submitted for validation — the SAA will review your proof.");
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your achievement.");
    } finally {
      setSaving(false);
    }
  }

  const ready = form.firstName?.trim() && form.lastName?.trim() && form.studentNumber?.trim() && form.program && form.title?.trim() && files.length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Submit an achievement" maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Last name</label>
            <input className={inputClass} value={form.lastName || ""} onChange={set("lastName")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>First name</label>
            <input className={inputClass} value={form.firstName || ""} onChange={set("firstName")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Middle initial</label>
            <input className={inputClass} maxLength={3} value={form.middleInitial || ""} onChange={set("middleInitial")} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Student number</label>
            <input className={inputClass} placeholder="e.g. 2021-00123" value={form.studentNumber || ""} onChange={set("studentNumber")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>College</label>
            <input className={inputClass} placeholder="e.g. College of Computing Sciences" value={form.college || ""} onChange={set("college")} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Program / course</label>
            <select className={selectClass} value={form.program || ""} onChange={set("program")}>
              <option value="">Select your program</option>
              {programs.map(({ college, program }) => (
                <option key={program} value={program}>
                  {program} — {college.replace("College of ", "")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Year level</label>
            <select className={selectClass} value={form.yearLevel || ""} onChange={set("yearLevel")}>
              <option value="">Select year level</option>
              {YEAR_LEVELS.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Category / achievement title</label>
            <input
              className={inputClass}
              placeholder="e.g. Quiz Bee Regional — Champion"
              value={form.title || ""}
              onChange={set("title")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Date achieved</label>
            <input type="date" className={inputClass} value={form.dateAchieved || ""} onChange={set("dateAchieved")} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Details (optional)</label>
          <textarea
            rows={3}
            className={textareaClass}
            placeholder="Where it was held, the organizing body, and what you won."
            value={form.description || ""}
            onChange={set("description")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Proof of achievement</label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center transition hover:border-slate-400 hover:bg-slate-50">
            {uploading ? <Loader2 size={20} className="animate-spin text-brand-blue" /> : <UploadCloud size={20} className="text-slate-400" />}
            <span className="text-xs text-slate-500">{uploading ? "Uploading..." : "Click to attach your certificate"}</span>
            <span className="text-[11px] text-slate-400">A clear scan or photo — PDF, JPG, or PNG</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <Paperclip size={12} className="shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-slate-600">{f.original_name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
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
          <button type="button" onClick={submit} disabled={!ready || saving} className={primaryButtonClass}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            Submit application
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Achievements() {
  const { handleSessionInvalidated } = useAuth();
  const { refresh: refreshSummary } = useSummary();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState(null);
  const [colleges, setColleges] = useState({});
  const [state, setState] = useState("loading");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async (opts) => {
    setState((s) => (s === "ready" ? "ready" : "loading"));
    try {
      const data = await api.get("/api/portal/achievements");
      setItems(data.items);
      setCounts(data.counts);
      setColleges(data.colleges);
      setState("ready");
    } catch (err) {
      if (handleSessionInvalidated(err)) return;
      setState((s) => (opts?.background && s === "ready" ? "ready" : "error"));
    }
  }, [handleSessionInvalidated]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(["achievements"], load);

  if (state === "loading" && !counts) return <LoadingState label="Loading your achievements..." />;
  if (state === "error") return <ErrorState message="Couldn't load your achievements." onRetry={load} />;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-slate-800 sm:text-2xl">My Achievements</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Submit proof of your awards for SAA validation and official recording.
          </p>
        </div>
        <button type="button" onClick={() => setSubmitOpen(true)} className={primaryButtonClass}>
          <Plus size={15} /> New submission
        </button>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: "Pending validation", value: counts.pending, cls: "text-status-warning" },
          { label: "Approved", value: counts.approved, cls: "text-status-success" },
          { label: "Rejected", value: counts.rejected, cls: "text-status-danger" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl2 border border-slate-200 bg-white px-4 py-3 shadow-card">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${c.cls}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No submissions yet"
          description="Use “New submission” to send your certificate for validation."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((a) => {
            const style = STATUS_STYLE[a.status];
            return (
              <li key={a.id} className="rounded-xl2 border border-slate-200 bg-white p-4 shadow-card sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-heading text-[15px] font-semibold text-slate-800">{a.title}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {a.program}
                      {a.year_level ? ` · ${a.year_level}` : ""} · Achieved {formatDate(a.date_achieved)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style.cls}`}>{style.label}</span>
                </div>

                {a.description && <p className="mt-2.5 whitespace-pre-wrap text-sm text-slate-600">{a.description}</p>}

                {a.status === "rejected" && a.rejection_reason && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600">Reason for rejection</p>
                    <p className="mt-0.5 text-sm text-red-700">{a.rejection_reason}</p>
                  </div>
                )}

                {a.files?.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {a.files.map((f) => (
                      <li key={f.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                        <Paperclip size={12} className="shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate text-slate-600">{f.original_name}</span>
                        <button type="button" onClick={() => setViewing(f)} className="shrink-0 text-slate-400 hover:text-brand-blue">
                          <Eye size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <SubmitModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        colleges={colleges}
        onSubmitted={() => {
          load();
          refreshSummary();
        }}
      />

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
