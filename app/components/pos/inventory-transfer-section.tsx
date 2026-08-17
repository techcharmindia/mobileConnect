"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Pagination from "./pagination";
import {
  InventoryTransfer,
  STORES,
  TRANSFERS,
  TransferStatus,
  TRANSFER_STATUSES,
} from "./inventory-transfer-types";

const money = (value: number) =>
  Number(value || 0).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });

const STATUS_BADGE: Record<TransferStatus, string> = {
  Completed: "it-status--completed",
  "In Transit": "it-status--in-transit",
  Pending: "it-status--pending",
  Cancelled: "it-status--cancelled",
};

type TabKey = "All" | "Transfer In" | "Transfer Out";

const TABS: TabKey[] = ["All", "Transfer In", "Transfer Out"];

type ColumnKey =
  | "id"
  | "date"
  | "type"
  | "products"
  | "fromLocation"
  | "toLocation"
  | "status"
  | "totalCost";

const COLUMN_OPTIONS: { key: ColumnKey; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "date", label: "Date" },
  { key: "type", label: "Type" },
  { key: "products", label: "Products" },
  { key: "fromLocation", label: "From Location" },
  { key: "toLocation", label: "To Location" },
  { key: "status", label: "Status" },
  { key: "totalCost", label: "Total Cost" },
];

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  id: true,
  date: true,
  type: true,
  products: true,
  fromLocation: true,
  toLocation: true,
  status: true,
  totalCost: true,
};

type Filters = {
  id: string;
  fromStores: string[];
  toStores: string[];
  status: string;
  startDate: string;
  endDate: string;
};

const EMPTY_FILTERS: Filters = {
  id: "",
  fromStores: [],
  toStores: [],
  status: "",
  startDate: "",
  endDate: "",
};

