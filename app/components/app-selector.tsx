"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const applications = [
  { href: "/telstra", icon: "▥", name: "Telstra", description: "CRM & sales" },
  { href: "/pos", icon: "🛒", name: "POS", description: "Till & stock" },
  {
    href: "/repair",
    icon: "🔧",
    name: "Repair",
    description: "Device tickets",
  },
];

export default function AppSelector() {
  const router = useRouter();
  function logout() {
    sessionStorage.removeItem("mobileconnect-user");
    router.push("/");
  }
  return (
    <main className="selector-page">
      <header className="selector-header">
        <span>
          Logged in as <b>Demo Admin</b>
        </span>
        <nav>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </nav>
      </header>
      <section className="selector-content">
        <div className="selector-brand">
          <span className="brand-mark">M</span>
          <h1>Mobile Connect</h1>
          <p>Choose where you&apos;re working</p>
        </div>
        <div className="app-grid">
          {applications.map((app) => (
            <Link key={app.name} href={app.href} className="app-choice">
              <span className="app-icon">{app.icon}</span>
              <strong>{app.name}</strong>
              <small>{app.description}</small>
            </Link>
          ))}
        </div>
        <div className="selector-links">
          <a href="#">Business Dashboard</a>
          <span>·</span>
          <a href="#">Manage staff & access</a>
        </div>
      </section>
    </main>
  );
}
