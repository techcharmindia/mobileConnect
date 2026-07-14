"use client";

import { ChangeEvent, useState } from "react";

const today = new Date().toISOString().slice(0, 10);

export default function SalesEntryForm() {
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState("ppn");

  function updateNotes(event: ChangeEvent<HTMLTextAreaElement>) { setNotes(event.target.value.slice(0, 250)); }
  function selectPlan(categoryValue: string, planValue: string) { setCategory(planValue); setHoveredCategory(categoryValue); setIsCategoryMenuOpen(false); }

  return <>
    <div className="page-heading"><p className="eyebrow">Sales Entry</p></div>
    <form className="sales-form">
      <div className="form-section"><div className="form-grid col-12">
        <label className="field col-4"><span>Date <b>*</b></span><input type="date" defaultValue={today} required /></label>
        <label className="field col-4"><span>Channel <b>*</b></span><select required defaultValue=""><option value="" disabled>Select channel</option><option>Ahmad General store</option><option>Ali boutique</option><option>Milan store</option><option>Star Hotel</option></select></label>
        <label className="field col-4"><span>Customer name <b>*</b></span><input type="text" placeholder="Enter customer name" required /></label>
        <label className="field col-4"><span>CAC</span><input type="text" placeholder="Enter CAC number" /></label>
        <label className="field col-4"><span>Contact number <b>*</b></span><input type="tel" placeholder="XXXX XXX XXX" required /></label>
        <label className="field col-4"><span>Email address</span><input type="email" placeholder="customer@email.com" /></label>
      </div></div>
      <div className="form-section"><div className="form-grid col-12">
        <div className="field category-field col-4"><span>Category <b>*</b></span><button className="category-trigger" type="button" onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)} aria-expanded={isCategoryMenuOpen}>{category ? category.toUpperCase() : "Select category"}<span>⌄</span></button>
          {isCategoryMenuOpen && <div className="category-menu" onMouseLeave={() => setHoveredCategory("ppn")}><div className="category-list">{[["ppn", "PPN"], ["nbn", "NBN"], ["mobile", "Mobile"]].map(([value, label]) => <button key={value} type="button" className={hoveredCategory === value ? "menu-category active" : "menu-category"} onMouseEnter={() => setHoveredCategory(value)} onFocus={() => setHoveredCategory(value)} onClick={() => setCategory(value)}>{label}<span>›</span></button>)}</div><div className="plan-submenu"><span className="submenu-title">{hoveredCategory.toUpperCase()} plans</span>{(hoveredCategory === "ppn" ? ["PPN Basic", "PPN Premium"] : hoveredCategory === "nbn" ? ["NBN Everyday", "NBN Fast"] : ["Apple iPhone - $95", "Samsung Galaxy - $85"]).map((item) => <button key={item} type="button" onClick={() => selectPlan(hoveredCategory, item)}>{item}</button>)}</div></div>}
        </div>
        <label className="field col-4"><span>Store location</span><select defaultValue=""><option value="" disabled>Select store location</option><option>Underwood</option><option>Sunnybank Hills</option></select></label>
        <label className="field col-4"><span>Staff</span><input type="text" placeholder="Staff member name" /></label>
      </div></div>
      <div className="form-section final-section"><div className="form-grid col-12">
        <label className="field notes-field col-8"><span>Notes</span><textarea value={notes} onChange={updateNotes} maxLength={250} placeholder="Add any useful notes about this sale..." /><small>{notes.length}/250 characters</small></label>
        <label className="field col-4"><span>Status <b>*</b></span><select required defaultValue="Submitted"><option>Submitted</option><option>In Progress</option><option>Activated</option><option>Cancelled</option><option>Paid</option></select><small className="status-help">Choose the current sales stage.</small></label>
      </div></div>
      <div className="form-actions"><button className="button button-secondary" type="reset" onClick={() => { setNotes(""); setCategory(""); }}>Clear form</button><button className="button button-primary" type="submit">Submit sales entry <span>→</span></button></div>
    </form>
  </>;
}