export default function InventoryTransferSection() {
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Filter panel
  const [filterPinned, setFilterPinned] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  // Insights / summary visibility
  const [insightsOpen, setInsightsOpen] = useState(true);

  // Tabs
  const [tab, setTab] = useState<TabKey>("All");

  // Sorting
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection
  const [selected, setSelected] = useState<number[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Column visibility
  const [columns, setColumns] = useState<Record<ColumnKey, boolean>>(
    DEFAULT_COLUMNS,
  );
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

  // Menus / dialogs
  const [exportOpen, setExportOpen] = useState(false);
  const [transitOpen, setTransitOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState<InventoryTransfer | null>(null);

  const filterVisible = filterPinned || filterOpen;

  function loadData() {
    setLoading(true);
    setError("");
    window.setTimeout(() => {
      try {
        setTransfers(TRANSFERS);
      } catch {
        setError("Could not load inventory transfers.");
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const tabFiltered = useMemo(() => {
    if (tab === "All") return transfers;
    return transfers.filter((t) => t.type === tab);
  }, [transfers, tab]);

  const filtered = useMemo(() => {
    const q = applied;
    return tabFiltered.filter((t) => {
      if (q.id && !String(t.id).includes(q.id)) return false;
      if (q.fromStores.length && !q.fromStores.includes(t.fromLocation))
        return false;
      if (q.toStores.length && !q.toStores.includes(t.toLocation)) return false;
      if (q.status && t.status !== q.status) return false;
      if (q.startDate && t.date < q.startDate) return false;
      if (q.endDate && t.date > q.endDate) return false;
      return true;
    });
  }, [tabFiltered, applied]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortBy as keyof InventoryTransfer];
      const bv = b[sortBy as keyof InventoryTransfer];
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortBy, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totals = useMemo(() => {
    const productNames = new Set<string>();
    let quantity = 0;
    let cost = 0;
    for (const t of filtered) {
      t.products.forEach((p) => productNames.add(p.name));
      quantity += t.products.reduce((sum, p) => sum + p.qty, 0);
      cost += t.totalCost;
    }
    return { products: productNames.size, quantity, cost };
  }, [filtered]);

  const transitItems = useMemo(
    () => transfers.filter((t) => t.status === "In Transit"),
    [transfers],
  );

  function setDraftField<K extends keyof Filters>(key: K, value: Filters[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function applySearch() {
    setApplied({ ...draft });
    setPage(1);
    setLoading(true);
    window.setTimeout(() => setLoading(false), 320);
  }

  function resetFilters() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  }

  function saveFilterPreset() {
    try {
      const presets = JSON.parse(
        window.localStorage.getItem("inventory-transfer-filter-presets") || "[]",
      );
      window.localStorage.setItem(
        "inventory-transfer-filter-presets",
        JSON.stringify([...presets, { ...draft, savedAt: Date.now() }]),
      );
      setNotice("Filter saved as preset.");
    } catch {
      setNotice("Could not save filter.");
    }
  }

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  function toggleSelect(id: number) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }

  function toggleSelectAll() {
    if (selected.length === pageItems.length) setSelected([]);
    else setSelected(pageItems.map((i) => i.id));
  }

  function buildCsv(rows: InventoryTransfer[]) {
    const header = [
      "ID",
      "Date",
      "Type",
      "Products",
      "From Location",
      "To Location",
      "Status",
      "Total Cost",
    ];
    const escape = (value: string | number) => {
      const text = String(value ?? "");
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines = rows.map((t) =>
      [
        t.id,
        escape(t.date),
        escape(t.type),
        escape(t.products.map((p) => `${p.name} x${p.qty}`).join(", ")),
        escape(t.fromLocation),
        escape(t.toLocation),
        escape(t.status),
        t.totalCost,
      ].join(","),
    );
    return [header.join(","), ...lines].join("\n");
  }

  function exportCsv() {
    const blob = new Blob([buildCsv(sorted)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `inventory-transfers-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  return (
    <>
      {/* HEADER */}
      <div className="pos-manage-header">
        <div>
          <p className="eyebrow">Inventory transfer</p>
          <h1>Manage Inventory Transfers</h1>
          <p className="pos-title-sub">
            Move stock between store locations and track transfers.
          </p>
        </div>
        <div className="pos-manage-actions">
          
          <div className="misc-menu-anchor">
            {exportOpen && (
              <div className="misc-menu">
                <button type="button" onClick={exportCsv}>
                  Export CSV
                </button>
              </div>
            )}
          </div>
          <Link href="/pos/inventory-transfer/new" className="pos-create">
            Create Inventory Transfer
          </Link>
        </div>
      </div>

      {notice && (
        <div className="today-notice">
          {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}
      {error && (
        <div className="today-notice misc-form-error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {/* FILTER PANEL */}
      {filterVisible && (
        <section className="pos-filter-card">
          <div className="pos-filter-heading">
            <div>
              <h2>Filter inventory transfers</h2>
              <p>Use any field to narrow the list.</p>
            </div>
            <button
              type="button"
              className="pos-text-action"
              onClick={() => setFilterPinned((p) => !p)}
            >
              📌 {filterPinned ? "Unpin" : "Pin"} Filter
            </button>
          </div>
          <div className="pos-filters">
            <label>
              ID
              <input
                value={draft.id}
                onChange={(e) => setDraftField("id", e.target.value)}
                placeholder="Enter ID"
              />
            </label>
            <StoreMultiSelect
              label="From Store"
              value={draft.fromStores}
              placeholder="Select store(s)"
              onChange={(next) => setDraftField("fromStores", next)}
            />
            <StoreMultiSelect
              label="To Store"
              value={draft.toStores}
              placeholder="Select store(s)"
              onChange={(next) => setDraftField("toStores", next)}
            />
            <label>
              Status
              <select
                value={draft.status}
                onChange={(e) => setDraftField("status", e.target.value)}
              >
                <option value="">Select status</option>
                {TRANSFER_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Created Start Date
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraftField("startDate", e.target.value)}
              />
            </label>
            <label>
              Created End Date
              <input
                type="date"
                value={draft.endDate}
                onChange={(e) => setDraftField("endDate", e.target.value)}
              />
            </label>
          </div>
          <div className="pos-filter-footer">
            <span className="misc-filter-count">
              {filtered.length} transfer{filtered.length === 1 ? "" : "s"}
            </span>
            <div className="pos-filter-actions">
              <button
                type="button"
                className="pos-text-action"
                onClick={() => setFilterPinned((p) => !p)}
              >
                📌 {filterPinned ? "Unpin" : "Pin"} Filter
              </button>
              <button type="button" className="pos-text-action" onClick={resetFilters}>
                ↶ Reset
              </button>
              <button
                type="button"
                className="pos-text-action"
                onClick={saveFilterPreset}
              >
                💾 Save Filter
              </button>
              <button type="button" className="pos-create" onClick={applySearch}>
                Search
              </button>
            </div>
          </div>
        </section>
      )}

      {/* SUMMARY CARDS */}
      {insightsOpen && (
        <section className="it-summary">
          <article className="it-summary-card">
            <span>Total Products</span>
            <strong>{totals.products}</strong>
            <small>distinct items moved</small>
          </article>
          <article className="it-summary-card">
            <span>Total Quantity</span>
            <strong>{totals.quantity}</strong>
            <small>units transferred</small>
          </article>
          <article className="it-summary-card it-summary-highlight">
            <span>Total Cost</span>
            <strong>{money(totals.cost)}</strong>
            <small>value of transfers</small>
          </article>
        </section>
      )}

      {/* TABLE */}
      <section className="sales-card pos-sales-card">
        <div className="it-tabs-wrap">
          <div className="it-tabs">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                className={tab === t ? "it-tab it-tab-active" : "it-tab"}
                onClick={() => {
                  setTab(t);
                  setPage(1);
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="pos-card-heading">
          <div>
            <h2>Inventory transfers</h2>
            <p>Transfers matching your current filters appear below.</p>
          </div>
          <span>{sorted.length} transfers</span>
        </div>
        <div className="pos-table-wrap">
          <table className="pos-table it-table">
            <thead>
              <tr>
                <th className="pos-checkbox-col">
                  <input
                    type="checkbox"
                    checked={pageItems.length > 0 && selected.length === pageItems.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                {columns.id && (
                  <th className="pos-sortable" onClick={() => toggleSort("id")}>
                    ID <SortIcon col="id" sortBy={sortBy} sortDir={sortDir} />
                  </th>
                )}
                {columns.date && (
                  <th className="pos-sortable" onClick={() => toggleSort("date")}>
                    Date <SortIcon col="date" sortBy={sortBy} sortDir={sortDir} />
                  </th>
                )}
                {columns.type && <th>Type</th>}
                {columns.products && <th>Products</th>}
                {columns.fromLocation && <th>From Location</th>}
                {columns.toLocation && <th>To Location</th>}
                {columns.status && <th>Status</th>}
                {columns.totalCost && <th>Total Cost</th>}
                <th className="pos-actions-col">
                  <div className="misc-menu-anchor misc-inline">
                    <button
                      type="button"
                      className="misc-gear"
                      onClick={() => setColumnMenuOpen((o) => !o)}
                      aria-label="Column settings"
                      title="Choose visible columns"
                    >
                      ⚙
                    </button>
                    {columnMenuOpen && (
                      <div className="misc-menu misc-column-menu">
                        {COLUMN_OPTIONS.map((option) => (
                          <label key={option.key} className="pos-checkbox">
                            <input
                              type="checkbox"
                              checked={columns[option.key]}
                              onChange={() =>
                                setColumns((c) => ({
                                  ...c,
                                  [option.key]: !c[option.key],
                                }))
                              }
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="pos-empty">
                    Loading inventory transfers…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={11} className="pos-empty">
                    {error}
                    <div style={{ marginTop: 10 }}>
                      <button type="button" className="pos-create" onClick={loadData}>
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : pageItems.length ? (
                pageItems.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(t.id)}
                        onChange={() => toggleSelect(t.id)}
                      />
                    </td>
                    {columns.id && <td className="pos-link">{t.id}</td>}
                    {columns.date && <td>{t.date}</td>}
                    {columns.type && <td>{t.type}</td>}
                    {columns.products && (
                      <td className="it-multiline">
                        <div className="it-product-list">
                          {t.products.map((p, i) => (
                            <span key={i}>
                              {p.name} × {p.qty}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                    {columns.fromLocation && (
                      <td className="it-multiline">{t.fromLocation}</td>
                    )}
                    {columns.toLocation && (
                      <td className="it-multiline">{t.toLocation}</td>
                    )}
                    {columns.status && (
                      <td>
                        <span
                          className={`it-status-badge ${STATUS_BADGE[t.status]}`}
                        >
                          {t.status}
                        </span>
                      </td>
                    )}
                    {columns.totalCost && <td>{money(t.totalCost)}</td>}
                    <td className="pos-row-actions">
                      <Link
                        href="/pos/inventory-transfer/new"
                        title="Edit"
                      >
                        ✏️
                      </Link>
                      <button
                        title="View"
                        onClick={() => setDetailsItem(t)}
                      >
                        👁
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="pos-empty">
                    No Records Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && sorted.length > 0 && (
          <Pagination
            total={sorted.length}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </section>

      {/* IN TRANSIT MODAL */}
      {transitOpen && (
        <div className="pos-modal-backdrop" role="presentation">
          <div className="pos-create-modal it-transit-modal">
            <div className="pos-modal-heading">
              <div>
                <p className="eyebrow">In Transit Inventory</p>
                <h2>Items currently in transit</h2>
                <p className="pos-title-sub">
                  Transfers with an &ldquo;In Transit&rdquo; status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTransitOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {transitItems.length ? (
              <div className="it-transit-list">
                {transitItems.map((t) => (
                  <div key={t.id} className="it-transit-item">
                    <b>
                      #{t.id} · {t.type} · {t.date}
                    </b>
                    <small>
                      {t.fromLocation} → {t.toLocation}
                    </small>
                    <span>
                      {t.products
                        .map((p) => `${p.name} × ${p.qty}`)
                        .join(", ")}
                    </span>
                    <span className="it-transit-cost">{money(t.totalCost)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pos-empty">No items in transit.</p>
            )}
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {detailsItem && (
        <div className="pos-modal-backdrop" role="presentation">
          <div className="pos-create-modal misc-details-modal">
            <div className="pos-modal-heading">
              <div>
                <p className="eyebrow">Transfer #{detailsItem.id}</p>
                <h2>{detailsItem.type}</h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailsItem(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <dl className="misc-details">
              <div>
                <dt>Date</dt>
                <dd>{detailsItem.date}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span
                    className={`it-status-badge ${STATUS_BADGE[detailsItem.status]}`}
                  >
                    {detailsItem.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt>From Location</dt>
                <dd>{detailsItem.fromLocation}</dd>
              </div>
              <div>
                <dt>To Location</dt>
                <dd>{detailsItem.toLocation}</dd>
              </div>
              <div>
                <dt>Total Cost</dt>
                <dd>{money(detailsItem.totalCost)}</dd>
              </div>
              <div>
                <dt>Products</dt>
                <dd>
                  <div className="it-product-list">
                    {detailsItem.products.map((p, i) => (
                      <span key={i}>
                        {p.name} × {p.qty}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            </dl>
            <div className="pos-modal-actions">
              <button
                type="button"
                className="pos-cancel"
                onClick={() => setDetailsItem(null)}
              >
                Close
              </button>
              <Link
                href="/pos/inventory-transfer/new"
                className="pos-create"
                onClick={() => setDetailsItem(null)}
              >
                Edit transfer
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StoreMultiSelect({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(store: string) {
    onChange(
      value.includes(store)
        ? value.filter((s) => s !== store)
        : [...value, store],
    );
  }

  return (
    <label className="ms-anchor">
      {label}
      <div>
        <button
          type="button"
          className="ms-button"
          onClick={() => setOpen((o) => !o)}
        >
          <span className={value.length ? "" : "ms-placeholder"}>
            {value.length ? value.join(", ") : placeholder}
          </span>
          <span aria-hidden>▾</span>
        </button>
        {open && (
          <div className="ms-menu">
            {STORES.map((store) => (
              <label key={store} className="pos-checkbox">
                <input
                  type="checkbox"
                  checked={value.includes(store)}
                  onChange={() => toggle(store)}
                />
                {store}
              </label>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}

function SortIcon({
  col,
  sortBy,
  sortDir,
}: {
  col: string;
  sortBy: string;
  sortDir: "asc" | "desc";
}) {
  return (
    <span className="pos-sort-icon">
      {sortBy === col ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
    </span>
  );
}
