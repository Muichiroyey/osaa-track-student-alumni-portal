import { useCallback, useEffect, useState } from "react";
import { UserCircle, Loader2, Save, Info } from "lucide-react";
import { api, ApiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useSummary } from "../context/SummaryContext.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import ErrorState from "../components/ui/ErrorState.jsx";
import { inputClass, labelClass, selectClass, textareaClass, primaryButtonClass } from "../components/ui/formStyles.js";
import { phNow } from "../utils/time.js";

/**
 * Graduate tracer record. The fields here are exactly the ones the
 * alumni_profiles table defines — name, program, batch year, employment
 * status, employer, job description. Contact number and address are
 * deliberately absent: they aren't Alumni Profile fields in this system,
 * and inventing them here would put data in the directory the Admin
 * Panel has nowhere to show.
 *
 * Name is read-only because it follows the account the SAA office issued
 * — changing it is a User Management action, not a self-service one.
 */
export default function AlumniProfile() {
  const { user, handleSessionInvalidated } = useAuth();
  const { notify } = useToast();
  const { refresh: refreshSummary } = useSummary();

  const [form, setForm] = useState({ program: "", batchYear: "", employmentStatus: "", employer: "", jobDescription: "" });
  const [statuses, setStatuses] = useState([]);
  const [account, setAccount] = useState(null);
  const [state, setState] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const data = await api.get("/api/portal/profile");
      setStatuses(data.employmentStatuses);
      setAccount(data.account);
      setForm({
        program: data.profile?.program || data.account.department || "",
        batchYear: data.profile?.batch_year || "",
        employmentStatus: data.profile?.employment_status || "",
        employer: data.profile?.employer || "",
        jobDescription: data.profile?.job_description || "",
      });
      setState("ready");
    } catch (err) {
      if (handleSessionInvalidated(err)) return;
      setState("error");
    }
  }, [handleSessionInvalidated]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Employer and job description only make sense for someone who is
  // working — hiding them otherwise keeps stale employer names out of the
  // tracer data.
  const employed = ["Employed", "Self-employed"].includes(form.employmentStatus);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await api.put("/api/portal/profile", {
        ...form,
        batchYear: form.batchYear || null,
        employer: employed ? form.employer : null,
        jobDescription: employed ? form.jobDescription : null,
      });
      notify("Profile updated.");
      refreshSummary();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (state === "loading") return <LoadingState label="Loading your profile..." />;
  if (state === "error") return <ErrorState message="Couldn't load your profile." onRetry={load} />;

  return (
    <>
      <div className="mb-5">
        <h1 className="font-heading text-xl font-bold text-slate-800 sm:text-2xl">Alumni Profile</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Keep your graduate and employment information current — this is what the SAA office uses for graduate tracer
          reporting.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-5">
        <section className="rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <UserCircle size={24} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-base font-semibold text-slate-800">{account.name}</p>
              <p className="truncate text-sm text-slate-500">{account.email}</p>
              {account.code && <p className="text-xs text-slate-400">{account.code}</p>}
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
            <Info size={13} className="mt-0.5 shrink-0" />
            Your name and email come from the account the SAA office issued. Contact the office if either needs
            correcting.
          </p>
        </section>

        <section className="space-y-4 rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Program / degree</label>
              <input className={inputClass} placeholder="e.g. BS Business Administration" value={form.program} onChange={set("program")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Batch / graduation year</label>
              <input
                type="number"
                className={inputClass}
                placeholder="e.g. 2021"
                min={1950}
                max={phNow().year + 1}
                value={form.batchYear}
                onChange={set("batchYear")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Employment status</label>
            <select className={selectClass} value={form.employmentStatus} onChange={set("employmentStatus")}>
              <option value="">Select your current status</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {employed && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Employer / company</label>
                <input className={inputClass} placeholder="Where you currently work" value={form.employer} onChange={set("employer")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Job description</label>
                <textarea
                  rows={3}
                  className={textareaClass}
                  placeholder="Your role and main responsibilities"
                  value={form.jobDescription}
                  onChange={set("jobDescription")}
                />
              </div>
            </>
          )}

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</div>}

          <div className="flex justify-end">
            <button type="button" onClick={save} disabled={saving} className={primaryButtonClass}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save changes
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
