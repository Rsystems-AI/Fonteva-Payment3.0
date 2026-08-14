import type { Metadata } from "next";
import "./globals.css";
import { AuthGate } from "@/components/shell/AuthGate";
import { ToastContainer } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Fonteva Payments 3.0 — AI Upgrade Assistant",
  description:
    "AI-orchestrated Fonteva Payments 3.0 upgrades — multi-agent pipeline, HITL governance, real-time visibility.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ToastContainer />
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
