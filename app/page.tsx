import { PresenceBadge } from "@/components/PresenceBadge";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>Presence demo</h1>
      <PresenceBadge />
      <h2>How to test</h2>
      <ul>
        <li>Active: move the pointer, type, or scroll.</li>
        <li>Idle: leave this tab visible and do nothing for 30 seconds.</li>
        <li>Away: switch to another tab or minimize the window.</li>
        <li>Locked: in Chrome or Edge, click Allow screen-lock detection, then press Win+L.</li>
      </ul>
    </main>
  );
}
