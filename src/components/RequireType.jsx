import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Client-side half of the account-type rule: a student who types an
 * alumni URL (or follows a stale bookmark) is sent back to their own home
 * instead of rendering a page that would only 403 on every request.
 * The server enforces the same rule independently — see requireType.
 */
export default function RequireType({ type, children }) {
  const { user } = useAuth();
  if (!user) return null;
  if (user.type !== type) return <Navigate to="/" replace />;
  return children;
}
