"use client";

import { useRouter, useSearchParams } from "next/navigation";
import ProductsSection from "./products-section";
import MiscellaneousSection from "./miscellaneous-section";
import TradeInSection from "./trade-in-section";
import InventoryTransferSection from "./inventory-transfer-section";

const sections = {
  Products: ProductsSection,
  Miscellaneous: MiscellaneousSection,
  "Trade-in Products": TradeInSection,
  "Inventory transfer": InventoryTransferSection,
} as const;

type SectionKey = keyof typeof sections;

export default function PosWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("section");
  const section: SectionKey =
    requested && requested in sections ? (requested as SectionKey) : "Products";
  const ActiveSection = sections[section];

  function select(key: SectionKey) {
    router.replace(`/pos?section=${encodeURIComponent(key)}`);
  }

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
          {(Object.keys(sections) as SectionKey[]).map((item) => (
            <button
              key={item}
              className={section === item ? "active" : ""}
              onClick={() => select(item)}
            >
              {item}
            </button>
          ))}
          <div className="today-account">
            <p>Current workspace</p>
            <b>Underwood Retail</b>
            <span>POS admin</span>
          </div>
        </aside>
        <section className="today-content">
          <ActiveSection />
        </section>
      </div>
    </main>
  );
}
