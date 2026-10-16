"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Listens to /events and re-fetches the current page's server data whenever
// anyone changes something, so every open browser stays in sync.
export default function LiveIndicator() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const source = new EventSource("/events");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.addEventListener("change", () => {
      // Coalesce bursts of changes into one refresh.
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 150);
    });
    return () => {
      source.close();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router]);

  return (
    <span className="flex items-center gap-1.5 text-xs text-neutral-500" title={connected ? "Live updates on" : "Reconnecting…"}>
      <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} aria-hidden="true" />
      <span className="hidden md:inline">{connected ? "Live" : "Reconnecting"}</span>
    </span>
  );
}
