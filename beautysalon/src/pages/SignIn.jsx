import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function SignIn() {
    const [mode, setMode] = useState("signin"); // "signin" | "signup"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState("");
    const [search] = useSearchParams();
    const nav = useNavigate();

    const next = search.get("next") || "/admin";

    useEffect(() => {
        (async () => {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.user) nav(next, { replace: true });
        })();
    }, [nav, next]);

    async function handleSignIn(e) {
        e.preventDefault();
        setError("");
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) return setError(error.message);
        // success
        nav(next, { replace: true });
    }

    async function handleSignUp(e) {
        e.preventDefault();
        setError("");
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) return setError(error.message);

        // If email confirmations are OFF, you'll have a session and can redirect immediately.
        // If confirmations are ON, session will be null until user confirms.
        if (data?.session) {
            nav(next, { replace: true });
        } else {
            // account created but may require email confirmation depending on your Auth settings
            setMode("signin");
        }
    }

    return (
        <main className="container-slim py-12">
            <div className="max-w-md mx-auto card">
                <h1 className="text-2xl font-semibold mb-2">
                    {mode === "signin" ? "Admin sign in" : "Create admin account"}
                </h1>
                <p className="text-sm text-gray-600 mb-6">
                    Use your email and password.
                </p>

                <form
                    onSubmit={mode === "signin" ? handleSignIn : handleSignUp}
                    className="grid gap-3"
                >
                    <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        className="border rounded-xl px-3 py-2"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                    />

                    <div className="relative">
                        <input
                            type={showPwd ? "text" : "password"}
                            required
                            placeholder="Password"
                            className="border rounded-xl px-3 py-2 w-full pr-10"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete={mode === "signin" ? "current-password" : "new-password"}
                            minLength={6}
                        />
                        <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500"
                            onClick={() => setShowPwd((v) => !v)}
                            aria-label={showPwd ? "Hide password" : "Show password"}
                        >
                            {showPwd ? "Hide" : "Show"}
                        </button>
                    </div>

                    {error && <div className="text-sm text-red-600">{error}</div>}

                    <button className="btn btn-primary">
                        {mode === "signin" ? "Sign in" : "Sign up"}
                    </button>
                </form>

                <div className="mt-4 text-sm text-gray-600">
                    {mode === "signin" ? (
                        <>
                            Don’t have an account?{" "}
                            <button className="link" onClick={() => setMode("signup")}>
                                Create one
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{" "}
                            <button className="link" onClick={() => setMode("signin")}>
                                Sign in
                            </button>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
