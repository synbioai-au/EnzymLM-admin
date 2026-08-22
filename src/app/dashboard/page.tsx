"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogOut, Gauge, Users, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { ModelsPanel } from "@/components/ModelsPanel";
import { UsersPanel } from "@/components/UsersPanel";
import { UsagePanel } from "@/components/UsagePanel";

type Tab = "models" | "users" | "usage";

const TABS: { id: Tab; label: string; icon: typeof Gauge }[] = [
  { id: "models", label: "Model defaults", icon: SlidersHorizontal },
  { id: "users", label: "Users", icon: Users },
  { id: "usage", label: "Usage this month", icon: Gauge },
];

export default function DashboardPage() {
  const { ready, isAuthenticated, isAdmin, user, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("models");

  useEffect(() => {
    if (ready && !isAuthenticated) router.replace("/login");
  }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated) return <Spinner label="Checking session…" />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldCheck className="h-10 w-10 text-gray-300" />
        <div>
          <h1 className="text-lg font-semibold">Admin access required</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">This account isn’t an administrator.</p>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-atria-navy-800 to-atria-green-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-atria-navy-800 dark:text-gray-100">
                SynBio Admin
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Usage limits</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 dark:text-gray-400 sm:inline">{user?.email}</span>
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 max-w-2xl">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Usage limits</h1>
          <p className="mt-2 text-pretty text-sm text-slate-600 dark:text-slate-400">
            Per-user monthly caps on how many times each task — and each model within it — can run. Set defaults for
            everyone, override per user, and watch usage. Nothing runs uncapped.
          </p>
        </div>
        <nav className="mb-8 flex gap-1 border-b border-slate-200 dark:border-slate-800">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-atria-green-600 text-slate-900 dark:text-white"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </nav>

        {tab === "models" && <ModelsPanel />}
        {tab === "users" && <UsersPanel />}
        {tab === "usage" && <UsagePanel />}
      </main>
    </div>
  );
}
