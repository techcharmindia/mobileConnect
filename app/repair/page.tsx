import Link from "next/link";

export default function RepairPage() {
  return (
    <main className="empty-page">
      <Link href="/dashboard" className="brand">
        <span className="brand-mark">M</span>
        <span>Mobile Connect</span>
      </Link>
      <div>
        <p className="eyebrow">Repair</p>
        <h1>Repair workspace</h1>
        <p>This workspace is ready for your repair workflow.</p>
        <Link className="button button-secondary" href="/dashboard">
          Back to apps
        </Link>
      </div>
    </main>
  );
}
