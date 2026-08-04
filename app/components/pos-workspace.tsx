"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  sku: string;
  upc?: string;
  category: string;
  brand?: string;
  model?: string;
  imei?: string;
  serial?: string;
  supplier?: string;
  valuation_method?: string;
  condition: string;
  image_url?: string;
  quantity: number;
  stock_warning: number;
  retail_price: string | number;
  cost_price: string | number;
  reorder_level: number;
};

type Totals = {
  units: number;
  retail_value: string | number;
  cost_value: string | number;
  low_stock: number;
  in_purchase_order: number;
};

const categories = [
  "Smartphones",
  "Tablets",
  "Accessories",
  "Wearables",
  "Prepaid",
  "Other",
];

const valuationMethods = ["WAC", "FIFO", "LIFO", "Specific identification"];

const conditions = ["New", "Used", "Refurbished"];

const money = (value: string | number) =>
  Number(value || 0).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });

export default function PosWorkspace() {
  const [section, setSection] = useState("Products");
  const [products, setProducts] = useState<Product[]>([]);
  const [totals, setTotals] = useState<Totals>({
    units: 0,
    retail_value: 0,
    cost_value: 0,
    low_stock: 0,
    in_purchase_order: 0,
  });

  // Filters
  const [filterId, setFilterId] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [sku, setSku] = useState("");
  const [imei, setImei] = useState("");
  const [serial, setSerial] = useState("");
  const [supplier, setSupplier] = useState("");
  const [valuationMethod, setValuationMethod] = useState("");
  const [criteria, setCriteria] = useState("");
  const [hideOutOfStock, setHideOutOfStock] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection
  const [selected, setSelected] = useState<number[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const brands = useMemo(
    () =>
      [...new Set(products.map((p) => p.brand).filter(Boolean))] as string[],
    [products],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      id: filterId,
      search,
      category,
      brand,
      model,
      sku,
      imei,
      serial,
      supplier,
      valuationMethod,
      criteria,
      hideOutOfStock: hideOutOfStock ? "1" : "",
      sortBy,
      sortDir,
    });
    try {
      const response = await fetch(`/api/pos/products?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setProducts(data.products);
      setTotals(data.totals);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not load products.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    filterId,
    search,
    category,
    brand,
    model,
    sku,
    imei,
    serial,
    supplier,
    valuationMethod,
    criteria,
    hideOutOfStock,
    sortBy,
    sortDir,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 220);
    return () => window.clearTimeout(timer);
  }, [load]);

  function resetFilters() {
    setFilterId("");
    setSearch("");
    setCategory("");
    setBrand("");
    setModel("");
    setSku("");
    setImei("");
    setSerial("");
    setSupplier("");
    setValuationMethod("");
    setCriteria("");
    setHideOutOfStock(false);
  }

  function toggleSort(col: string) {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
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
    if (selected.length === products.length) setSelected([]);
    else setSelected(products.map((p) => p.id));
  }

  async function deleteProduct(id: number) {
    if (!confirm("Delete this product?")) return;
    const response = await fetch(`/api/pos/products?id=${id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setNotice("Product deleted.");
      await load();
    } else {
      setNotice("Could not delete product.");
    }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const payload = Object.fromEntries(values.entries());
    const response = await fetch("/api/pos/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      setNotice(data.message || "Could not create product.");
      return;
    }
    form.reset();
    setShowCreate(false);
    setNotice(`${data.product.name} is now in the product catalogue.`);
    await load();
  }

  const margin =
    Number(totals.retail_value || 0) - Number(totals.cost_value || 0);

  const SortIcon = ({ col }: { col: string }) => (
    <span className="pos-sort-icon">
      {sortBy === col ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
    </span>
  );

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
            <button
              key={item}
              className={section === item ? "active" : ""}
              onClick={() => setSection(item)}
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
          <div className="pos-title">
            <div>
              <p className="eyebrow">{section}</p>
              <h1>Product catalogue</h1>
              <p>Search, value and maintain live retail inventory.</p>
            </div>
            <Link href="/pos/products/new" className="pos-create">
              Create Product
            </Link>
          </div>
          {notice && (
            <div className="today-notice">
              {notice}
              <button onClick={() => setNotice("")}>×</button>
            </div>
          )}
          {/* <section className="pos-stat-grid">
            <article>
              <span>Stock on hand</span>
              <strong>{totals.units}</strong>
              <small>Units across catalogue</small>
            </article>
            <article className="pos-highlight">
              <span>Retail value</span>
              <strong>{money(totals.retail_value)}</strong>
              <small>Potential sales revenue</small>
            </article>
            <article>
              <span>Cost value</span>
              <strong>{money(totals.cost_value)}</strong>
              <small>Total inventory cost</small>
            </article>
            <article>
              <span>Gross margin</span>
              <strong>{money(margin)}</strong>
              <small>
                {totals.low_stock} low stock item
                {totals.low_stock === 1 ? "" : "s"}
              </small>
            </article>
          </section> */}

          <section className="pos-stat-bar">
            <div className="pos-stat-item">
              <span>
                Stock Retail Value
                <i
                  className="pos-info-icon"
                  title="Total retail value of all on-hand products."
                >
                  ⓘ
                </i>
              </span>
              <strong className="pos-teal">{money(totals.retail_value)}</strong>
            </div>

            <div className="pos-stat-divider" />

            <div className="pos-stat-item">
              <span>
                Stock Cost Value
                <i
                  className="pos-info-icon"
                  title="Total cost value of all on-hand stock."
                >
                  ⓘ
                </i>
              </span>
              <strong className="pos-teal">{money(totals.cost_value)}</strong>
            </div>

            <div className="pos-stat-divider" />

            <div className="pos-stat-item">
              <span>
                Low Stock Inventory
                <i
                  className="pos-info-icon"
                  title="Items at or below reorder level."
                >
                  ⓘ
                </i>
              </span>
              <strong className="pos-red">{totals.low_stock}</strong>
            </div>

            <div className="pos-stat-divider" />

            <div className="pos-stat-item">
              <span>
                In Purchase Order
                <i className="pos-info-icon" title="Units currently on order.">
                  ⓘ
                </i>
              </span>
              <strong>{totals.in_purchase_order}</strong>
            </div>
          </section>

          {section === "Products" ? (
            <>
              <section className="pos-filter-card">
                <div className="pos-filter-heading">
                  <div>
                    <h2>Find products</h2>
                    <p>Use any field to narrow the sales card.</p>
                  </div>
                </div>
                <div className="pos-filters">
                  <label>
                    ID
                    <input
                      value={filterId}
                      onChange={(e) => setFilterId(e.target.value)}
                      placeholder="Enter ID"
                    />
                  </label>
                  <label>
                    Name
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Enter name"
                      autoFocus
                    />
                  </label>
                  <label>
                    Category
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">Select category</option>
                      {categories.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Brand
                    <select
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                    >
                      <option value="">Select brand</option>
                      {brands.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Model
                    <input
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Enter model"
                    />
                  </label>
                  <label>
                    SKU/UPC
                    <input
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Enter SKU/UPC"
                    />
                  </label>
                  <label>
                    IMEI
                    <input
                      value={imei}
                      onChange={(e) => setImei(e.target.value)}
                      placeholder="Enter IMEI"
                    />
                  </label>
                  <label>
                    Serial
                    <input
                      value={serial}
                      onChange={(e) => setSerial(e.target.value)}
                      placeholder="Enter serial"
                    />
                  </label>
                  <label>
                    Supplier
                    <input
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      placeholder="Enter supplier"
                    />
                  </label>
                  <label>
                    Valuation Method
                    <select
                      value={valuationMethod}
                      onChange={(e) => setValuationMethod(e.target.value)}
                    >
                      <option value="">Select valuation method</option>
                      {valuationMethods.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Criteria
                    <select
                      value={criteria}
                      onChange={(e) => setCriteria(e.target.value)}
                    >
                      <option value="">Select criteria</option>
                      <option>In stock</option>
                      <option>Low stock</option>
                      <option>Out of stock</option>
                    </select>
                  </label>
                  <label>
                    Attribute Values
                    <select disabled>
                      <option value="">Select attribute values</option>
                    </select>
                  </label>
                </div>
                <div className="pos-filter-footer">
                  <label className="pos-checkbox">
                    <input
                      type="checkbox"
                      checked={hideOutOfStock}
                      onChange={(e) => setHideOutOfStock(e.target.checked)}
                    />
                    Hide out of stock
                  </label>
                  <div className="pos-filter-actions">
                    <button type="button" className="pos-text-action">
                      📌 Unpin Filter
                    </button>
                    <button
                      type="button"
                      className="pos-text-action"
                      onClick={resetFilters}
                    >
                      ↶ Reset
                    </button>
                    <button type="button" className="pos-text-action">
                      💾 Save Filter
                    </button>
                    <button
                      type="button"
                      className="pos-create"
                      onClick={() => void load()}
                    >
                      Search
                    </button>
                  </div>
                </div>
              </section>

              <section className="sales-card pos-sales-card">
                <div className="pos-card-heading">
                  <div>
                    <h2>Sales card</h2>
                    <p>Products matching your current search appear first.</p>
                  </div>
                  <span>{products.length} products</span>
                </div>
                <div className="pos-table-wrap">
                  <table className="pos-table pos-table-full">
                    <thead>
                      <tr>
                        <th className="pos-checkbox-col">
                          <input
                            type="checkbox"
                            checked={
                              products.length > 0 &&
                              selected.length === products.length
                            }
                            onChange={toggleSelectAll}
                          />
                        </th>
                        <th
                          className="pos-sortable"
                          onClick={() => toggleSort("id")}
                        >
                          ID <SortIcon col="id" />
                        </th>
                        <th>Image</th>
                        <th>SKU</th>
                        <th>UPC</th>
                        <th
                          className="pos-sortable"
                          onClick={() => toggleSort("category")}
                        >
                          Category <SortIcon col="category" />
                        </th>
                        <th>Brand</th>
                        <th>Model</th>
                        <th
                          className="pos-sortable"
                          onClick={() => toggleSort("name")}
                        >
                          Name <SortIcon col="name" />
                        </th>
                        <th>Condition</th>
                        <th>Valuation</th>
                        <th
                          className="pos-sortable"
                          onClick={() => toggleSort("quantity")}
                        >
                          On-Hand <SortIcon col="quantity" />
                        </th>
                        <th
                          className="pos-sortable"
                          onClick={() => toggleSort("stock_warning")}
                        >
                          Stock Warning <SortIcon col="stock_warning" />
                        </th>
                        <th
                          className="pos-sortable"
                          onClick={() => toggleSort("reorder_level")}
                        >
                          Reorder Level <SortIcon col="reorder_level" />
                        </th>
                        <th
                          className="pos-sortable"
                          onClick={() => toggleSort("retail_price")}
                        >
                          Price <SortIcon col="retail_price" />
                        </th>
                        <th>Unit Cost</th>
                        <th className="pos-actions-col">⚙</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={17} className="pos-empty">
                            Loading live inventory…
                          </td>
                        </tr>
                      ) : products.length ? (
                        products.map((product) => (
                          <tr key={product.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selected.includes(product.id)}
                                onChange={() => toggleSelect(product.id)}
                              />
                            </td>
                            <td className="pos-link">{product.id}</td>
                            <td>
                              <div className="pos-thumb">
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                  />
                                ) : (
                                  <span>🖼</span>
                                )}
                              </div>
                            </td>
                            <td className="pos-link">{product.sku || "Add"}</td>
                            <td className="pos-link">{product.upc || "Add"}</td>
                            <td className="pos-link">
                              {product.category || "Select"}
                            </td>
                            <td className="pos-link">
                              {product.brand || "Select"}
                            </td>
                            <td className="pos-link">
                              {product.model || "Select"}
                            </td>
                            <td className="pos-link">{product.name}</td>
                            <td className="pos-link">
                              <span className="pos-condition">
                                {product.condition}
                              </span>
                            </td>
                            <td>{product.valuation_method || "WAC"}</td>
                            <td>
                              <b
                                className={
                                  product.quantity <= product.reorder_level
                                    ? "pos-low-stock"
                                    : ""
                                }
                              >
                                {product.quantity}
                              </b>
                            </td>
                            <td>{product.stock_warning ?? 0}</td>
                            <td>{product.reorder_level}</td>
                            <td>{Number(product.retail_price).toFixed(2)}</td>
                            <td>{Number(product.cost_price).toFixed(2)}</td>
                            <td className="pos-row-actions">
                              <button title="Edit">✏️</button>
                              <button
                                title="Delete"
                                onClick={() => deleteProduct(product.id)}
                              >
                                🗑
                              </button>
                              <button title="More">⋯</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={17} className="pos-empty">
                            No products found. Create the first product to
                            populate this sales card.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <section className="data-panel pos-placeholder">
              <h2>{section}</h2>
              <p>
                This section is ready for its workflow. Product catalogue and
                inventory values stay available above.
              </p>
            </section>
          )}
        </section>
      </div>
      {showCreate && (
        <div className="pos-modal-backdrop" role="presentation">
          <form className="pos-create-modal" onSubmit={createProduct}>
            <div className="pos-modal-heading">
              <div>
                <p className="eyebrow">New catalogue item</p>
                <h2>Create product</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="pos-create-fields">
              <Field
                label="Product name *"
                name="name"
                placeholder="e.g. Samsung Galaxy S26"
                required
              />
              <Field
                label="SKU *"
                name="sku"
                placeholder="e.g. SAM-S26-256"
                required
              />
              <Field label="UPC" name="upc" placeholder="Barcode / UPC" />
              <SelectField
                label="Category *"
                name="category"
                options={categories}
                required
              />
              <Field label="Brand" name="brand" placeholder="e.g. Samsung" />
              <Field label="Model" name="model" placeholder="e.g. S26" />
              <Field label="IMEI" name="imei" placeholder="Optional IMEI" />
              <Field
                label="Serial"
                name="serial"
                placeholder="Optional serial"
              />
              <Field
                label="Supplier"
                name="supplier"
                placeholder="Supplier name"
              />
              <SelectField
                label="Valuation method"
                name="valuationMethod"
                options={valuationMethods}
              />
              <SelectField
                label="Condition"
                name="condition"
                options={conditions}
              />
              <Field
                label="Image URL"
                name="imageUrl"
                placeholder="https://..."
              />
              <Field
                label="Stock quantity *"
                name="quantity"
                type="number"
                min="0"
                defaultValue="0"
                required
              />
              <Field
                label="Stock warning"
                name="stockWarning"
                type="number"
                min="0"
                defaultValue="0"
              />
              <Field
                label="Retail value (AUD) *"
                name="retailPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                required
              />
              <Field
                label="Cost value (AUD) *"
                name="costPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                required
              />
              <Field
                label="Reorder level *"
                name="reorderLevel"
                type="number"
                min="0"
                defaultValue="5"
                required
              />
            </div>
            <div className="pos-modal-actions">
              <button
                type="button"
                className="pos-cancel"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button className="pos-create" type="submit">
                Create product
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function Field(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, ...input } = props;
  return (
    <label>
      {label}
      <input {...input} />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  required,
}: {
  label: string;
  name: string;
  options: string[];
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <select
        name={name}
        required={required}
        defaultValue={
          name === "condition" ? "New" : name === "valuationMethod" ? "WAC" : ""
        }
      >
        <option value="" disabled>
          Select option
        </option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
