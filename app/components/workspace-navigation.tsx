"use client";

import { useState } from "react";

type WorkspaceNavigationProps = {
  activeView: "sales" | "inventory";
  onViewChange: (view: "sales" | "inventory") => void;
  store: string;
  onStoreChange: (store: string) => void;
};

const stores = ["Underwood", "Sunnybank Hills", "Garden City"];

export default function WorkspaceNavigation({
  activeView,
  onViewChange,
  store,
  onStoreChange,
}: WorkspaceNavigationProps) {
  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);

  return (
    <nav className="workspace-menu" aria-label="Workspace navigation">
      <div className="workspace-menu-inner">
        <div
          className="store-menu"
          onMouseEnter={() => setIsStoreMenuOpen(true)}
          onMouseLeave={() => setIsStoreMenuOpen(false)}
        >
          <button
            className="menu-link"
            type="button"
            aria-expanded={isStoreMenuOpen}
          >
            {store}
            <span aria-hidden="true"></span>
          </button>
          {isStoreMenuOpen && (
            <div className="store-options">
              {stores.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onStoreChange(name);
                    setIsStoreMenuOpen(false);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className={`menu-link ${activeView === "sales" ? "is-active" : ""}`}
          type="button"
          onClick={() => onViewChange("sales")}
        >
          Sales Entry
        </button>
        <button
          className={`menu-link ${activeView === "inventory" ? "is-active" : ""}`}
          type="button"
          onClick={() => onViewChange("inventory")}
        >
          Inventory User
        </button>
      </div>
    </nav>
  );
}
