"use client";
import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800",
        className,
      )}
    >
      {children}
    </div>
  );
}

type ButtonVariant = "primary" | "ghost" | "danger" | "outline";

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none";
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-gradient-to-r from-atria-navy-800 to-atria-green-600 text-white hover:from-atria-navy-700 hover:to-atria-green-500 shadow-sm",
    outline:
      "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700",
    ghost: "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
    danger: "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20",
  };
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-atria-green-600 focus:outline-none focus:ring-2 focus:ring-atria-green-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-atria-green-900",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: "gray" | "green" | "amber" | "red" | "navy";
}) {
  const tones: Record<string, string> = {
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    green: "bg-atria-green-100 text-atria-green-800 dark:bg-atria-green-950 dark:text-atria-green-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    navy: "bg-atria-navy-100 text-atria-navy-800 dark:bg-atria-navy-900 dark:text-atria-navy-200",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
      <Loader2 className="h-4 w-4 animate-spin" /> {label || "Loading…"}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
      {message}
    </div>
  );
}
