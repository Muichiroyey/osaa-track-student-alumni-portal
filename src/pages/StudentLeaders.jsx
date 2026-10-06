import { useCallback, useEffect, useState } from "react";
import { Network, Search, ArrowLeft, FileText, Download, Eye, Users } from "lucide-react";
import { api, downloadFile } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLiveRefresh } from "../context/LiveUpdatesContext.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import ErrorState from "../components/ui/ErrorState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import ProtectedImage from "../components/ui/ProtectedImage.jsx";
import psuSeal from "../assets/psu-seal.png";
import HierarchyChart from "../components/ui/HierarchyChart.jsx";
import FileViewerModal from "../components/ui/FileViewerModal.jsx";
import { categoryToneClasses } from "../components/ui/categoryTone.js";
import { inputClass } from "../components/ui/formStyles.js";

function LogoRow({ organization }) {
  const logos = [
    // No PSU logo uploaded → the standard PSU seal, same as the admin panel.
    { file: organization.psu_logo, label: organization.psu_name, seal: true },
    { file: organization.college_logo, label: organization.college_name },
    { file: organization.org_logo, label: organization.name },
  ].filter((l) => l.file || l.label);

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 border-b border-slate-100 pb-5">
      {logos.map((l, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <ProtectedImage
            file={l.file}
            alt={l.label || ""}
            className="size-16 rounded-full border border-slate-200"
            fallback={
              l.seal ? (
                <img src={psuSeal} alt={l.label || ""} className="size-16 rounded-full border border-slate-200 object-cover" />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-300"><Users size={20} /></div>
              )
            }
          />
          {l.label && <p className="max-w-[140px] text-center text-[11px] text-slate-500">{l.label}</p>}
        </div>
      ))}
    </div>
  );
}

// View-only directory: students use it to find the right officer to
// contact. No edit handlers are passed to HierarchyChart, so it renders
// without the admin's edit/delete affordances.
function OrganizationDetail({ id, onBack }) {
  const { handleSessionInvalidated } = useAuth();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async (opts) => {
    setState((s) => (s === "ready" ? "ready" : "loading"));
    try {
      setData(await api.get(`/api/portal/student-leaders/organizations/${id}`));
      setState("ready");
    } catch (err) {
      if (handleSessionInvalidated(err)) return;
      setState((s) => (opts?.background && s === "ready" ? "ready" : "error"));
    }
  }, [id, handleSessionInvalidated]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(["student-leaders"], load);

  if (state === "loading") return <LoadingState label="Loading organization..." />;
  if (state === "error") return <ErrorState message="Couldn't load this organization." onRetry={load} />;

  const { organization, officers, documents } = data;

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
      >
        <ArrowLeft size={15} /> All organizations
      </button>

      <div className="rounded-xl2 border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <LogoRow organization={organization} />
        <h1 className="mt-5 text-center font-heading text-lg font-bold text-slate-800 sm:text-xl">{organization.name}</h1>

        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Organizational chart</p>
          {officers.length === 0 ? (
            <EmptyState icon={Users} title="No officers listed yet" />
          ) : (
            <HierarchyChart officers={officers} />
          )}
        </div>
      </div>

      {officers.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-xl2 border border-slate-200 bg-white shadow-card">
          <p className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
            Officers
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold sm:px-5">Name</th>
                  <th className="px-4 py-2.5 font-semibold">Position</th>
                  <th className="px-4 py-2.5 font-semibold">Category</th>
                  <th className="px-4 py-2.5 font-semibold">Reports to</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {officers.map((o) => {
                  // Up to two positions above — listed together when there are two.
                  const above = [o.parent_officer_id, o.second_parent_officer_id]
                    .filter(Boolean)
                    .map((id) => officers.find((p) => p.id === id)?.position)
                    .filter(Boolean);
                  return (
                    <tr key={o.id}>
                      <td className="px-4 py-2.5 font-medium text-slate-700 sm:px-5">{o.name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{o.position}</td>
                      <td className="px-4 py-2.5">
                        {o.category && (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${categoryToneClasses(o.category)}`}>
                            {o.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{above.length > 0 ? above.join(" & ") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-xl2 border border-slate-200 bg-white shadow-card">
        <p className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
          Organization documents
        </p>
        {documents.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400 sm:px-5">No documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center gap-2.5 px-4 py-3 text-sm sm:px-5">
                <FileText size={15} className="shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-700">{d.title || d.file?.original_name || d.doc_type}</p>
                  {d.description && <p className="text-xs text-slate-500">{d.description}</p>}
                  <p className="text-xs text-slate-400">{d.doc_type}</p>
                </div>
                {d.file && (
                  <>
                    <button type="button" onClick={() => setViewing(d.file)} className="shrink-0 text-slate-400 hover:text-brand-blue">
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadFile(d.file.id, d.file.original_name)}
                      className="shrink-0 text-slate-400 hover:text-brand-blue"
                    >
                      <Download size={15} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
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
    </>
  );
}

export default function StudentLeaders() {
  const { handleSessionInvalidated } = useAuth();
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (opts) => {
    setState((s) => (s === "ready" ? "ready" : "loading"));
    try {
      const data = await api.get("/api/portal/student-leaders/organizations");
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

  useLiveRefresh(["student-leaders"], load);

  if (selected) return <OrganizationDetail id={selected} onBack={() => setSelected(null)} />;
  if (state === "loading") return <LoadingState label="Loading organizations..." />;
  if (state === "error") return <ErrorState message="Couldn't load the directory." onRetry={load} />;

  const term = search.trim().toLowerCase();
  const shown = term ? items.filter((o) => o.name.toLowerCase().includes(term)) : items;

  return (
    <>
      <div className="mb-5">
        <h1 className="font-heading text-xl font-bold text-slate-800 sm:text-2xl">Student Leaders Directory</h1>
        <p className="mt-1 text-sm text-slate-500">
          Recognized campus organizations, their officers, and their governing documents. Use it to find the right
          officer for an inquiry or collaboration.
        </p>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organizations"
          className={`${inputClass} pl-9`}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={Network} title={term ? "No matching organizations" : "No organizations listed yet"} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setSelected(o.id)}
              className="flex items-center gap-3.5 rounded-xl2 border border-slate-200 bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <ProtectedImage
                file={o.org_logo}
                alt=""
                className="size-12 shrink-0 rounded-full border border-slate-100"
                fallback={
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-status-indigo/10 text-status-indigo">
                    <Network size={18} />
                  </div>
                }
              />
              <div className="min-w-0">
                <p className="truncate font-heading text-sm font-semibold text-slate-800">{o.name}</p>
                {o.college_name && <p className="truncate text-xs text-slate-500">{o.college_name}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
