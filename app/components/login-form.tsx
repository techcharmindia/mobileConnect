"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_USERNAME = "demo@mobileconnect.com";
const DEMO_PASSWORD = "mobile123";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      username.trim().toLowerCase() !== DEMO_USERNAME ||
      password !== DEMO_PASSWORD
    ) {
      setError(
        "Incorrect login details. Please use the demo credentials below.",
      );
      return;
    }
    sessionStorage.setItem("mobileconnect-user", "Demo Admin");
    router.push("/dashboard");
  }
  return (
    <main className="auth-page">
      <section className="auth-content">
        <div className="auth-brand">
          <span className="brand-mark">M</span>
        </div>
        <h1>Mobile Connect</h1>
        <p className="auth-subtitle">Sign in to access your workspaces</p>
        <form className="auth-card" onSubmit={submit}>
          <label className="field">
            <span>Login</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Email address"
              autoComplete="username"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              type="password"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button className="button button-primary auth-submit" type="submit">
            Log in
          </button>
          <p className="demo-details">
            Demo login: <b>demo@mobileconnect.com</b>
            <br />
            Password: <b>mobile123</b>
          </p>
        </form>
        <p className="auth-footer">One login for Telstra, POS and Repair.</p>
      </section>
    </main>
  );
}
