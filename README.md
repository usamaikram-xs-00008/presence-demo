# Presence demo

Next.js app that reports whether you are active on the page, idle, away, or the screen is locked.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What each state means

- **Active** — this tab is visible, and you moved the pointer, typed, scrolled, or used the mouse wheel in the last 30 seconds.
- **Idle** — this tab is still visible, and none of those inputs happened for 30 seconds.
- **Away** — the page is hidden. Another tab, a minimized window, and switching to another app all show this state. The page cannot tell those apart.
- **Locked** — the screen is locked. Chrome, Edge, and other Chromium browsers can report this after you allow it.

## How to test

1. **Active.** Move the pointer or type. The status should say “Active on this page.”
2. **Idle.** Leave this tab in front and do not touch the mouse or keyboard for 30 seconds. The status should say “Idle on this page.”
3. **Away.** Switch to another tab, or minimize the window. The status should say “Away (other tab, minimized, or another app).” Come back to the tab and it returns to Active.
4. **Locked.** Use Chrome or Edge. Click **Allow screen-lock detection** and accept the browser prompt. Lock the screen with Win+L. The status should say “Screen locked.” Unlock the screen and return to the page.

Firefox and Safari do not support screen-lock detection. In those browsers a lock is reported as Away, because the page becomes hidden.
