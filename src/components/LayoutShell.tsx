"use client";

import { useEffect, useState, ReactNode } from "react";
import Header from "@/components/Header";

export default function LayoutShell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for client-side mount (for theming, layout shifts, etc.)
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-muted border-t-primary rounded-full" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
