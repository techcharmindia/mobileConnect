"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import RosterPanel from "./roster-panel";
type User = {
  id: number;
  name: string;
  role: "sales" | "follow_up" | "commission" | "admin";
  store: string;
};
type Sale = {
  id: number;
  sale_date: string;
  channel: string;
  customer_name: string;
  cac?: string;
  contact_number: string;
  email?: string;
  category: string;
  store_location?: string;
  staff?: string;
  notes?: string;
  status: string;
  gp?: number;
  order_number?: string;
  stock_item_used?: string;
};
type Stock = {
  id: number;
  name: string;
  sku: string;
  store: string;
  quantity: number;
  low_stock_threshold: number;
};
const fallback: User = {
  id: 0,
  name: "Vanshika",
  role: "sales",
  store: "Sunnybank Hills",
};
const today = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};
const money = (n: number) =>
  `$${Number(n || 0).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
const initials = (n: string) =>
  n
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2);
export default function TelstraWorkspace() {
  const [user] = useState<User>(() =>
    typeof window === "undefined"
      ? fallback
      : JSON.parse(
          sessionStorage.getItem("telstra-user") || JSON.stringify(fallback),
        ),
  );
  const [tab, setTab] = useState("today");
  const [sales, setSales] = useState<Sale[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    const [s, i] = await Promise.allSettled([
      fetch("/api/telstra/sales").then((r) =>
        r.ok ? r.json() : Promise.reject(),
      ),
      fetch("/api/telstra/stock").then((r) =>
        r.ok ? r.json() : Promise.reject(),
      ),
    ]);
    if (s.status === "fulfilled") setSales(s.value.sales || []);
    if (i.status === "fulfilled") setStock(i.value.stock || []);
    if (s.status === "rejected" || i.status === "rejected")
      setNotice(
        "Some live data could not load. Check the database connection.",
      );
    setLoading(false);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const todays = sales.filter((s) => s.sale_date === today());
  const mine = sales.filter((s) => s.staff === user.name);
  const gp = todays
    .filter((s) => s.staff === user.name)
    .reduce((a, s) => a + Number(s.gp || 0), 0);
  const ranking = useMemo(
    () =>
      Object.entries(
        sales
          .filter((s) => s.sale_date.slice(0, 7) === today().slice(0, 7))
          .reduce<Record<string, number>>((a, s) => {
            a[s.staff || "Unassigned"] =
              (a[s.staff || "Unassigned"] || 0) + Number(s.gp || 0);
            return a;
          }, {}),
      ).sort((a, b) => b[1] - a[1]),
    [sales],
  );
  const low = stock.filter((s) => s.quantity <= s.low_stock_threshold);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const body = {
      saleDate: f.get("saleDate"),
      channel: f.get("channel"),
      customerName: f.get("customerName"),
      orderNumber: f.get("orderNumber"),
      cac: f.get("cac"),
      contactNumber: f.get("contact"),
      email: f.get("email"),
      category: f.get("category"),
      storeLocation: user.store,
      staff: user.name,
      notes: f.get("notes"),
      status: "Pending",
      gp: Number(f.get("gp")),
      marketingConsent: f.get("marketingConsent"),
      stockItemUsed: f.get("stockItemUsed"),
      quantity: Number(f.get("quantity")),
    };
    const r = await fetch("/api/sales-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      setNotice("Sale could not be saved.");
      return;
    }
    const saved = await r.json();
    setSales((a) => [saved, ...a]);
    form.reset();
    setNotice("Sale saved — Today, My sales and the live leaderboard updated.");
  }
  async function saveStock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const r = await fetch("/api/telstra/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"),
        sku: f.get("sku"),
        quantity: Number(f.get("quantity")),
        lowStockThreshold: Number(f.get("threshold")),
        store: user.store,
      }),
    });
    if (!r.ok) {
      setNotice("Stock item could not be saved.");
      return;
    }
    const x = await r.json();
    setStock((a) => [x.stock, ...a.filter((i) => i.sku !== x.stock.sku)]);
    form.reset();
    setNotice("Stock saved to database.");
  }
  return (
    <main className="today-page">
      <header className="today-brand">
        <span className="today-logo">
          <i />
          <i />
          <i />
        </span>
        <div>
          <b>Mobile Connect OS</b>
          <small>
            One operating system — sales, roster, stock, commission & reporting
          </small>
        </div>
      </header>
      <div className="today-layout">
        <aside className="today-sidebar">
          <p>Sales floor</p>
          {[
            ["today", "Today"],
            ["my", "My Sales"],
            ["leader", "Leaderboard"],
          ].map(([k, l]) => (
            <button
              key={k}
              className={tab === k ? "active" : ""}
              onClick={() => setTab(k)}
            >
              {l}
            </button>
          ))}
          <p className="operation-label">Operations</p>
          <button
            className={tab === "stock" ? "active" : ""}
            onClick={() => setTab("stock")}
          >
            Stock {low.length > 0 && <em />}
          </button>
          <button onClick={() => setTab("roster")}>Roster</button>
          <div className="today-account">
            <p>Logged in</p>
            <b>{user.name}</b>
            <span>Sales Team</span>
            <button
              onClick={() => {
                sessionStorage.removeItem("telstra-user");
                location.href = "/dashboard";
              }}
            >
              Log Out
            </button>
          </div>
        </aside>
        <section className="today-content">
          {notice && (
            <div className="today-notice">
              {notice}
              <button onClick={() => setNotice("")}>×</button>
            </div>
          )}
          <Cards gp={gp} low={low.length} />
          {tab === "today" && (
            <>
              <Board data={ranking} user={user} />
              <div className="today-workspace">
                <Form user={user} submit={submit} />
                <section className="sales-card">
                  <h1>Today’s sales</h1>
                  <p>Live sales across all staff today</p>
                  <Table sales={todays} loading={loading} />
                </section>
              </div>
            </>
          )}
          {tab === "my" && (
            <Panel
              title="My sales"
              text="Only sales saved under your staff profile."
            >
              <Table sales={mine} loading={loading} />
            </Panel>
          )}
          {tab === "leader" && <Board data={ranking} user={user} full />}
          {tab === "stock" && (
            <>
              <Panel
                title="Stock"
                text={`${low.length} items need restocking — live inventory database.`}
              >
                <div className="stock-grid">
                  {stock.map((i) => (
                    <article key={i.id}>
                      <b>{i.name}</b>
                      <small>
                        {i.sku} · {i.store}
                      </small>
                      <strong>{i.quantity} units</strong>
                      <span
                        className={
                          i.quantity <= i.low_stock_threshold ? "low" : "good"
                        }
                      >
                        {i.quantity <= i.low_stock_threshold
                          ? "Low stock"
                          : "In stock"}
                      </span>
                    </article>
                  ))}
                </div>
              </Panel>
              <form className="stock-save data-panel" onSubmit={saveStock}>
                <h1>Add or restock item</h1>
                <div>
                  <input name="name" placeholder="Item name" required />
                  <input name="sku" placeholder="SKU" required />
                  <input
                    name="quantity"
                    type="number"
                    min="0"
                    placeholder="Quantity"
                    required
                  />
                  <input
                    name="threshold"
                    type="number"
                    min="0"
                    defaultValue="5"
                    required
                  />
                </div>
                <button className="submit-sale">Save stock item</button>
              </form>
            </>
          )}
          {tab === "roster" && <RosterPanel />}
        </section>
      </div>
    </main>
  );
}
function Cards({ gp, low }: { gp: number; low: number }) {
  return (
    <section className="today-cards">
      <article>
        <span>
          My GP today ·{" "}
          {new Date().toLocaleDateString("en-AU", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
        <strong>
          {money(gp)} <small>/ $600 target</small>
        </strong>
        <em>{money(Math.max(600 - gp, 0))} to go</em>
        <div className="mini-bars">
          <i />
          <i />
          <i />
          <i />
        </div>
      </article>
      <article>
        <span>🔥 Hot offers this month</span>
        <b>Double GP on DPC sales</b>
        <p>All of July — iPhone 17 series and Galaxy S26 series</p>
      </article>
      <article>
        <span>Low stock alerts</span>
        <strong>{low}</strong>
        <p>items need restocking</p>
      </article>
    </section>
  );
}
function Board({
  data,
  user,
  full = false,
}: {
  data: [string, number][];
  user: User;
  full?: boolean;
}) {
  const top = data.slice(0, 3);
  return (
    <section className={`leaderboard-card ${full ? "full" : ""}`}>
      <div className="leaderboard-header">
        <span>
          <i /> Live · team leaderboard this month
        </span>
        <small>All staff · database totals</small>
      </div>
      {!data.length ? (
        <p className="today-empty">No monthly sales recorded yet.</p>
      ) : (
        <>
          <div className="podiums">
            {[top[1], top[0], top[2]].map(
              (x, n) =>
                x && (
                  <div className={`podium podium-${n}`} key={x[0]}>
                    <b>{n === 1 ? 1 : n === 0 ? 2 : 3}</b>
                    <span>{initials(x[0])}</span>
                    <small>
                      {x[0]}
                      {x[0] === user.name ? " · You" : ""}
                    </small>
                    <strong>{money(x[1])}</strong>
                  </div>
                ),
            )}
          </div>
          <div className="leader-list">
            {data.slice(3, full ? undefined : 7).map(([n, g], i) => (
              <div key={n}>
                <b>#{i + 4}</b>
                <i>{initials(n)}</i>
                <span>{n}</span>
                <strong>{money(g)}</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
function Form({
  user,
  submit,
}: {
  user: User;
  submit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="sale-card" onSubmit={submit}>
      <h1>Log a sale</h1>
      <div className="sale-fields">
        <label>
          Date *
          <input name="saleDate" type="date" defaultValue={today()} required />
        </label>
        <label>
          Channel *
          <select name="channel" defaultValue="" required>
            <option value="" disabled>
              — Select —
            </option>
            <option>Walk-in</option>
            <option>Phone</option>
            <option>Online</option>
          </select>
        </label>
        <label>
          Order number *
          <input name="orderNumber" placeholder="e.g. ORD-10456" required />
        </label>
        <label>
          Billing Account Number (CAC) *
          <input name="cac" placeholder="e.g. BAN-8827441" required />
        </label>
        <label className="span-2">
          Customer name *
          <input name="customerName" placeholder="Jordan Blake" required />
        </label>
        <label>
          Mobile number *
          <input name="contact" placeholder="0412 345 678" required />
        </label>
        <label>
          Email *
          <input
            name="email"
            type="email"
            placeholder="jordan@email.com"
            required
          />
        </label>
        <label className="span-2">
          Product *
          <select name="category" defaultValue="" required>
            <option value="" disabled>
              — Select product —
            </option>
            <option>NBN Premium</option>
            <option>5G Internet</option>
            <option>Sim Only Plan</option>
            <option>DPC Device</option>
          </select>
        </label>
        <label>
          Sales rep *<input value={user.name} readOnly />
        </label>
        <label>
          Store
          <input value={user.store} readOnly />
        </label>
        <label className="span-2">
          Marketing consent
          <select name="marketingConsent">
            <option>Opted In</option>
            <option>Opted Out</option>
          </select>
        </label>
        <label className="span-2">
          GP ($) *
          <input
            name="gp"
            type="number"
            min="0"
            step=".01"
            placeholder="120"
            required
          />
        </label>
        <label className="span-2">
          Stock item used
          <select name="stockItemUsed">
            <option value="">— None, plan/service only —</option>
            <option>5G Modem</option>
            <option>NBN Modem</option>
            <option>SIM Card Pack</option>
          </select>
        </label>
        <label className="span-2">
          Qty
          <input
            name="quantity"
            type="number"
            min="1"
            defaultValue="1"
            required
          />
        </label>
        <label className="span-2">
          Notes (optional)
          <input
            name="notes"
            placeholder="Anything worth flagging about this sale"
          />
        </label>
      </div>
      <button className="submit-sale">Submit Sale</button>
      <p className="sale-footnote">
        Fields marked * are mandatory. Every sale is saved under your profile
        and appears in the team leaderboard.
      </p>
    </form>
  );
}
function Table({ sales, loading }: { sales: Sale[]; loading: boolean }) {
  if (loading) return <p className="today-empty">Loading live data…</p>;
  if (!sales.length)
    return <p className="today-empty">No sales logged yet today.</p>;
  return (
    <div className="sales-table">
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Contact</th>
            <th>Plan</th>
            <th>Rep</th>
            <th>Serial</th>
            <th>CAC</th>
            <th>GP</th>
            <th>Notes</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id}>
              <td>{s.customer_name}</td>
              <td>{s.contact_number}</td>
              <td>{s.category}</td>
              <td>{s.staff}</td>
              <td>{s.stock_item_used || "—"}</td>
              <td>{s.cac || "—"}</td>
              <td>{money(Number(s.gp || 0))}</td>
              <td>{s.notes || "—"}</td>
              <td>
                <span className="status-pill">{s.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Panel({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="data-panel">
      <h1>{title}</h1>
      <p>{text}</p>
      {children}
    </section>
  );
}
