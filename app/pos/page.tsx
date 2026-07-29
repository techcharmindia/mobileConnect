"use client";

import { useState } from "react";
import AppHeader from "../components/app-header";
import InventoryForm from "../components/inventory/inventory-form";
import SalesEntryForm from "../components/sales-entry-form";
import WorkspaceNavigation from "../components/workspace-navigation";

export default function PosPage() {
  const [activeView, setActiveView] = useState<"sales" | "inventory">("sales");
  const [store, setStore] = useState("Underwood");
  return <main className="app-shell"><AppHeader /><WorkspaceNavigation activeView={activeView} onViewChange={setActiveView} store={store} onStoreChange={setStore} /><section className="dashboard-content"><div className="dashboard-heading"><div><p className="eyebrow">Point of sale · {store}</p><h1>{activeView === "sales" ? "Sales workspace" : "Inventory workspace"}</h1><p>Capture sales and keep this store&apos;s stock up to date.</p></div><div className="date-card"><span>Today</span><strong>24 Jul 2026</strong></div></div><div className="dashboard-stats"><article><span>Today&apos;s sales</span><strong>28</strong><small>↑ 14% from yesterday</small></article><article><span>Pending follow-ups</span><strong>12</strong><small className="warning-text">4 need attention today</small></article><article><span>Stock alerts</span><strong>3</strong><small className="warning-text">Review low-stock products</small></article></div><section className="workspace-card"><div className="workspace-card-heading"><div><h2>{activeView === "sales" ? "New sales entry" : "Update inventory"}</h2><p>{activeView === "sales" ? "Record a new customer sale for this store." : "Add an item or update your current stock."}</p></div><span className="status-badge">POS workspace</span></div>{activeView === "inventory" ? <InventoryForm /> : <SalesEntryForm />}</section></section></main>;
}
