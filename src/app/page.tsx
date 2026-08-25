"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { ready, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [ready, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-gray-400">Loading…</div>
  );
}
