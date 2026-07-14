"use client";

import { useState } from "react";
import AppHeader from "./components/app-header";
import WorkspaceNavigation from "./components/workspace-navigation";
import SalesEntryForm from "./components/sales-entry-form";
import InventoryForm from "./components/inventory/inventory-form";

export default function Home() {
  const [activeView, setActiveView] = useState<"sales" | "inventory">("sales");
  const [store, setStore] = useState("Store");

  return (
    <main className="app-shell">
      <AppHeader />
      <WorkspaceNavigation
        activeView={activeView}
        onViewChange={setActiveView}
        store={store}
        onStoreChange={setStore}
      />
      <section className="page-content" id={`${activeView}-entry`}>
        {activeView === "inventory" ? <InventoryForm /> : <SalesEntryForm />}
      </section>
    </main>
  );
}
