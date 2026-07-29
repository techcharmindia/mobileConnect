"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Staff = { id: number; name: string; role: string; store: string };
const demoStaff: Staff[] = [
  { id: 0, name: "Vanshika", role: "sales", store: "Underwood" },
];

export default function TelstraLogin() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>(demoStaff);
  const [name, setName] = useState("Vanshika");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    fetch("/api/telstra/staff")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.staff?.length) {
          setStaff(data.staff);
          setName(data.staff[0].name);
        }
      })
      .catch(() => undefined);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/telstra/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message ?? "Login failed.");
        return;
      }
      sessionStorage.setItem("telstra-user", JSON.stringify(data.user));
      router.push("/telstra/workspace");
    } catch {
      setMessage(
        "Could not reach the staff database. Please check PostgreSQL configuration.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-content">
        <Link href="/dashboard" className="back-link">
          ← Back to workspaces
        </Link>
        <div className="auth-brand">
          <span className="brand-mark">M</span>
        </div>
        <h1>Telstra workspace</h1>
        <p className="auth-subtitle">Sign in with your staff profile</p>
        <form className="auth-card" onSubmit={submit}>
          <label className="field">
            <span>Staff member</span>
            <select
              value={name}
              onChange={(event) => setName(event.target.value)}
            >
              {staff.map((person) => (
                <option key={person.id} value={person.name}>
                  {person.name} · {person.store}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>PIN</span>
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Enter your PIN"
              type="password"
              inputMode="numeric"
            />
          </label>
          {message && <p className="login-error">{message}</p>}
          <button
            className="button button-primary auth-submit"
            disabled={loading}
            type="submit"
          >
            {loading ? "Checking…" : "Log in to Telstra"}
          </button>
          <p className="demo-details">
            Staff profiles and PINs are read from PostgreSQL. Run{" "}
            <code>database/schema.sql</code> before adding staff.
          </p>
        </form>
      </section>
    </main>
  );
}
