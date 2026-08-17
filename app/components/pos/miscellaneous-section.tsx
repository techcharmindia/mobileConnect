"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MiscItem, PERCENTAGE_TYPE } from "./misc-types";

const PAGE_SIZE = 25;

const money = (value: string | number) =>
  Number(value || 0).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  });

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

type ColumnKey = "id" | "name" | "price" | "cost" | "created";

const COLUMN_OPTIONS: { key: ColumnKey; label: string }[] = [
  { key: "id", label: "Item ID" },
  { key: "name", label: "Name" },
  { key: "price", label: "Price / Percentage" },
  { key: "cost", label: "Cost" },
  { key: "created", label: "Created On" },
];

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  id: true,
  name: true,
  price: true,
  cost: true,
  created: true,
};

export default function MiscellaneousSection() {
  const [items, setItems] = useState<MiscItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  // Filter panel
  const [filterPinned, setFilterPinned] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterId, setFilterId] = useState("");
  const [filterName, setFilterName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Sorting
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection
  const [selected, setSelected] = useState<number[]>([]);

  // Pagination
  const [page, setPage] = useState(1);

  // Column visibility
  const [columns, setColumns] = useState<Record<ColumnKey, boolean>>(() => {
    try {
      const saved = window.localStorage.getItem("misc-columns");
      return saved ? { ...DEFAULT_COLUMNS, ...JSON.parse(saved) } : DEFAULT_COLUMNS;
    } catch {
      return DEFAULT_COLUMNS;
    }
  });
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

  // Menus
  const [exportOpen, setExportOpen] = useState(false);
  const [moreOpenId, setMoreOpenId] = useState<number | null>(null);
  const [detailsItem, setDetailsItem] = useState<MiscItem | null>(null);

  const importInput = useRef<HTMLInputElement>(null);

  const filterVisible = filterPinned || filterOpen;

  const load = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      const params = new URLSearchParams({
        id: filterId,
        name: filterName,
        fromDate,
        toDate,
        sortBy,
        sortDir,
        page: String(nextPage),
        pageSize: String(PAGE_SIZE),
      });
      try {
        const response = await fetch(`/api/miscellaneous-items?${params}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        setItems(data.items);
        setTotal(data.total);
        setPage(nextPage);
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "Could not load items.",
        );
      } finally {
        setLoading(false);
      }
    },
    [filterId, filterName, fromDate, toDate, sortBy, sortDir],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1), 220);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    try {
      window.localStorage.setItem("misc-columns", JSON.stringify(columns));
    } catch {
      /* ignore */
    }
  }, [columns]);

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  function resetFilters() {
    setFilterId("");
    setFilterName("");
    setFromDate("");
    setToDate("");
  }

  function saveFilterPreset() {
    const preset = { filterId, filterName, fromDate, toDate };
    try {
      const presets = JSON.parse(
        window.localStorage.getItem("misc-filter-presets") || "[]",
      );
      window.localStorage.setItem(
        "misc-filter-presets",
        JSON.stringify([...presets, { ...preset, savedAt: Date.now() }]),
      );
      setNotice("Filter saved as preset.");
    } catch {
      setNotice("Could not save filter.");
    }
  }

  function toggleSelect(id: number) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }

  function toggleSelectAll() {
    if (selected.length === items.length) setSelected([]);
    else setSelected(items.map((i) => i.id));
  }

  async function deleteItem(id: number) {
    if (!confirm("Delete this miscellaneous item?")) return;
    const response = await fetch(`/api/miscellaneous-items?id=${id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setNotice("Item deleted.");
      setSelected((s) => s.filter((x) => x !== id));
      await load(items.length === 1 && page > 1 ? page - 1 : page);
    } else {
      setNotice("Could not delete item.");
    }
  }

  async function duplicateItem(item: MiscItem) {
    const response = await fetch("/api/miscellaneous-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: item.type,
        name: `${item.name} (copy)`,
        description: item.description,
        isBarcode: item.is_barcode,
        commission: item.commission,
        onPos: item.on_pos,
        retailPrice: Number(item.retail_price),
        costPrice: Number(item.cost_price),
        taxClass: item.tax_class,
        taxInclusive: item.tax_inclusive,
        image: item.image,
        bulkDiscount: item.bulk_discount,
        percentage: Number(item.percentage || 0),
        percentageCalc: item.percentage_calc || "Before Tax",
      }),
    });
    setMoreOpenId(null);
    const data = await response.json();
    if (response.ok) {
      setNotice(`${data.item.name} created.`);
      await load(page);
    } else {
      setNotice(data.message || "Could not duplicate item.");
    }
  }

  function buildCsv(rows: MiscItem[]) {
    const header = [
      "ID",
      "Type",
      "Name",
      "Description",
      "Retail Price",
      "Cost Price",
      "Percentage",
      "Percentage Calc",
      "Tax Class",
      "On Pos",
      "Bulk Discount",
      "Created On",
    ];
    const escape = (value: string | number | null) => {
      const text = String(value ?? "");
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines = rows.map((item) =>
      [
        item.id,
        escape(item.type),
        escape(item.name),
        escape(item.description),
        item.retail_price,
        item.cost_price,
        item.percentage,
        escape(item.percentage_calc || ""),
        escape(item.tax_class),
        item.on_pos ? "Yes" : "No",
        item.bulk_discount ? "Yes" : "No",
        escape(formatDate(item.created_at)),
      ].join(","),
    );
    return [header.join(","), ...lines].join("\n");
  }

  async function exportCsv() {
    const params = new URLSearchParams({
      id: filterId,
      name: filterName,
      fromDate,
      toDate,
      exportAll: "1",
    });
    try {
      const response = await fetch(`/api/miscellaneous-items?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      const blob = new Blob([buildCsv(data.items)], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `miscellaneous-items-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch {
      setNotice("Could not export items.");
    }
  }

  function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i++;
          } else inQuotes = false;
        } else cell += char;
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && text[i + 1] === "\n") i++;
        row.push(cell);
        cell = "";
        rows.push(row);
        row = [];
      } else cell += char;
    }
    if (cell.length || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setNotice("CSV file has no data rows.");
      return;
    }
    const header = rows[0].map((h) => h.toLowerCase());
    const start = header.some((h) =>
      ["id", "name", "type"].includes(h),
    )
      ? 1
      : 0;
    let created = 0;
    let failed = 0;
    for (const row of rows.slice(start)) {
      const [idCol, type, name, description, retail, cost] = row;
      const nameValue = (name || idCol || "").trim();
      if (!nameValue) {
        failed++;
        continue;
      }
      const response = await fetch("/api/miscellaneous-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: (type || "Miscellaneous").trim(),
          name: nameValue,
          description: (description || "").trim(),
          onPos: true,
          taxClass: "gst",
          taxInclusive: true,
          retailPrice: Number(retail || 0),
          costPrice: Number(cost || 0),
        }),
      });
      if (response.ok) created++;
      else failed++;
    }
    setNotice(
      `Import complete: ${created} created${failed ? `, ${failed} skipped` : ""}.`,
    );
    await load(1);
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  const filterHasValue = useMemo(
    () => Boolean(filterId || filterName || fromDate || toDate),
    [filterId, filterName, fromDate, toDate],
  );

  return (
    <>
      {/* HEADER */}
      <div className="pos-manage-header">
        <div>
          <p className="eyebrow">Miscellaneous</p>
          <h1>Manage Miscellaneous Items</h1>
          <p className="pos-title-sub">Track non-catalogue items sold through the register.</p>
        </div>
        <div className="pos-manage-actions">
          {!filterPinned && filterOpen && (
            <button
              type="button"
              className="pos-outline-btn pos-outline-btn--icon"
              onClick={() => setFilterOpen(false)}
              aria-label="Close filter"
              title="Close filter"
            >
              ×
            </button>
          )}

          {/* <div className="misc-menu-anchor">
            <button
              type="button"
              className="pos-outline-btn"
              onClick={() => setExportOpen((o) => !o)}
            >
              <span aria-hidden>📄</span> Import/Export
              <span aria-hidden>▾</span>
            </button>
            {exportOpen && (
              <div className="misc-menu">
                <button type="button" onClick={() => void exportCsv()}>
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => importInput.current?.click()}
                >
                  Import CSV
                </button>
              </div>
            )}
          </div> */}

          <Link href="/pos/miscellaneous/new" className="pos-create">
            Create Misc Item
          </Link>
        </div>
      </div>

      <input
        ref={importInput}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importCsv(file);
          e.target.value = "";
        }}
      />

      {notice && (
        <div className="today-notice">
          {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}

      {/* FILTER PANEL */}
      {filterVisible && (
        <section className="pos-filter-card">
          <div className="pos-filter-heading">
            <div>
              <h2>Filter miscellaneous items</h2>
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
          <div className="pos-filters misc-filters">
            <label>
              Item ID
              <input
                value={filterId}
                onChange={(e) => setFilterId(e.target.value)}
                placeholder="Enter ID"
              />
            </label>
            <label>
              Item Name
              <input
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Enter item name"
              />
            </label>
            <label>
              From Date
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label>
              To Date
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
          </div>
          <div className="pos-filter-footer">
            <span className="misc-filter-count">
              {filterHasValue ? `${total} result${total === 1 ? "" : "s"}` : ""}
            </span>
            <div className="pos-filter-actions">
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
              <button
                type="button"
                className="pos-create"
                onClick={() => void load(1)}
              >
                Search
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TABLE */}
      <section className="sales-card pos-sales-card">
        <div className="pos-card-heading">
          <div>
            <h2>Miscellaneous items</h2>
            <p>Items matching your current filters appear below.</p>
          </div>
          <span>{total} items</span>
        </div>
        <div className="pos-table-wrap">
          <table className="pos-table misc-table">
            <thead>
              <tr>
                <th className="pos-checkbox-col">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selected.length === items.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                {columns.id && (
                  <th className="pos-sortable" onClick={() => toggleSort("id")}>
                    Item ID{" "}
                    <SortIcon col="id" sortBy={sortBy} sortDir={sortDir} />
                  </th>
                )}
                {columns.name && (
                  <th className="pos-sortable" onClick={() => toggleSort("name")}>
                    Name{" "}
                    <SortIcon col="name" sortBy={sortBy} sortDir={sortDir} />
                  </th>
                )}
                {columns.price && (
                  <th
                    className="pos-sortable"
                    onClick={() => toggleSort("retail_price")}
                  >
                    Price / Percentage{" "}
                    <SortIcon
                      col="retail_price"
                      sortBy={sortBy}
                      sortDir={sortDir}
                    />
                  </th>
                )}
                {columns.cost && (
                  <th
                    className="pos-sortable"
                    onClick={() => toggleSort("cost_price")}
                  >
                    Cost{" "}
                    <SortIcon col="cost_price" sortBy={sortBy} sortDir={sortDir} />
                  </th>
                )}
                {columns.created && (
                  <th
                    className="pos-sortable"
                    onClick={() => toggleSort("created_at")}
                  >
                    Created On{" "}
                    <SortIcon col="created_at" sortBy={sortBy} sortDir={sortDir} />
                  </th>
                )}
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
                  <td colSpan={8} className="pos-empty">
                    Loading miscellaneous items…
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    {columns.id && (
                      <td>
                        <Link
                          href={`/pos/miscellaneous/${item.id}/edit`}
                          className="pos-link"
                        >
                          {item.id}
                        </Link>
                      </td>
                    )}
                    {columns.name && (
                      <td>
                        <b>{item.name}</b>
                        {item.image && (
                          <small className="misc-has-image">🖼 has image</small>
                        )}
                      </td>
                    )}
    {columns.price && (
      <td>
        {item.type === PERCENTAGE_TYPE
          ? `${Number(item.percentage || 0)}%`
          : money(item.retail_price)}
        {item.bulk_discount && (
          <small className="misc-bulk-tag">Bulk</small>
        )}
      </td>
    )}
                    {columns.cost && <td>{money(item.cost_price)}</td>}
                    {columns.created && (
                      <td>{formatDate(item.created_at)}</td>
                    )}
                    <td className="pos-row-actions">
                      <Link
                        href={`/pos/miscellaneous/${item.id}/edit`}
                        title="Edit"
                      >
                        ✏️
                      </Link>
                      <button
                        title="Delete"
                        onClick={() => deleteItem(item.id)}
                      >
                        🗑
                      </button>
                      <div className="misc-menu-anchor misc-inline">
                        <button
                          title="More options"
                          onClick={() =>
                            setMoreOpenId((id) =>
                              id === item.id ? null : item.id,
                            )
                          }
                        >
                          ⋯
                        </button>
                        {moreOpenId === item.id && (
                          <div className="misc-menu">
                            <button
                              type="button"
                              onClick={() => void duplicateItem(item)}
                            >
                              Duplicate
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDetailsItem(item);
                                setMoreOpenId(null);
                              }}
                            >
                              View details
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="pos-empty">
                    No miscellaneous items found. Create the first item to
                    populate this list.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {!loading && items.length > 0 && (
          <div className="misc-pagination">
            <span>
              Showing {from}–{to} of {total}
            </span>
            <div>
              <button
                type="button"
                className="pos-cancel"
                disabled={page <= 1}
                onClick={() => void load(page - 1)}
              >
                ← Prev
              </button>
              <button
                type="button"
                className="pos-cancel"
                disabled={page >= pageCount}
                onClick={() => void load(page + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* DETAILS MODAL */}
      {detailsItem && (
        <div className="pos-modal-backdrop" role="presentation">
          <div className="pos-create-modal misc-details-modal">
            <div className="pos-modal-heading">
              <div>
                <p className="eyebrow">Item #{detailsItem.id}</p>
                <h2>{detailsItem.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailsItem(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {detailsItem.image && (
              <img
                src={detailsItem.image}
                alt={detailsItem.name}
                className="misc-details-image"
              />
            )}
            <dl className="misc-details">
              <div>
                <dt>Type</dt>
                <dd>{detailsItem.type}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{detailsItem.description || "—"}</dd>
              </div>
              {detailsItem.type === PERCENTAGE_TYPE ? (
                <>
                  <div>
                    <dt>Percentage</dt>
                    <dd>{Number(detailsItem.percentage || 0)}%</dd>
                  </div>
                  <div>
                    <dt>Calculation</dt>
                    <dd>{detailsItem.percentage_calc || "Before Tax"}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt>Retail price</dt>
                    <dd>{money(detailsItem.retail_price)}</dd>
                  </div>
                  <div>
                    <dt>Cost price</dt>
                    <dd>{money(detailsItem.cost_price)}</dd>
                  </div>
                </>
              )}
              <div>
                <dt>Tax class</dt>
                <dd>{detailsItem.tax_class}</dd>
              </div>
              <div>
                <dt>Tax inclusive</dt>
                <dd>{detailsItem.tax_inclusive ? "Yes" : "No"}</dd>
              </div>
              {detailsItem.type !== PERCENTAGE_TYPE && (
                <>
                  <div>
                    <dt>Is Barcode</dt>
                    <dd>{detailsItem.is_barcode ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt>Commission</dt>
                    <dd>{detailsItem.commission ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt>Bulk discount</dt>
                    <dd>{detailsItem.bulk_discount ? "Yes" : "No"}</dd>
                  </div>
                </>
              )}
              <div>
                <dt>On POS</dt>
                <dd>{detailsItem.on_pos ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Created on</dt>
                <dd>{formatDate(detailsItem.created_at)}</dd>
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
                href={`/pos/miscellaneous/${detailsItem.id}/edit`}
                className="pos-create"
                onClick={() => setDetailsItem(null)}
              >
                Edit item
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
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
