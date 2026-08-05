"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MISC_TYPES,
  MiscItem,
  PERCENTAGE_CALCULATIONS,
  PERCENTAGE_TYPE,
  TAX_CLASSES,
} from "./misc-types";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

type Props = {
  mode: "create" | "edit";
  initial?: MiscItem | null;
};

const toMoney = (value: string | number | null | undefined) =>
  Number(value || 0).toFixed(2);

export default function MiscellaneousForm({ mode, initial }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [type, setType] = useState(initial?.type || "Miscellaneous");
  const [percentageCalc, setPercentageCalc] = useState(
    initial?.percentage_calc || "Before Tax",
  );
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [isBarcode, setIsBarcode] = useState(Boolean(initial?.is_barcode));
  const [commission, setCommission] = useState(Boolean(initial?.commission));
  const [onPos, setOnPos] = useState(
    initial ? Boolean(initial.on_pos) : true,
  );
  const [retailPrice, setRetailPrice] = useState(toMoney(initial?.retail_price));
  const [costPrice, setCostPrice] = useState(toMoney(initial?.cost_price));
  const [percentage, setPercentage] = useState(toMoney(initial?.percentage));
  const [taxClass, setTaxClass] = useState(initial?.tax_class || "gst");
  const [taxInclusive, setTaxInclusive] = useState(
    initial ? Boolean(initial.tax_inclusive) : true,
  );
  const [image, setImage] = useState<string | null>(initial?.image || null);
  const [bulkDiscount, setBulkDiscount] = useState(
    Boolean(initial?.bulk_discount),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const isPercentage = type === PERCENTAGE_TYPE;

  function resetFields() {
    setPercentageCalc("Before Tax");
    setName("");
    setDescription("");
    setIsBarcode(false);
    setCommission(false);
    setOnPos(true);
    setRetailPrice("0.00");
    setCostPrice("0.00");
    setPercentage("0.00");
    setTaxClass("gst");
    setTaxInclusive(true);
    setImage(null);
    setBulkDiscount(false);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  function handleTypeChange(value: string) {
    if (value === type) return;
    setType(value);
    resetFields();
  }

  function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image is too large. Maximum size is 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Item name is required.");
      return;
    }

    const retail = Number(retailPrice);
    const cost = Number(costPrice);
    const percent = Number(percentage);

    if (isPercentage) {
      if (
        !Number.isFinite(percent) ||
        percent < 0 ||
        percent > 100
      ) {
        setError("Enter a valid percentage between 0 and 100.");
        return;
      }
    } else {
      if (
        !Number.isFinite(retail) ||
        !Number.isFinite(cost) ||
        retail < 0 ||
        cost < 0
      ) {
        setError("Enter valid price values (0.00 or more).");
        return;
      }
    }

    setSaving(true);

    const common = {
      type,
      name: name.trim(),
      description: description.trim(),
      onPos,
      taxClass,
      taxInclusive,
      image,
    };

    const payload = isPercentage
      ? {
          ...common,
          percentageCalc: percentageCalc,
          percentage: percent,
        }
      : {
          ...common,
          isBarcode,
          commission,
          retailPrice: retail,
          costPrice: cost,
          bulkDiscount,
        };

    try {
      const response = await fetch("/api/miscellaneous-items", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "edit" && initial
            ? { id: initial.id, ...payload }
            : payload,
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Could not save item.");
        setSaving(false);
        return;
      }
      router.push("/pos?section=Miscellaneous");
    } catch {
      setError("Could not save item.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* TITLE + ACTIONS */}
      <div className="pos-title">
        <div>
          <p className="eyebrow">
            Miscellaneous / {mode === "edit" ? "Edit record" : "New record"}
          </p>
          <h1>{mode === "edit" ? "Edit miscellaneous item" : "Add miscellaneous item"}</h1>
          <p>Create a non-catalogue item sold through the register.</p>
        </div>
        <div className="npf-header-actions">
          <Link href="/pos?section=Miscellaneous" className="pos-cancel">
            Cancel
          </Link>
          <button className="pos-create" type="submit" disabled={saving}>
            {saving ? "Saving…" : mode === "edit" ? "Update item" : "Create item"}
          </button>
        </div>
      </div>

      {error && (
        <div className="today-notice misc-form-error">
          {error}
          <button type="button" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      <section className="pos-filter-card">
        <div className="pos-filter-heading">
          <div>
            <h2>Item details</h2>
            <p>Basic information and register settings.</p>
          </div>
        </div>

        <div className="misc-form-grid">
          {/* LEFT COLUMN */}
          <div className="misc-form-col">
            <label>
              Type
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                {MISC_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>

            {isPercentage && (
              <label>
                Percentage Calculation
                <select
                  value={percentageCalc}
                  onChange={(e) => setPercentageCalc(e.target.value)}
                >
                  {PERCENTAGE_CALCULATIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Item name <em className="pos-required">*</em>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. USB-C cable 2m"
              />
            </label>

            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Optional description shown on the sales card"
              />
            </label>

            {!isPercentage && (
              <div className="misc-check-col">
                <label className="pos-checkbox">
                  <input
                    type="checkbox"
                    checked={isBarcode}
                    onChange={(e) => setIsBarcode(e.target.checked)}
                  />
                  Is Barcode
                </label>
                <label className="pos-checkbox">
                  <input
                    type="checkbox"
                    checked={commission}
                    onChange={(e) => setCommission(e.target.checked)}
                  />
                  Commission
                </label>
                <label className="pos-checkbox">
                  <input
                    type="checkbox"
                    checked={onPos}
                    onChange={(e) => setOnPos(e.target.checked)}
                  />
                  On Pos
                </label>
              </div>
            )}

            {isPercentage && (
              <label className="pos-checkbox">
                <input
                  type="checkbox"
                  checked={onPos}
                  onChange={(e) => setOnPos(e.target.checked)}
                />
                On Pos
              </label>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="misc-form-col">
            {isPercentage ? (
              <label>
                Percentage (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  placeholder="e.g. 5.00"
                />
              </label>
            ) : (
              <>
                <label>
                  Retail price
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(e.target.value)}
                  />
                </label>
                <label>
                  Cost price
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </label>
              </>
            )}

            <label>
              Tax class
              <span className="misc-tax-wrap">
                <input
                  list="misc-tax-options"
                  value={taxClass}
                  onChange={(e) => setTaxClass(e.target.value)}
                  placeholder="Search tax class"
                />
                {taxClass && (
                  <button
                    type="button"
                    className="misc-clear-btn"
                    onClick={() => setTaxClass("")}
                    aria-label="Clear tax class"
                  >
                    ×
                  </button>
                )}
              </span>
              <datalist id="misc-tax-options">
                {TAX_CLASSES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>

            <label className="pos-checkbox">
              <input
                type="checkbox"
                checked={taxInclusive}
                onChange={(e) => setTaxInclusive(e.target.checked)}
              />
              Tax inclusive
            </label>

            <div className="misc-picture">
              <span className="misc-picture-label">Picture</span>
              <small>Maximum 2MB, image files only.</small>
              <div
                className={
                  dragging
                    ? "misc-dropzone misc-dropzone--drag"
                    : "misc-dropzone"
                }
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
              >
                {image ? (
                  <img src={image} alt="Item preview" />
                ) : (
                  <>
                    <span className="misc-picture-placeholder">No image</span>
                    <span className="misc-drop-hint">Drop Image Here...</span>
                  </>
                )}
              </div>
              <div className="misc-picture-actions">
                <button
                  type="button"
                  className="pos-outline-btn"
                  onClick={() => fileInput.current?.click()}
                >
                  Upload...
                </button>
                <button
                  type="button"
                  className="pos-text-action misc-picture-remove"
                  onClick={() => {
                    setImage(null);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                >
                  Remove
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BULK DISCOUNT */}
      {!isPercentage && (
        <section className="pos-filter-card">
          <div className="pos-filter-heading">
            <div>
              <h2>Bulk discount</h2>
              <p>Offer a discount when this item is bought in bulk.</p>
            </div>
          </div>
          <div className="npf-toggle-row">
            <span>Bulk Discount?</span>
            <div className="npf-radio-group">
              <label>
                <input
                  type="radio"
                  checked={bulkDiscount}
                  onChange={() => setBulkDiscount(true)}
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  checked={!bulkDiscount}
                  onChange={() => setBulkDiscount(false)}
                />
                No
              </label>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <div className="pos-modal-actions">
        <Link href="/pos?section=Miscellaneous" className="pos-cancel">
          Cancel
        </Link>
        <button className="pos-create" type="submit" disabled={saving}>
          {saving
            ? "Saving…"
            : mode === "edit"
              ? "Update item"
              : "Create item"}
        </button>
      </div>
    </form>
  );
}
