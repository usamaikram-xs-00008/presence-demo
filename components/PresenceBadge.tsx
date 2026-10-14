"use client";

import { useEffect, useRef, useState } from "react";
import { usePresence, type Presence } from "@/hooks/usePresence";

const LABEL: Record<Presence, string> = {
  active: "Active on this page",
  idle: "Idle on this page",
  away: "Away (other tab, minimized, or another app)",
  locked: "Screen locked",
};

const HISTORY_LIMIT = 30;

type HistoryEntry = {
  id: number;
  presence: Presence;
  at: string;
};

export function PresenceBadge() {
  const { presence, screenLockSupported, screenLockPermission, enableScreenLockDetection } =
    usePresence(30_000);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const lastPresence = useRef<Presence | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    if (lastPresence.current === presence) return;
    lastPresence.current = presence;
    const id = nextId.current;
    nextId.current += 1;
    setHistory((current) =>
      [{ id, presence, at: new Date().toLocaleTimeString() }, ...current].slice(0, HISTORY_LIMIT),
    );
  }, [presence]);

  return (
    <section>
      <p data-presence={presence}>{LABEL[presence]}</p>
      {screenLockSupported && screenLockPermission !== "granted" && (
        <button type="button" onClick={() => void enableScreenLockDetection()}>
          Allow screen-lock detection
        </button>
      )}
      {screenLockSupported && screenLockPermission === "granted" && (
        <p>Screen-lock detection is allowed.</p>
      )}
      {!screenLockSupported && (
        <p>This browser cannot report screen lock. A lock shows up as Away.</p>
      )}
      <h2>History</h2>
      <ol className="presence-history">
        {history.map((entry) => (
          <li key={entry.id} data-presence={entry.presence}>
            <time>{entry.at}</time>
            <span>{LABEL[entry.presence]}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
