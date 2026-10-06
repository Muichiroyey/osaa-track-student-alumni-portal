import { useCallback, useEffect, useState } from "react";
import { Rss } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLiveRefresh } from "../context/LiveUpdatesContext.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import ErrorState from "../components/ui/ErrorState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import ProtectedImage from "../components/ui/ProtectedImage.jsx";
import PhotoLightbox from "../components/ui/PhotoLightbox.jsx";
import AuthorAvatar from "../components/ui/AuthorAvatar.jsx";
import PostAttachments, { splitMedia } from "../components/ui/PostAttachments.jsx";
import OfficeFeedFilter, { authorKey } from "../components/ui/OfficeFeedFilter.jsx";
import { formatDateTime } from "../utils/time.js";

function formatWhen(value) {
  return formatDateTime(value, "");
}

/**
 * Facebook-style photo grid, matching how the Admin Panel composes a post:
 * 1 full width, 2 side by side, 3 one large + two stacked, 4+ a 2x2 with a
 * "+N" overlay on the last tile.
 */
function PhotoGrid({ media, onOpen }) {
  if (!media || media.length === 0) return null;
  const count = media.length;
  const tile = (m, i, className, overlay) => (
    <button
      key={m.id}
      type="button"
      onClick={() => onOpen(i)}
      className={`relative overflow-hidden bg-slate-100 ${className}`}
    >
      <ProtectedImage file={m} alt="" className="size-full" />
      {overlay > 0 && (
        <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-2xl font-bold text-white">
          +{overlay}
        </span>
      )}
    </button>
  );

  if (count === 1) return <div className="mt-3 overflow-hidden rounded-xl">{tile(media[0], 0, "h-80 w-full", 0)}</div>;
  if (count === 2)
    return (
      <div className="mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-xl">
        {media.map((m, i) => tile(m, i, "h-64 w-full", 0))}
      </div>
    );
  if (count === 3)
    return (
      <div className="mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-xl">
        {tile(media[0], 0, "row-span-2 h-[calc(16rem+0.25rem)] w-full", 0)}
        {tile(media[1], 1, "h-32 w-full", 0)}
        {tile(media[2], 2, "h-32 w-full", 0)}
      </div>
    );
  return (
    <div className="mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-xl">
      {media.slice(0, 4).map((m, i) => tile(m, i, "h-40 w-full", i === 3 ? count - 4 : 0))}
    </div>
  );
}

// View-only for students — official notices live in Announcements; this is
// campus life.
export default function CampusFeed() {
  const { handleSessionInvalidated } = useAuth();
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");
  const [lightbox, setLightbox] = useState(null);
  const [officeFilter, setOfficeFilter] = useState("all");

  const load = useCallback(async (opts) => {
    setState((s) => (s === "ready" ? "ready" : "loading"));
    try {
      const data = await api.get("/api/portal/campus-feed");
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

  useLiveRefresh(["campus-feed"], load);

  if (state === "loading") return <LoadingState label="Loading campus feed..." />;
  if (state === "error") return <ErrorState message="Couldn't load the campus feed." onRetry={load} />;

  return (
    <>
      <div className="mb-5">
        <h1 className="font-heading text-xl font-bold text-slate-800 sm:text-2xl">Campus Feed</h1>
        <p className="mt-1 text-sm text-slate-500">Community updates and campus life highlights from SAA and the campus offices.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Rss} title="Nothing posted yet" description="Campus updates will show up here." />
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          <OfficeFeedFilter items={items} value={officeFilter} onChange={setOfficeFilter} />
          {items.filter((p) => officeFilter === "all" || authorKey(p) === officeFilter).length === 0 && (
            <EmptyState icon={Rss} title="No posts from this office" description="Choose another office or All offices." />
          )}
          {items.filter((p) => officeFilter === "all" || authorKey(p) === officeFilter).map((post) => {
            const { images, files } = splitMedia(post.media);
            return (
            <article key={post.id} className="rounded-xl2 border border-slate-200 bg-white p-4 shadow-card sm:p-5">
              <header className="flex items-center gap-3">
                <AuthorAvatar post={post} />
                <div className="min-w-0">
                  {/* The real author: the posting office's own name and logo, or SAA for the admin's posts. */}
                  <p className="text-sm font-semibold text-slate-800">{post.author_name}</p>
                  <p className="text-xs text-slate-400">{formatWhen(post.created_at)}</p>
                </div>
              </header>
              {post.title && <h2 className="mt-3 font-heading text-base font-semibold text-slate-800">{post.title}</h2>}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{post.body}</p>
              <PhotoGrid media={images} onOpen={(index) => setLightbox({ media: images, index })} />
              <PostAttachments files={files} />
            </article>
            );
          })}
        </div>
      )}

      {lightbox && (
        <PhotoLightbox
          media={lightbox.media}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(i) => setLightbox((prev) => ({ ...prev, index: i }))}
        />
      )}
    </>
  );
}
