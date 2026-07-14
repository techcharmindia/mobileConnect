"use client";

import { FormEvent, useState } from "react";

type InventoryProduct = "nbn" | "5g" | "dpc" | "accessory";
type InventoryRecord = { product: string; identifier: string; stockCount: string; lowStockAlert: string; stockHistory: string };
const inventoryColumns: (keyof InventoryRecord)[] = ["product", "identifier", "stockCount", "lowStockAlert", "stockHistory"];
const inventoryLabels: Record<keyof InventoryRecord, string> = { product: "Product", identifier: "Serial / IMEI / Code", stockCount: "Live stock", lowStockAlert: "Low stock alert", stockHistory: "Stock history" };
const productIdentifiers: Record<InventoryProduct, { label: string; placeholder: string }> = { nbn: { label: "NBN modem serial number", placeholder: "Enter serial number" }, "5g": { label: "5G modem serial number", placeholder: "Enter serial number" }, dpc: { label: "DPC device IMEI number", placeholder: "Enter 15-digit IMEI" }, accessory: { label: "Accessories product code", placeholder: "Enter product code" } };

export default function InventoryForm() {
  const [product, setProduct] = useState<InventoryProduct>("nbn");
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const identifier = productIdentifiers[product];
  function submitInventory(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const values = new FormData(event.currentTarget); setInventory((entries) => [...entries, { product: String(values.get("product")), identifier: String(values.get("productIdentifier")), stockCount: String(values.get("stockCount")), lowStockAlert: String(values.get("lowStockAlert")), stockHistory: String(values.get("stockHistory")) }]); event.currentTarget.reset(); setProduct("nbn"); }
  function downloadInventoryCsv() { const csv = [[...inventoryColumns.map((column) => inventoryLabels[column])], ...inventory.map((entry) => inventoryColumns.map((column) => entry[column]))].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })); link.download = "inventory-entries.csv"; link.click(); URL.revokeObjectURL(link.href); }
  return <div className="inventory-page">
    <form className="sales-form inventory-form" onSubmit={submitInventory}>
      <div className="form-section"><div className="form-grid col-12"><label className="field col-4"><span>Product <b>*</b></span><select name="product" value={product} onChange={(event) => setProduct(event.target.value as InventoryProduct)}><option value="nbn">NBN with serial number</option><option value="5g">5G Modem with serial number</option><option value="dpc">DPC Device with IMEI number</option><option value="accessory">Telstra Plus Accessory</option></select></label><label className="field col-4"><span>{identifier.label} <b>*</b></span><input name="productIdentifier" type="text" placeholder={identifier.placeholder} required /></label></div></div>
      <div className="form-section"><div className="form-grid col-12"><label className="field col-4"><span>Live stock count <b>*</b></span><input name="stockCount" type="number" min="0" placeholder="0" required /></label><label className="field col-4"><span>Low stock alert <b>*</b></span><input name="lowStockAlert" type="number" min="0" placeholder="Set alert quantity" required /></label><label className="field col-4"><span>Stock history <b>*</b></span><select name="stockHistory" required defaultValue=""><option value="" disabled>Select stock movement</option><option value="sold">Sold</option><option value="transferred">Transferred</option></select></label></div></div>
      <div className="form-actions"><button className="button button-secondary" type="reset">Clear form</button><button className="button button-primary" type="submit">Save inventory item <span>→</span></button></div>
    </form>
    {inventory.length > 0 && <section className="submitted-data"><div className="table-heading"><div><h2>Saved inventory</h2><p>{inventory.length} saved {inventory.length === 1 ? "item" : "items"}</p></div><button className="button button-secondary" type="button" onClick={downloadInventoryCsv}>Download CSV</button></div><div className="table-scroll"><table><thead><tr>{inventoryColumns.map((column) => <th key={column}>{inventoryLabels[column]}</th>)}</tr></thead><tbody>{inventory.map((entry, index) => <tr key={`${entry.identifier}-${index}`}>{inventoryColumns.map((column) => <td key={column}>{entry[column]}</td>)}</tr>)}</tbody></table></div></section>}
  </div>;
}
