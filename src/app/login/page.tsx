"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";
import { login as apiLogin, googleLogin, type LoginResult } from "@/lib/api";
import { Button, Input, ErrorNote } from "@/components/ui";

function LoginInner({ showGoogle }: { showGoogle: boolean }) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Shared post-auth path for both password and Google sign-in.
  const finishAuth = (data: LoginResult, fallbackEmail?: string) => {
    if (!data.isApproved) {
      setError(data.message || "Your account is pending approval.");
      return;
    }
    if (data.role !== "admin") {
      setError("This dashboard is for administrators only.");
      return;
    }
    if (!data.token) {
      setError("Authentication failed. Please try again.");
      return;
    }
    login(data.token, {
      id: data._id || data.id || data.userId || "",
      email: data.email || fallbackEmail || "",
      name: data.name,
      role: data.role,
    });
    router.replace("/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      finishAuth(await apiLogin(email, password), email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential: string) => {
    setLoading(true);
    setError("");
    try {
      finishAuth(await googleLogin(credential));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-atria-mint/95 via-white to-atria-navy-50/95 opacity-90 dark:from-atria-navy-950/90 dark:via-gray-900 dark:to-atria-navy-900/50" />
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-atria-navy-300/30 blur-3xl dark:bg-atria-navy-700/25" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-atria-green-300/35 blur-3xl dark:bg-atria-green-800/20" />

      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-atria-navy-800 to-atria-green-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-atria-navy-800 dark:text-gray-100">SynBio Admin</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Usage limits console</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="email"
                required
                className="pl-9"
                placeholder="admin@atriauniversity.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="password"
                required
                className="pl-9"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <ErrorNote message={error} />}

          <Button type="submit" disabled={loading} className="w-full py-2.5">
            {loading ? "Signing in…" : (
              <>
                Sign In <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {showGoogle && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                <span className="bg-white px-3 text-gray-400 dark:bg-gray-800 dark:text-gray-500">Or continue with</span>
              </div>
            </div>
            <div className="flex justify-center [&>div]:w-full [&>div>div]:!w-full">
              <GoogleLogin
                onSuccess={(c: CredentialResponse) => {
                  if (c.credential) void handleGoogle(c.credential);
                }}
                onError={() => setError("Google sign-in was cancelled or failed.")}
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                width={384}
              />
            </div>
          </>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">Administrators only.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  if (clientId) {
    return (
      <GoogleOAuthProvider clientId={clientId}>
        <LoginInner showGoogle />
      </GoogleOAuthProvider>
    );
  }
  return <LoginInner showGoogle={false} />;
}
