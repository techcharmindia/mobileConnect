"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AppHeader() {
  const router = useRouter();
  function logout() {
    sessionStorage.removeItem("mobileconnect-user");
    router.push("/login");
  }
  return (
    <header className="topbar">
      <Link
        className="brand"
        href="/dashboard"
        aria-label="MobileConnectOS dashboard"
      >
        <span className="brand-mark">M</span>
        <span>
          MobileConnect<span className="brand-accent">OS</span>
        </span>
      </Link>
      <button
        className="profile-button"
        type="button"
        onClick={logout}
        aria-label="Log out"
      >
        <span className="profile-avatar">MC</span>
        <span className="profile-name">Log out</span>
      </button>
    </header>
  );
}
