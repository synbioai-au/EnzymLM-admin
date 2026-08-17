import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "SynBio Admin — Usage Limits",
  description: "Set per-user, per-model request caps for the EnzymeLM platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
