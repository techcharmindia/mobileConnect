"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  INVENTORY_PRODUCTS,
  InventoryItem,
  MOCK_USERS,
  OPPOSITE_STORE,
  TRANSFER_STORES,
  TransferStore,
} from "./inventory-transfer-types";

const sidebarItems = [
  { label: "Products", href: "/pos?section=Products" },
  { label: "Miscellaneous", href: "/pos?section=Miscellaneous" },
  { label: "Trade-in Products", href: "/pos?section=Trade-in%20Products" },
  { label: "Inventory transfer", href: "/pos?section=Inventory%20transfer" },
];

const money = (value: number) =>
  Number(value || 0).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const pad = (n: number) => String(n).padStart(2, "0");

const toDateTimeLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;

const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type SelectedRow = {
  product: InventoryItem;
  transferQty: number;
};

type FormErrors = {
  createdBy?: string;
  sendingStore?: string;
  receivingStore?: string;
  shipDate?: string;
  shippingCost?: string;
  products?: string;
};

export default function InventoryTransferFormPage() {
  const router = useRouter();

  const [createdBy, setCreatedBy] = useState(MOCK_USERS[0]);
  const [sendingStore, setSendingStore] = useState<TransferStore>(
    TRANSFER_STORES[0],
  );
  const [receivingStore, setReceivingStore] = useState<TransferStore>(
    OPPOSITE_STORE[TRANSFER_STORES[0]],
  );
  const [dateTime, setDateTime] = useState(() => toDateTimeLocal(new Date()));
  const [shipDate, setShipDate] = useState(() => toDateInput(new Date()));
  const [shippingCost, setShippingCost] = useState("0.00");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Product search
  const [query, setQuery] = useState("");
  const [searchQty, setSearchQty] = useState("1");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [rows, setRows] = useState<SelectedRow[]>([]);

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const storesReady = Boolean(sendingStore && receivingStore);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return INVENTORY_PRODUCTS.filter((p) =>
      [p.name, p.sku, p.upc, p.serial, p.imei].some((value) =>
        value.toLowerCase().includes(q),
      ),
    );
  }, [query]);

  const selectedProduct =
    selectedProductId != null
      ? INVENTORY_PRODUCTS.find((p) => p.id === selectedProductId) ?? null
      : null;

  const searchQtyNum = Number(searchQty);
  const searchQtyInvalid =
    !Number.isFinite(searchQtyNum) ||
    searchQtyNum <= 0 ||
    (selectedProduct !== null && searchQtyNum > selectedProduct.availableQuantity);
  const addDisabled =
    !selectedProduct || !storesReady || searchQtyInvalid || saving;

  const qtyError = (row: SelectedRow) => {
    if (!Number.isFinite(row.transferQty) || row.transferQty <= 0) {
      return "Quantity must be greater than zero.";
    }
    if (row.transferQty > row.product.availableQuantity) {
      return `Only ${row.product.availableQuantity} units available.`;
    }
    return "";
  };

  const totalQuantity = rows.reduce(
    (sum, r) => sum + (Number.isFinite(r.transferQty) ? r.transferQty : 0),
    0,
  );
  const productTotal = rows.reduce(
    (sum, r) =>
      sum + (Number.isFinite(r.transferQty) ? r.transferQty : 0) * r.product.cost,
    0,
  );
  const shipCost = Number(shippingCost);
  const shipCostValid = Number.isFinite(shipCost) && shipCost >= 0;
  const grandTotal = productTotal + (shipCostValid ? shipCost : 0);

  function handleSendingStoreChange(value: TransferStore) {
    setSendingStore(value);
    setReceivingStore(OPPOSITE_STORE[value]);
    setErrors((e) => ({ ...e, sendingStore: undefined, receivingStore: undefined }));
  }

  function handleSelectProduct(product: InventoryItem) {
    setSelectedProductId((current) => (current === product.id ? null : product.id));
    setErrors((e) => ({ ...e, products: undefined }));
  }

  function addProduct() {
    if (addDisabled || !selectedProduct) return;
    const qty = searchQtyNum;
    const existing = rows.find((r) => r.product.id === selectedProduct.id);

    if (existing) {
      const combined = existing.transferQty + qty;
      if (combined > selectedProduct.availableQuantity) {
        setNoticeError(true);
        setNotice(
          `Only ${selectedProduct.availableQuantity} units of ${selectedProduct.name} are available.`,
        );
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.product.id === selectedProduct.id
            ? { ...r, transferQty: combined }
            : r,
        ),
      );
    } else {
      setRows((prev) => [
        ...prev,
        { product: selectedProduct, transferQty: qty },
      ]);
    }

    setSelectedProductId(null);
    setQuery("");
    setSearchQty("1");
    setErrors((e) => ({ ...e, products: undefined }));
    setNoticeError(false);
    setNotice("");
  }

  function updateQty(id: number, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.product.id === id ? { ...r, transferQty: Number(value) } : r,
      ),
    );
  }

  function removeProduct(id: number) {
    setRows((prev) => prev.filter((r) => r.product.id !== id));
    setErrors((e) => ({ ...e, products: undefined }));
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!createdBy) next.createdBy = "Created by is required.";
    if (!sendingStore) next.sendingStore = "Sending store is required.";
    if (!receivingStore)
      next.receivingStore = "Select a receiving store.";
    if (sendingStore && receivingStore && sendingStore === receivingStore)
      next.receivingStore = "Sending and receiving store cannot be the same.";
    if (!shipDate) next.shipDate = "Ship date is required.";
    if (!shipCostValid)
      next.shippingCost = "Shipping cost must be a valid non-negative number.";
    if (!rows.length) {
      next.products = "Add at least one product to create this transfer.";
    } else {
      const invalid = rows.find((r) => qtyError(r));
      if (invalid) next.products = qtyError(invalid);
    }
    return next;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setNoticeError(false);

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setNoticeError(false);
      setNotice("Inventory transfer created successfully.");
      window.setTimeout(
        () => router.push("/pos?section=Inventory%20transfer"),
        1100,
      );
    }, 900);
  }

  function handleSaveDraft() {
    setNoticeError(false);
    setNotice("Draft saved.");
  }

  function handleCancel() {
    router.push("/pos?section=Inventory%20transfer");
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
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={item.label === "Inventory transfer" ? "active" : ""}
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
          <form onSubmit={handleSubmit} noValidate>
            {/* TITLE + ACTIONS */}
            <div className="pos-title">
              <div>
                <p className="eyebrow">Inventory transfer / New record</p>
                <h1>New Inventory Transfer</h1>
                <p>Move stock between store locations.</p>
              </div>
              <div className="npf-header-actions">
                <button
                  type="button"
                  className="pos-cancel"
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="pos-outline-btn"
                  onClick={handleSaveDraft}
                >
                  Save as Draft
                </button>
                <button className="pos-create" type="submit" disabled={saving}>
                  {saving ? "Creating…" : "Create Transfer"}
                </button>
              </div>
            </div>

            {notice && (
              <div
                className={
                  noticeError ? "today-notice misc-form-error" : "today-notice"
                }
              >
                {notice}
                <button type="button" onClick={() => setNotice("")}>
                  ×
                </button>
              </div>
            )}

            {/* DETAILS CARDS */}
            <div className="itf-grid">
              {/* TRANSFER DETAILS */}
              <section className="pos-filter-card">
                <div className="pos-filter-heading">
                  <div>
                    <h2>
                      <span className="itf-heading-icon" aria-hidden>
                        📅
                      </span>
                      Transfer Details
                    </h2>
                    <p>Date, creator and store routing for this transfer.</p>
                  </div>
                </div>

                <div className="pos-create-fields">
                  <label>
                    Date &amp; time
                    <span className="itf-field">
                      <span className="itf-field-icon" aria-hidden>
                        🕐
                      </span>
                      <input
                        type="datetime-local"
                        value={dateTime}
                        onChange={(e) => setDateTime(e.target.value)}
                      />
                    </span>
                  </label>

                  <label>
                    Created by <em className="pos-required">*</em>
                    <select
                      value={createdBy}
                      onChange={(e) => {
                        setCreatedBy(e.target.value);
                        setErrors((er) => ({ ...er, createdBy: undefined }));
                      }}
                      className={errors.createdBy ? "itf-input-error" : ""}
                    >
                      {MOCK_USERS.map((user) => (
                        <option key={user}>{user}</option>
                      ))}
                    </select>
                    {errors.createdBy && (
                      <span className="itf-error">{errors.createdBy}</span>
                    )}
                  </label>

                  <label>
                    Sending store <em className="pos-required">*</em>
                    <select
                      value={sendingStore}
                      onChange={(e) =>
                        handleSendingStoreChange(e.target.value as TransferStore)
                      }
                      className={errors.sendingStore ? "itf-input-error" : ""}
                    >
                      {TRANSFER_STORES.map((store) => (
                        <option key={store} value={store}>
                          {store}
                        </option>
                      ))}
                    </select>
                    {errors.sendingStore && (
                      <span className="itf-error">{errors.sendingStore}</span>
                    )}
                  </label>

                  <label>
                    Receiving store <em className="pos-required">*</em>
                    <select
                      value={receivingStore}
                      disabled={!sendingStore}
                      onChange={(e) => {
                        setReceivingStore(e.target.value as TransferStore);
                        setErrors((er) => ({
                          ...er,
                          receivingStore: undefined,
                        }));
                      }}
                      className={errors.receivingStore ? "itf-input-error" : ""}
                    >
                      {sendingStore ? (
                        <option value={receivingStore}>
                          {receivingStore}
                        </option>
                      ) : (
                        <option value="" disabled>
                          Select a receiving store
                        </option>
                      )}
                    </select>
                    {errors.receivingStore && (
                      <span className="itf-error">{errors.receivingStore}</span>
                    )}
                  </label>
                </div>
              </section>

              {/* SHIPPING DETAILS */}
              <section className="pos-filter-card">
                <div className="pos-filter-heading">
                  <div>
                    <h2>
                      <span className="itf-heading-icon" aria-hidden>
                        🚚
                      </span>
                      Shipping Details
                    </h2>
                    <p>Ship date, cost and tracking information.</p>
                  </div>
                </div>

                <div className="pos-create-fields">
                  <label>
                    Ship date <em className="pos-required">*</em>
                    <input
                      type="date"
                      value={shipDate}
                      onChange={(e) => {
                        setShipDate(e.target.value);
                        setErrors((er) => ({ ...er, shipDate: undefined }));
                      }}
                      className={errors.shipDate ? "itf-input-error" : ""}
                    />
                    {errors.shipDate && (
                      <span className="itf-error">{errors.shipDate}</span>
                    )}
                  </label>

                  <label>
                    Shipping cost <em className="pos-required">*</em>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shippingCost}
                      onChange={(e) => {
                        setShippingCost(e.target.value);
                        setErrors((er) => ({ ...er, shippingCost: undefined }));
                      }}
                      className={errors.shippingCost ? "itf-input-error" : ""}
                    />
                    {errors.shippingCost && (
                      <span className="itf-error">{errors.shippingCost}</span>
                    )}
                  </label>

                  <label>
                    Tracking number
                    <input
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                    />
                  </label>

                  <label className="npf-span-2 itf-span-full">
                    Transfer notes
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Add internal notes for this order"
                    />
                  </label>
                </div>
              </section>
            </div>

            {/* PRODUCT SEARCH & TRANSFER */}
            <section className="pos-filter-card itf-products-card">
              <div className="pos-filter-heading">
                <div>
                  <h2>Products to transfer</h2>
                  <p>
                    Search your inventory and add stock to send to{" "}
                    {receivingStore || "the receiving store"}.
                  </p>
                </div>
              </div>

              {!storesReady ? (
                <div className="itf-empty">
                  <span className="itf-empty-icon" aria-hidden>
                    📍
                  </span>
                  <h3>Start by selecting a store</h3>
                  <p>
                    Select Receiving store to start adding products to this
                    order.
                  </p>
                </div>
              ) : (
                <>
                  {/* SEARCH ROW */}
                  <div className="itf-search-row">
                    <label className="itf-search-label">
                      Search inventory to transfer
                      <span className="itf-field itf-search-field">
                        <span className="itf-field-icon" aria-hidden>
                          🔍
                        </span>
                        <input
                          value={query}
                          onChange={(e) => {
                            setQuery(e.target.value);
                            if (!e.target.value) setSelectedProductId(null);
                          }}
                          placeholder="Search by Name, SKU, UPC, Serial, IMEI, or scan barcode"
                        />
                      </span>
                    </label>
                    <label className="itf-qty-label">
                      Quantity
                      <input
                        type="number"
                        min="1"
                        value={searchQty}
                        onChange={(e) => setSearchQty(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="pos-create itf-add-btn"
                      disabled={addDisabled}
                      onClick={addProduct}
                    >
                      Add
                    </button>
                  </div>

                  {searchQtyInvalid && selectedProduct && (
                    <span className="itf-error itf-search-error">
                      Enter a quantity between 1 and{" "}
                      {selectedProduct.availableQuantity}.
                    </span>
                  )}

                  {/* SEARCH RESULTS */}
                  {query.trim() !== "" && (
                    <div className="itf-results">
                      {searchResults.length ? (
                        searchResults.map((product) => {
                          const selected = product.id === selectedProductId;
                          return (
                            <button
                              type="button"
                              key={product.id}
                              className={
                                selected
                                  ? "itf-result itf-result--active"
                                  : "itf-result"
                              }
                              onClick={() => handleSelectProduct(product)}
                            >
                              <span className="itf-result-main">
                                <b>{product.name}</b>
                                <small>
                                  SKU: {product.sku} · UPC: {product.upc}
                                </small>
                                <small>
                                  Serial: {product.serial || "—"}
                                  {product.imei
                                    ? ` · IMEI: ${product.imei}`
                                    : ""}
                                </small>
                              </span>
                              <span className="itf-result-meta">
                                <small>{product.availableQuantity} in stock</small>
                                <strong>{money(product.cost)}</strong>
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <p className="itf-no-results">
                          No products match &ldquo;{query.trim()}&rdquo;.
                        </p>
                      )}
                    </div>
                  )}

                  {/* EMPTY STATE */}
                  {rows.length === 0 && query.trim() === "" && (
                    <div className="itf-empty">
                      <span className="itf-empty-icon" aria-hidden>
                        📦
                      </span>
                      <h3>No products added yet</h3>
                      <p>
                        Find a product by searching or scanning to add it to
                        your transfer order.
                      </p>
                    </div>
                  )}

                  {/* SELECTED PRODUCTS TABLE */}
                  {rows.length > 0 && (
                    <div className="itf-table-wrap">
                      <table className="pos-table itf-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Available</th>
                            <th>Transfer qty</th>
                            <th>Unit cost</th>
                            <th>Total cost</th>
                            <th className="itf-remove-col" />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => {
                            const invalid = qtyError(row);
                            return (
                              <tr key={row.product.id}>
                                <td>
                                  <b>{row.product.name}</b>
                                  <small>
                                    {row.product.serial
                                      ? `Serial: ${row.product.serial}`
                                      : "Non-serialized"}
                                  </small>
                                </td>
                                <td>{row.product.sku}</td>
                                <td>{row.product.availableQuantity}</td>
                                <td>
                                  <input
                                    type="number"
                                    min="1"
                                    className={
                                      invalid
                                        ? "itf-qty-input itf-input-error"
                                        : "itf-qty-input"
                                    }
                                    value={row.transferQty}
                                    onChange={(e) =>
                                      updateQty(row.product.id, e.target.value)
                                    }
                                  />
                                  {invalid && (
                                    <span className="itf-error itf-qty-msg">
                                      {qtyError(row)}
                                    </span>
                                  )}
                                </td>
                                <td>{money(row.product.cost)}</td>
                                <td>
                                  {money(row.product.cost * row.transferQty)}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="itf-remove-btn"
                                    onClick={() => removeProduct(row.product.id)}
                                    aria-label={`Remove ${row.product.name}`}
                                    title="Remove"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TOTALS */}
                  {rows.length > 0 && (
                    <div className="itf-totals">
                      <span className="itf-total-qty">
                        {totalQuantity} unit{totalQuantity === 1 ? "" : "s"} ·{" "}
                        {rows.length} product{rows.length === 1 ? "" : "s"}
                      </span>
                      <div className="itf-total-lines">
                        <div>
                          <span>Product subtotal</span>
                          <strong>{money(productTotal)}</strong>
                        </div>
                        <div>
                          <span>Shipping cost</span>
                          <strong>
                            {shipCostValid ? money(shipCost) : money(0)}
                          </strong>
                        </div>
                        <div className="itf-total-grand">
                          <span>Total</span>
                          <strong>{money(grandTotal)}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {errors.products && (
                    <span className="itf-error itf-products-error">
                      {errors.products}
                    </span>
                  )}
                </>
              )}
            </section>

            {/* BOTTOM ACTIONS */}
            <div className="pos-modal-actions">
              <button
                type="button"
                className="pos-cancel"
                onClick={() => setCancelOpen(true)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pos-outline-btn"
                onClick={handleSaveDraft}
              >
                Save as Draft
              </button>
              <button className="pos-create" type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create Transfer"}
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* CANCEL CONFIRMATION */}
      {cancelOpen && (
        <div className="pos-modal-backdrop" role="presentation">
          <div className="pos-create-modal itf-confirm-modal">
            <div className="pos-modal-heading">
              <div>
                <p className="eyebrow">Discard transfer</p>
                <h2>Cancel this transfer?</h2>
                <p className="pos-title-sub">
                  Any unsaved changes will be lost.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="pos-modal-actions">
              <button
                type="button"
                className="pos-cancel"
                onClick={() => setCancelOpen(false)}
              >
                Keep editing
              </button>
              <button type="button" className="pos-create" onClick={handleCancel}>
                Discard transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
