"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export type Presence = "active" | "idle" | "away" | "locked";

const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel"] as const;
const IDLE_MS_DEFAULT = 30_000;
const SCREEN_LOCK_THRESHOLD_MS = 60_000;

interface IdleDetectorInstance extends EventTarget {
  userState: "active" | "idle" | null;
  screenState: "locked" | "unlocked" | null;
  start: (options?: { threshold?: number; signal?: AbortSignal }) => Promise<void>;
}

interface IdleDetectorConstructor {
  new (): IdleDetectorInstance;
  requestPermission: () => Promise<PermissionState>;
}

function getIdleDetector(): IdleDetectorConstructor | null {
  if (typeof window === "undefined" || !("IdleDetector" in window)) return null;
  return (window as Window & { IdleDetector: IdleDetectorConstructor }).IdleDetector;
}

export function usePresence(idleMs = IDLE_MS_DEFAULT) {
  const [presence, setPresence] = useState<Presence>("active");
  const [screenLockPermission, setScreenLockPermission] = useState<PermissionState>("prompt");
  const screenLockSupported = useSyncExternalStore(
    () => () => {},
    () => getIdleDetector() !== null,
    () => false,
  );

  const idleRef = useRef(false);
  const lockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const detectorAbortRef = useRef<AbortController | null>(null);

  const compute = useCallback((): Presence => {
    if (lockedRef.current) return "locked";
    if (document.visibilityState === "hidden") return "away";
    if (idleRef.current) return "idle";
    return "active";
  }, []);

  const publish = useCallback(() => {
    const next = compute();
    setPresence((current) => (current === next ? current : next));
  }, [compute]);

  const armIdleTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      idleRef.current = true;
      publish();
    }, idleMs);
  }, [idleMs, publish]);

  const markActive = useCallback(() => {
    const wasIdle = idleRef.current;
    idleRef.current = false;
    armIdleTimer();
    if (wasIdle) publish();
  }, [armIdleTimer, publish]);

  const beginScreenLockWatch = useCallback(async () => {
    const IdleDetector = getIdleDetector();
    if (!IdleDetector || detectorAbortRef.current) return;

    const abort = new AbortController();
    detectorAbortRef.current = abort;

    try {
      const detector = new IdleDetector();
      detector.addEventListener("change", () => {
        lockedRef.current = detector.screenState === "locked";
        if (!lockedRef.current && document.visibilityState === "visible") {
          idleRef.current = false;
          armIdleTimer();
        }
        publish();
      });

      await detector.start({
        threshold: SCREEN_LOCK_THRESHOLD_MS,
        signal: abort.signal,
      });
    } catch (error) {
      if (detectorAbortRef.current === abort) detectorAbortRef.current = null;
      if (error instanceof DOMException && (error.name === "AbortError" || error.name === "NotAllowedError")) {
        return;
      }
      console.error(error);
    }
  }, [armIdleTimer, publish]);

  const enableScreenLockDetection = useCallback(async () => {
    const IdleDetector = getIdleDetector();
    if (!IdleDetector || detectorAbortRef.current) return;

    try {
      const permission = await IdleDetector.requestPermission();
      setScreenLockPermission(permission);
      if (permission !== "granted") return;
      await beginScreenLockWatch();
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") return;
      console.error(error);
    }
  }, [beginScreenLockWatch]);

  useEffect(() => {
    const supported = getIdleDetector() !== null;

    idleRef.current = false;
    armIdleTimer();

    const onInput = () => {
      if (document.visibilityState === "hidden" || lockedRef.current) return;
      markActive();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !lockedRef.current) {
        idleRef.current = false;
        armIdleTimer();
        publish();
        return;
      }
      publish();
    };

    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, onInput, { passive: true });
    }
    window.addEventListener("scroll", onInput, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisibility);

    let permissionStatus: PermissionStatus | null = null;
    const onPermissionChange = () => {
      if (!permissionStatus) return;
      setScreenLockPermission(permissionStatus.state);
    };

    if (supported && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "idle-detection" as PermissionName })
        .then((status) => {
          permissionStatus = status;
          setScreenLockPermission(status.state);
          status.addEventListener("change", onPermissionChange);
          if (status.state === "granted") void beginScreenLockWatch();
        })
        .catch(() => {
          // This browser does not expose the idle-detection permission. The button still works in Chromium.
        });
    }

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      detectorAbortRef.current?.abort();
      detectorAbortRef.current = null;
      permissionStatus?.removeEventListener("change", onPermissionChange);
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onInput);
      window.removeEventListener("scroll", onInput, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [armIdleTimer, beginScreenLockWatch, markActive, publish]);

  return {
    presence,
    screenLockSupported,
    screenLockPermission: screenLockSupported ? screenLockPermission : "unsupported",
    enableScreenLockDetection,
  };
}
