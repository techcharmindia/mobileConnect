"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const categories = [
  "Smartphones",
  "Tablets",
  "Accessories",
  "Wearables",
  "Prepaid",
  "Other",
];

const valuationMethods = [
  { value: "WAC", label: "WAC (Weighted Average Cost)" },
  { value: "FIFO", label: "FIFO (First In First Out)" },
  { value: "LIFO", label: "LIFO (Last In First Out)" },
];

export default function NewProductPage() {
  const router = useRouter();
  const [itemType, setItemType] = useState<"non-serialized" | "serialized">(
    "non-serialized",
  );
  const [commission, setCommission] = useState(false);
  const [displayOnPos, setDisplayOnPos] = useState(true);
  const [manageInventory, setManageInventory] = useState(true);
  const [taxInclusive, setTaxInclusive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
    addAnother = false,
  ) {
    event.preventDefault();
    setSaving(true);

    const form = event.currentTarget;
    const values = new FormData(form);

    const payload = {
      name: values.get("name"),
      sku: values.get("sku") || `SKU-${Date.now()}`,
      category: values.get("category"),
      brand: values.get("brand"),
      model: values.get("model"),
      supplier: values.get("supplier"),
      valuationMethod: values.get("valuationMethod") || "WAC",
      condition: "New",
      imageUrl: values.get("imageUrl") || "",
      shortDescription: values.get("shortDescription") || "",
      itemType,
      commission,
      displayOnPos,
      manageInventory,
      taxClass: values.get("taxClass") || "gst",
      taxInclusive,
      quantity: Number(values.get("quantity") || 0),
      stockWarning: Number(values.get("stockWarning") || 0),
      reorderLevel: Number(values.get("reorderLevel") || 0),
      retailPrice: Number(values.get("retailPrice") || 0),
      costPrice: Number(values.get("costPrice") || 0),
      markUp: Number(values.get("markUp") || 0),
      promoPrice: Number(values.get("promoPrice") || 0),
      promoDate: values.get("promoDate") || "",
      minimumPrice: Number(values.get("minimumPrice") || 0),
    };

    try {
      const response = await fetch("/api/pos/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setNotice(data.message || "Could not save item.");
        setSaving(false);
        return;
      }

      if (addAnother) {
        form.reset();
        setNotice(`${data.product.name} saved. Add another item below.`);
        setSaving(false);
      } else {
        router.push("/pos");
      }
    } catch {
      setNotice("Could not save item.");
      setSaving(false);
    }
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
          {[
            "Products",
            "Miscellaneous",
            "Trade-in Products",
            "Inventory transfer",
          ].map((item) => (
            <Link
              key={item}
              href={`/pos?section=${encodeURIComponent(item)}`}
              className={item === "Products" ? "active" : ""}
            >
              {item}
            </Link>
          ))}
          <div className="today-account">
            <p>Current workspace</p>
            <b>Underwood Retail</b>
            <span>POS admin</span>
          </div>
        </aside>

        <section className="today-content">
          <form onSubmit={(e) => handleSubmit(e, false)}>
            {/* TITLE + ACTIONS */}
            <div className="pos-title">
              <div>
                <p className="eyebrow">Products / New record</p>
                <h1>Add new item</h1>
                <p>Create a catalogue item with stock, tax and pricing details.</p>
              </div>
              <div className="npf-header-actions">
                <Link href="/pos" className="pos-cancel">
                  Cancel
                </Link>
                <button
                  type="button"
                  className="pos-cancel"
                  disabled={saving}
                  onClick={(e) =>
                    handleSubmit(
                      e as unknown as FormEvent<HTMLFormElement>,
                      true,
                    )
                  }
                >
                  Save &amp; add new
                </button>
                <button className="pos-create" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save item"}
                </button>
              </div>
            </div>

            {notice && (
              <div className="today-notice">
                {notice}
                <button type="button" onClick={() => setNotice("")}>
                  ×
                </button>
              </div>
            )}

            {/* ITEM TYPE TOGGLE */}
            <section className="npf-type-toggle">
              <button
                type="button"
                className={
                  itemType === "non-serialized"
                    ? "npf-type-btn npf-type-btn--active"
                    : "npf-type-btn"
                }
                onClick={() => setItemType("non-serialized")}
              >
                <strong>Non-serialized item</strong>
                <small>Bulk stock tracked by quantity only</small>
              </button>
              <button
                type="button"
                className={
                  itemType === "serialized"
                    ? "npf-type-btn npf-type-btn--active"
                    : "npf-type-btn"
                }
                onClick={() => setItemType("serialized")}
              >
                <strong>Serialized item</strong>
                <small>Individually tracked by IMEI or serial</small>
              </button>
            </section>

            {/* ITEM INFORMATION */}
            <section className="pos-filter-card">
              <div className="pos-filter-heading">
                <div>
                  <h2>Item information</h2>
                  <p>Basic catalogue details shown across the POS.</p>
                </div>
              </div>

              <div className="pos-create-fields">
                <label>
                  Item name *
                  <input name="name" placeholder="e.g. Samsung Galaxy S26" required />
                </label>
                <label>
                  SKU
                  <input name="sku" placeholder="Auto-generated if left blank" />
                </label>
                <label>
                  Item category
                  <select name="category" defaultValue="" required>
                    <option value="" disabled>
                      Select category
                    </option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Brand
                  <input name="brand" placeholder="e.g. Samsung" />
                </label>
                <label>
                  Model
                  <input name="model" placeholder="e.g. S26" />
                </label>
                <label>
                  Image URL
                  <input name="imageUrl" placeholder="https://..." />
                </label>
                <label className="npf-span-2">
                  Short description
                  <textarea
                    name="shortDescription"
                    rows={2}
                    placeholder="Optional short description shown on the sales card"
                  />
                </label>
              </div>
            </section>

            {/* SETTING */}
            <section className="pos-filter-card">
              <div className="pos-filter-heading">
                <div>
                  <h2>Setting</h2>
                  <p>Control commission and POS visibility.</p>
                </div>
              </div>

              <div className="npf-toggle-row">
                <span>Commission</span>
                <div className="npf-radio-group">
                  <label>
                    <input
                      type="radio"
                      checked={commission}
                      onChange={() => setCommission(true)}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={!commission}
                      onChange={() => setCommission(false)}
                    />
                    No
                  </label>
                </div>
              </div>

              <div className="npf-toggle-row">
                <span>Display on POS</span>
                <div className="npf-radio-group">
                  <label>
                    <input
                      type="radio"
                      checked={displayOnPos}
                      onChange={() => setDisplayOnPos(true)}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={!displayOnPos}
                      onChange={() => setDisplayOnPos(false)}
                    />
                    No
                  </label>
                </div>
              </div>
            </section>

            {/* STOCK */}
            <section className="pos-filter-card">
              <div className="pos-filter-heading">
                <div>
                  <h2>Stock</h2>
                  <p>Set inventory tracking and reorder thresholds.</p>
                </div>
              </div>

              <div className="npf-toggle-row">
                <span>Manage inventory level for this item?</span>
                <div className="npf-radio-group">
                  <label>
                    <input
                      type="radio"
                      checked={manageInventory}
                      onChange={() => setManageInventory(true)}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={!manageInventory}
                      onChange={() => setManageInventory(false)}
                    />
                    No
                  </label>
                </div>
              </div>

              <div className="pos-create-fields" style={{ marginTop: 14 }}>
                <label>
                  On hand
                  <input name="quantity" type="number" min="0" defaultValue="0" />
                </label>
                <label>
                  Stock warning
                  <input
                    name="stockWarning"
                    type="number"
                    min="0"
                    defaultValue="0"
                  />
                </label>
                <label>
                  Minimum qty (reorder level)
                  <input
                    name="reorderLevel"
                    type="number"
                    min="0"
                    defaultValue="5"
                  />
                </label>
                <label>
                  Supplier / vendor
                  <input name="supplier" placeholder="Supplier name" />
                </label>
                <label className="npf-span-2">
                  Valuation method
                  <select name="valuationMethod" defaultValue="WAC">
                    {valuationMethods.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <small className="npf-hint">
                    ⓘ On-hand stock must be zero to change the valuation method.
                  </small>
                </label>
              </div>
            </section>

            {/* TAX */}
            <section className="pos-filter-card">
              <div className="pos-filter-heading">
                <div>
                  <h2>Tax</h2>
                  <p>Configure tax class and pricing behaviour.</p>
                </div>
              </div>

              <div className="npf-tax-row">
                <label>
                  Tax class
                  <select name="taxClass" defaultValue="gst">
                    <option value="gst">GST</option>
                    <option value="none">None</option>
                  </select>
                </label>
                <label className="pos-checkbox">
                  <input
                    type="checkbox"
                    checked={taxInclusive}
                    onChange={(e) => setTaxInclusive(e.target.checked)}
                  />
                  Tax inclusive
                </label>
              </div>
            </section>

            {/* PRICING */}
            <section className="pos-filter-card">
              <div className="pos-filter-heading">
                <div>
                  <h2>Pricing</h2>
                  <p>Set cost, markup, retail and promotional pricing.</p>
                </div>
              </div>

              <div className="pos-create-fields">
                <label>
                  Unit cost
                  <input
                    name="costPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0.00"
                  />
                </label>
                <label>
                  Mark up (%)
                  <input
                    name="markUp"
                    type="number"
                    min="0"
                    step="0.001"
                    defaultValue="0.000"
                  />
                </label>
                <label>
                  Retail price *
                  <input
                    name="retailPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0.00"
                    required
                  />
                </label>
                <label>
                  Promotional price
                  <input
                    name="promoPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0.00"
                  />
                </label>
                <label>
                  Promotional date
                  <input
                    name="promoDate"
                    type="text"
                    placeholder="Select promotion duration"
                  />
                </label>
                <label>
                  Minimum price
                  <input
                    name="minimumPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0.00"
                  />
                </label>
              </div>
            </section>

            {/* BOTTOM ACTIONS */}
            <div className="pos-modal-actions">
              <Link href="/pos" className="pos-cancel">
                Cancel
              </Link>
              <button className="pos-create" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save item"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}