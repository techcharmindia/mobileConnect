"use client";

import { FormEvent, useState } from "react";
type InventoryProduct = "nbn" | "5g" | "dpc" | "accessory";

const productIdentifiers: Record<InventoryProduct, { label: string; placeholder: string }> = {
  nbn: { label: "NBN modem serial number", placeholder: "Enter serial number" },
  "5g": { label: "5G modem serial number", placeholder: "Enter serial number" },
  dpc: { label: "DPC device IMEI number", placeholder: "Enter 15-digit IMEI" },
  accessory: { label: "Accessories product code", placeholder: "Enter product code" },
};

export default function InventoryForm() {
  const [product, setProduct] = useState<InventoryProduct>("nbn");
  const [message, setMessage] = useState("");
  const identifier = productIdentifiers[product];

  function submitInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Inventory item saved successfully.");
  }

  return <div className="inventory-page">
    <form className="sales-form inventory-form" onSubmit={submitInventory} onReset={() => setMessage("")}>
      <div className="form-section"><div className="form-grid col-12">
        <label className="field col-4"><span>Product <b>*</b></span><select name="product" value={product} onChange={(event) => setProduct(event.target.value as InventoryProduct)}><option value="nbn">NBN with serial number</option><option value="5g">5G Modem with serial number</option><option value="dpc">DPC Device with IMEI number</option><option value="accessory">Telstra Plus Accessory</option></select></label>
        <label className="field col-4"><span>{identifier.label} <b>*</b></span><input name="productIdentifier" type="text" placeholder={identifier.placeholder} required /></label>
      </div></div>
      <div className="form-section"><div className="form-grid col-12">
        <label className="field col-4"><span>Live stock count <b>*</b></span><input name="stockCount" type="number" min="0" placeholder="0" required /></label>
        <label className="field col-4"><span>Low stock alert <b>*</b></span><input name="lowStockAlert" type="number" min="0" placeholder="Set alert quantity" required /></label>
        <label className="field col-4"><span>Stock history <b>*</b></span><select name="stockHistory" required defaultValue=""><option value="" disabled>Select stock movement</option><option value="sold">Sold</option><option value="transferred">Transferred</option></select></label>
      </div></div>
      <div className="form-actions"><p className="form-message" aria-live="polite">{message}</p><button className="button button-secondary" type="reset">Clear form</button><button className="button button-primary" type="submit">Save inventory item <span>→</span></button></div>
    </form>
  </div>;
}
