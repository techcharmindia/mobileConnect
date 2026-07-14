"use client";

import { ChangeEvent, FormEvent, useState } from "react";

const today = new Date().toISOString().slice(0, 10);
const salesColumns = ["Date", "Channel", "Customer", "CAC", "Contact", "Email", "Category", "Store", "Staff", "Notes", "Status"];
type SalesRecord = Record<(typeof salesColumns)[number], string>;

export default function SalesEntryForm() {
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState("ppn");
  const [sales, setSales] = useState<SalesRecord[]>([]);

  function updateNotes(event: ChangeEvent<HTMLTextAreaElement>) { setNotes(event.target.value.slice(0, 250)); }
  function selectPlan(categoryValue: string, planValue: string) { setCategory(planValue); setHoveredCategory(categoryValue); setIsCategoryMenuOpen(false); }
  function submitSales(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSales((entries) => [...entries, {
      Date: String(values.get("date") ?? ""), Channel: String(values.get("channel") ?? ""), Customer: String(values.get("customer") ?? ""),
      CAC: String(values.get("cac") ?? ""), Contact: String(values.get("contact") ?? ""), Email: String(values.get("email") ?? ""),
      Category: category, Store: String(values.get("store") ?? ""), Staff: String(values.get("staff") ?? ""), Notes: notes, Status: String(values.get("status") ?? ""),
    }]);
    event.currentTarget.reset();
    setNotes("");
    setCategory("");
  }
  function downloadSalesCsv() {
    const csv = [salesColumns, ...sales.map((entry) => salesColumns.map((column) => entry[column]))]
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    link.download = "sales-entries.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return <>
    <div className="page-heading"><p className="eyebrow">Sales Entry</p></div>
    <form className="sales-form" onSubmit={submitSales} onReset={() => { setNotes(""); setCategory(""); }}>
      <div className="form-section"><div className="form-grid col-12">
        <label className="field col-4"><span>Date <b>*</b></span><input name="date" type="date" defaultValue={today} required /></label>
        <label className="field col-4"><span>Channel <b>*</b></span><select name="channel" required defaultValue=""><option value="" disabled>Select channel</option><option>Ahmad General store</option><option>Ali boutique</option><option>Milan store</option><option>Star Hotel</option></select></label>
        <label className="field col-4"><span>Customer name <b>*</b></span><input name="customer" type="text" placeholder="Enter customer name" required /></label>
        <label className="field col-4"><span>CAC</span><input name="cac" type="text" placeholder="Enter CAC number" /></label>
        <label className="field col-4"><span>Contact number <b>*</b></span><input name="contact" type="tel" placeholder="XXXX XXX XXX" required /></label>
        <label className="field col-4"><span>Email address</span><input name="email" type="email" placeholder="customer@email.com" /></label>
      </div></div>
      <div className="form-section"><div className="form-grid col-12">
        <div className="field category-field col-4"><span>Category <b>*</b></span><button className="category-trigger" type="button" onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)} aria-expanded={isCategoryMenuOpen}>{category || "Select category"}<span>⌄</span></button>
          {isCategoryMenuOpen && <div className="category-menu" onMouseLeave={() => setHoveredCategory("ppn")}><div className="category-list">{[["ppn", "PPN"], ["nbn", "NBN"], ["mobile", "Mobile"]].map(([value, label]) => <button key={value} type="button" className={hoveredCategory === value ? "menu-category active" : "menu-category"} onMouseEnter={() => setHoveredCategory(value)} onFocus={() => setHoveredCategory(value)} onClick={() => setCategory(label)}>{label}<span>›</span></button>)}</div><div className="plan-submenu"><span className="submenu-title">{hoveredCategory.toUpperCase()} plans</span>{(hoveredCategory === "ppn" ? ["PPN Basic", "PPN Premium"] : hoveredCategory === "nbn" ? ["NBN Everyday", "NBN Fast"] : ["Apple iPhone - $95", "Samsung Galaxy - $85"]).map((item) => <button key={item} type="button" onClick={() => selectPlan(hoveredCategory, item)}>{item}</button>)}</div></div>}
        </div>
        <label className="field col-4"><span>Store location</span><select name="store" defaultValue=""><option value="" disabled>Select store location</option><option>Underwood</option><option>Sunnybank Hills</option></select></label>
        <label className="field col-4"><span>Staff</span><input name="staff" type="text" placeholder="Staff member name" /></label>
      </div></div>
      <div className="form-section final-section"><div className="form-grid col-12">
        <label className="field notes-field col-8"><span>Notes</span><textarea name="notes" value={notes} onChange={updateNotes} maxLength={250} placeholder="Add any useful notes about this sale..." /><small>{notes.length}/250 characters</small></label>
        <label className="field col-4"><span>Status <b>*</b></span><select name="status" required defaultValue="Submitted"><option>Submitted</option><option>In Progress</option><option>Activated</option><option>Cancelled</option><option>Paid</option></select><small className="status-help">Choose the current sales stage.</small></label>
      </div></div>
      <div className="form-actions"><button className="button button-secondary" type="reset">Clear form</button><button className="button button-primary" type="submit">Submit sales entry <span>→</span></button></div>
    </form>
    {sales.length > 0 && <section className="submitted-data"><div className="table-heading"><div><h2>Submitted sales</h2><p>{sales.length} saved {sales.length === 1 ? "entry" : "entries"}</p></div><button className="button button-secondary" type="button" onClick={downloadSalesCsv}>Download CSV</button></div><div className="table-scroll"><table><thead><tr>{salesColumns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{sales.map((entry, index) => <tr key={`${entry.Customer}-${index}`}>{salesColumns.map((column) => <td key={column}>{entry[column] || "—"}</td>)}</tr>)}</tbody></table></div></section>}
  </>;
}
