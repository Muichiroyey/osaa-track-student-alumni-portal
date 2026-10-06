import { useCallback, useEffect, useRef, useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  UploadCloud,
  Loader2,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCw,
  FileText,
  Building2,
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
import { inputClass, textareaClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../components/ui/formStyles.js";
import { formatDateTime, daysUntil } from "../utils/time.js";

const TONE_BOX = {
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
};
const TONE_ICON = { warning: Clock, success: CheckCircle2, danger: AlertTriangle, info: Loader2, neutral: FileText };

function formatDate(value) {
  return formatDateTime(value, "—");
}

function daysLeft(deadline) {
  return daysUntil(deadline);
}

// ── Drop-or-browse control for a single soft copy ──────────────────────
function SingleFilePicker({ file, onPick, disabled }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
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
    <div className="space-y-2">
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) handle(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-7 text-center transition ${
          dragOver ? "border-brand-blue bg-blue-50" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        {busy ? <Loader2 size={22} className="animate-spin text-brand-blue" /> : <UploadCloud size={22} className="text-slate-400" />}
        <p className="text-xs font-medium text-slate-600">
          {busy ? "Uploading..." : file ? file.original_name : "Drag and drop your file here, or click to browse"}
        </p>
        <p className="text-[11px] text-slate-400">PDF, Word, or image &middot; up to 15 MB</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            handle(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-xs font-medium text-status-danger">{error}</p>}
    </div>
  );
}

// ── Submit a new request ───────────────────────────────────────────────
function SubmitModal({ open, onClose, onSubmitted }) {
  const { notify } = useToast();
  const [documentType, setDocumentType] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setDocumentType("");
      setDescription("");
      setFile(null);
      setError(null);
    }
  }, [open]);

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      const data = await api.post("/api/portal/document-queue", {
        documentType: documentType.trim(),
        description: description.trim(),
        fileId: file?.id,
      });
      notify(`Submitted — your ticket number is ${data.ticketNo}.`);
      onSubmitted(data.item);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Submit a document" maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs leading-relaxed text-sky-800">
          Your document is reviewed as a <strong>soft copy first</strong>. Nothing is printed until the SAA approves it,
          so a correction never costs you a trip or a reprint.
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Document type</label>
          <input
            className={inputClass}
            placeholder="e.g. Good Moral Certificate, Activity Proposal"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Description</label>
          <textarea
            rows={3}
            className={textareaClass}
            placeholder="Briefly explain what this document is for."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Soft copy</label>
          <SingleFilePicker file={file} onPick={setFile} />
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</div>}

        <div className="flex justify-end gap-2.5 pt-1">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={saving || !documentType.trim() || !file} className={primaryButtonClass}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            Submit request
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── One ticket, expanded ───────────────────────────────────────────────
function TicketDetail({ ticketId, onChanged }) {
  const { handleSessionInvalidated } = useAuth();
  const { notify } = useToast();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [viewing, setViewing] = useState(null);
  const [revisionFile, setRevisionFile] = useState(null);
  const [resubmitting, setResubmitting] = useState(false);

  const load = useCallback(async (opts) => {
    setState((s) => (s === "ready" ? "ready" : "loading"));
    try {
      setData(await api.get(`/api/portal/document-queue/${ticketId}`));
      setState("ready");
    } catch (err) {
      if (handleSessionInvalidated(err)) return;
      setState((s) => (opts?.background && s === "ready" ? "ready" : "error"));
    }
  }, [ticketId, handleSessionInvalidated]);

  useEffect(() => {
    load();
    setRevisionFile(null);
  }, [load]);

  // The moment the SAA decides, signs or releases this ticket, it updates here.
  useLiveRefresh(["document-queue"], load);

  async function resubmit() {
    setResubmitting(true);
    try {
      await api.post(`/api/portal/document-queue/${ticketId}/resubmit`, { fileId: revisionFile.id });
      notify("Corrected copy sent back to the SAA under the same ticket number.");
      setRevisionFile(null);
      await load();
      onChanged?.();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not resubmit.", "error");
    } finally {
      setResubmitting(false);
    }
  }

  if (state === "loading") return <LoadingState label="Loading ticket..." />;
  if (state === "error") return <ErrorState message="Couldn't load this ticket." onRetry={load} />;

  const ticket = data.item;
  const guidance = ticket.guidance;
  const GuidanceIcon = TONE_ICON[guidance.tone] || FileText;
  const remaining = daysLeft(ticket.revision_deadline);

  return (
    <div className="space-y-5">
      <div className={`flex items-start gap-3 rounded-xl2 border px-4 py-3.5 ${TONE_BOX[guidance.tone]}`}>
        <GuidanceIcon size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{guidance.label}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed opacity-90">{guidance.detail}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl2 border border-slate-200 bg-white p-4 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Ticket number</dt>
          <dd className="font-semibold text-slate-800">{ticket.ticket_no}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Status</dt>
          <dd className="mt-0.5">
            <StatusBadge status={ticket.status} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Document type</dt>
          <dd className="text-slate-700">{ticket.document_type}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Submitted</dt>
          <dd className="text-slate-700">{formatDate(ticket.submitted_at)}</dd>
        </div>
        {ticket.description && (
          <div className="col-span-2">
            <dt className="text-xs text-slate-500">Description</dt>
            <dd className="whitespace-pre-wrap text-slate-700">{ticket.description}</dd>
          </div>
        )}
      </dl>

      {ticket.remarks && (
        <div className="rounded-xl2 border border-slate-200 bg-white p-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">SAA remarks</p>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{ticket.remarks}</p>
        </div>
      )}

      {/* Revision loop — same ticket number, no printing */}
      {ticket.status === "revision_requested" && (
        <div className="rounded-xl2 border border-amber-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Upload your corrected copy</p>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
              {remaining} day{remaining === 1 ? "" : "s"} left &middot; due {formatDate(ticket.revision_deadline)}
            </span>
          </div>
          <SingleFilePicker file={revisionFile} onPick={setRevisionFile} />
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={resubmit} disabled={!revisionFile || resubmitting} className={primaryButtonClass}>
              {resubmitting ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
              Resubmit to ticket {ticket.ticket_no}
            </button>
          </div>
        </div>
      )}

      {/* E-signature routing progress */}
      {data.routes.length > 0 && (
        <div className="rounded-xl2 border border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">E-signature routing</p>
          <ul className="space-y-2">
            {data.routes.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                <Building2 size={15} className="shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{r.officeName}</span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    r.stage === "Signed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {r.stage}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Files */}
      <div className="rounded-xl2 border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Files</p>
        <ul className="space-y-2">
          {ticket.file && (
            <li className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
              <FileText size={15} className="shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-slate-700">{ticket.file.original_name}</span>
              <span className="shrink-0 text-[11px] text-slate-400">Your submission</span>
              <button type="button" onClick={() => setViewing(ticket.file)} className="shrink-0 text-slate-400 hover:text-brand-blue">
                <Eye size={15} />
              </button>
            </li>
          )}
          {ticket.signedFile ? (
            <li className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              <span className="min-w-0 flex-1 truncate font-medium text-emerald-800">{ticket.signedFile.original_name}</span>
              <span className="shrink-0 text-[11px] font-semibold text-emerald-700">Final signed copy</span>
              <button
                type="button"
                onClick={() => downloadFile(ticket.signedFile.id, ticket.signedFile.original_name)}
                className="shrink-0 text-emerald-600 hover:text-emerald-800"
              >
                <Download size={15} />
              </button>
            </li>
          ) : (
            ticket.status === "approved_for_esigning" && (
              <li className="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400">
                The final signed copy appears here once every signature is confirmed.
              </li>
            )
          )}
        </ul>
      </div>

      {viewing && (
        <FileViewerModal
          open
          onClose={() => setViewing(null)}
          fileName={viewing.original_name}
          viewUrl={`/api/uploads/${viewing.id}/view`}
          downloadUrl={`/api/uploads/${viewing.id}/download`}
        />
      )}
    </div>
  );
}

export default function DocumentQueue() {
  const { user, handleSessionInvalidated } = useAuth();
  const { refresh: refreshSummary } = useSummary();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [search, setSearch] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [openTicketId, setOpenTicketId] = useState(null);

  const load = useCallback(
    async (term = "", opts) => {
      setState((s) => (s === "ready" ? "ready" : "loading"));
      try {
        setData(await api.get(`/api/portal/document-queue${term ? `?search=${encodeURIComponent(term)}` : ""}`));
        setState("ready");
      } catch (err) {
        if (handleSessionInvalidated(err)) return;
        setState((s) => (opts?.background && s === "ready" ? "ready" : "error"));
      }
    },
    [handleSessionInvalidated]
  );

  useEffect(() => {
    const t = setTimeout(() => load(search), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [search, load]);

  // Your ticket list follows every decision the SAA makes, live.
  useLiveRefresh(["document-queue"], (o) => load(search, o));

  const afterChange = () => {
    load(search);
    refreshSummary();
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-slate-800 sm:text-2xl">Document Queue</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Submit documents as soft copies for online pre-review. You&rsquo;ll be told here whether to collect a signed
            copy, come to the office, or correct something &mdash; before anything is printed.
          </p>
        </div>
        <button type="button" onClick={() => setSubmitOpen(true)} className={primaryButtonClass}>
          <Plus size={15} /> Submit a document
        </button>
      </div>

      {data?.counts && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Pending SAA", value: data.counts.pending, cls: "text-status-warning" },
            { label: "Needs revision", value: data.counts.needsRevision, cls: "text-status-warning" },
            { label: "Approved", value: data.counts.approved, cls: "text-status-success" },
            { label: "Rejected / expired", value: data.counts.rejected + data.counts.expired, cls: "text-status-danger" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl2 border border-slate-200 bg-white px-4 py-3 shadow-card">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{c.label}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${c.cls}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="relative mb-4">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ticket number or document type"
          className={`${inputClass} pl-9`}
        />
      </div>

      {state === "loading" && !data ? (
        <LoadingState label="Loading your requests..." />
      ) : state === "error" ? (
        <ErrorState message="Couldn't load your document queue." onRetry={() => load(search)} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={search ? "No matching requests" : "No document requests yet"}
          description={
            search
              ? "Try a different ticket number or document type."
              : "Use “Submit a document” to send your first soft copy for SAA review."
          }
        />
      ) : (
        <ul className="space-y-3">
          {data.items.map((t) => (
            <li key={t.id} className="overflow-hidden rounded-xl2 border border-slate-200 bg-white shadow-card">
              <button
                type="button"
                onClick={() => setOpenTicketId(openTicketId === t.id ? null : t.id)}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 text-left transition hover:bg-slate-50 sm:px-5"
              >
                <span className="font-mono text-sm font-bold text-slate-800">{t.ticket_no}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{t.document_type}</span>
                <StatusBadge status={t.status} />
                <span className="hidden text-xs text-slate-400 sm:inline">{formatDate(t.submitted_at)}</span>
              </button>
              {openTicketId === t.id && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-5">
                  <TicketDetail ticketId={t.id} onChanged={afterChange} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <SubmitModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmitted={(item) => {
          afterChange();
          setOpenTicketId(item.id);
        }}
      />
    </>
  );
}
