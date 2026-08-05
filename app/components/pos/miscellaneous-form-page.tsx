"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MiscellaneousForm from "./miscellaneous-form";
import { MiscItem } from "./misc-types";

const sidebarItems = [
  { label: "Products", href: "/pos?section=Products" },
  { label: "Miscellaneous", href: "/pos?section=Miscellaneous" },
  { label: "Trade-in Products", href: "/pos?section=Trade-in%20Products" },
  { label: "Inventory transfer", href: "/pos?section=Inventory%20transfer" },
];

type Props = {
  mode: "create" | "edit";
  itemId?: string;
};

export default function MiscellaneousFormPage({ mode, itemId }: Props) {
  const [initial, setInitial] = useState<MiscItem | null>(null);
  const [loading, setLoading] = useState(mode === "edit");

  useEffect(() => {
    if (mode !== "edit" || !itemId) return;
    let active = true;
    fetch(`/api/miscellaneous-items?id=${encodeURIComponent(itemId)}`)
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setInitial(data.items?.[0] ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, itemId]);

  return (
    <main className="today-page pos-page">
      <header className="today-brand">
        <span className="today-logo">
          <i />
          <i />
          <i />
        </span>
        <div>
          <b>Mobile Connect OS</b>
          <small>Point of sale · product and inventory management</small>
        </div>
      </header>

      <div className="today-layout">
        <aside className="today-sidebar pos-sidebar">
          <p>Point of sale</p>
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={item.label === "Miscellaneous" ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
          <div className="today-account">
            <p>Current workspace</p>
            <b>Underwood Retail</b>
            <span>POS admin</span>
          </div>
        </aside>

        <section className="today-content">
          {loading ? (
            <div className="data-panel pos-placeholder">
              <h2>Loading item…</h2>
            </div>
          ) : mode === "edit" && !initial ? (
            <div className="data-panel pos-placeholder">
              <h2>Item not found</h2>
              <p>
                This item could not be loaded. It may have been deleted.
              </p>
            </div>
          ) : (
            <MiscellaneousForm mode={mode} initial={initial} />
          )}
        </section>
      </div>
    </main>
  );
}
