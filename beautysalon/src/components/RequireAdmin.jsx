// src/components/RequireAdmin.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

/**
 * Guards children so only signed-in users who exist in `admins` can see them.
 * - If not signed in -> redirects to /signin?next=<current>
 * - If signed in but not admin -> shows a small "no access" message
 * No setTimeout; resolves based on actual responses only.
 */
export default function RequireAdmin({ children }) {
    const nav = useNavigate();
    const loc = useLocation();
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [errMsg, setErrMsg] = useState("");

    useEffect(() => {
        let cancelled = false;
        let unsubAuth = null;

        async function runCheck() {
            if (cancelled) return;
            setLoading(true);
            setErrMsg("");

            // 1) get session
            const { data: sessRes, error: sessErr } = await supabase.auth.getSession();
            if (cancelled) return;

            if (sessErr) {
                setErrMsg(sessErr.message);
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            const user = sessRes?.session?.user ?? null;

            if (!user) {
                setLoading(false);
                if (!cancelled) {
                    nav(`/signin?next=${encodeURIComponent(loc.pathname + loc.search)}`, {
                        replace: true,
                    });
                }
                return;
            }

            // 2) check admins table (needs RLS policy to read own row)
            const { data: rows, error } = await supabase
                .from("admins")
                .select("user_id")
                .eq("user_id", user.id)
                .limit(1);

            if (cancelled) return;

            if (error) {
                setErrMsg(error.message);
                setIsAdmin(false);
            } else {
                setIsAdmin((rows?.length ?? 0) > 0);
            }
            setLoading(false);
        }

        // initial check
        runCheck();

        // listen for auth changes
        const { data: sub } = supabase.auth.onAuthStateChange(() => {
            if (!cancelled) runCheck();
        });
        unsubAuth = () => sub?.subscription?.unsubscribe?.();

        return () => {
            cancelled = true;
            if (unsubAuth) unsubAuth();
        };
    }, [loc.pathname, loc.search, nav]);

    if (loading) {
        return <div className="container-slim py-10">Checking admin access…</div>;
    }

    if (errMsg) {
        return (
            <div className="container-slim py-10">
                <div className="card">
                    <div className="text-lg font-semibold mb-1">Access check failed</div>
                    <p className="text-sm text-red-600 mb-3">{errMsg}</p>
                    <div className="flex gap-2">
                        <a className="btn" href="/signin">Sign in</a>
                        <button className="btn" onClick={() => location.reload()}>Retry</button>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="container-slim py-10">
                <div className="card">
                    <div className="text-lg font-semibold mb-1">No access</div>
                    <p className="text-sm text-gray-600">
                        You’re signed in but not authorized to view the admin panel.
                    </p>
                </div>
            </div>
        );
    }

    return children;
}
