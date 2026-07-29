"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type User = {
  id: number;
  name: string;
  role: "sales" | "follow_up" | "commission" | "admin";
  store: string;
};
type Sale = {
  id?: number;
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
};
type Tab =
  | "today"
  | "my-sales"
  | "customers"
  | "leaderboard"
  | "orders"
  | "stock"
  | "roster"
  | "commission"
  | "performance"
  | "close";
const demoUser: User = {
  id: 0,
  name: "Vanshika",
  role: "sales",
  store: "Underwood",
};
const roleLabels = {
  sales: "Sales Team",
  follow_up: "Follow Up Team",
  commission: "Commission Team",
  admin: "Admin",
};
const seedStock = [
  { name: "5G Modem", sku: "5GM-100", quantity: 4, threshold: 5 },
  { name: "NBN Modem", sku: "NBN-201", quantity: 18, threshold: 5 },
  { name: "SIM Card Pack", sku: "SIM-001", quantity: 32, threshold: 10 },
];

function SaleTable({
  sales,
  canUpdate,
  onStatus,
}: {
  sales: Sale[];
  canUpdate?: boolean;
  onStatus?: (sale: Sale, status: string) => void;
}) {
  return (
    <div className="telstra-table">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>Plan / category</th>
            <th>Rep</th>
            <th>Store</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale, index) => (
            <tr key={sale.id ?? `${sale.customer_name}-${index}`}>
              <td>{sale.sale_date}</td>
              <td>
                <b>{sale.customer_name}</b>
                <small>{sale.contact_number}</small>
              </td>
              <td>
                <span className="plan-pill">{sale.category}</span>
              </td>
              <td>{sale.staff || "—"}</td>
              <td>{sale.store_location || "—"}</td>
              <td>
                {canUpdate ? (
                  <select
                    className="order-status"
                    value={sale.status}
                    onChange={(event) => onStatus?.(sale, event.target.value)}
                  >
                    <option>Submitted</option>
                    <option>In Progress</option>
                    <option>Activated</option>
                    <option>Paid</option>
                  </select>
                ) : (
                  <span
                    className={`order-pill ${sale.status.toLowerCase().replaceAll(" ", "-")}`}
                  >
                    {sale.status}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sales.length === 0 && (
        <p className="telstra-empty">No records to show yet.</p>
      )}
    </div>
  );
}

export default function TelstraWorkspace() {
  const [user] = useState<User>(() => {
    if (typeof window === "undefined") return demoUser;
    const stored = sessionStorage.getItem("telstra-user");
    return stored ? JSON.parse(stored) : demoUser;
  });
  const [tab, setTab] = useState<Tab>("today");
  const [sales, setSales] = useState<Sale[]>([]);
  const [stock, setStock] = useState(seedStock);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    fetch("/api/telstra/sales")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.sales) setSales(data.sales);
      })
      .catch(() => undefined);
  }, []);
  const mySales = useMemo(
    () => sales.filter((sale) => sale.staff === user.name),
    [sales, user.name],
  );
  const leaderboard = useMemo(
    () =>
      Object.entries(
        sales.reduce<Record<string, number>>((all, sale) => {
          const person = sale.staff || "Unassigned";
          all[person] = (all[person] || 0) + Number(sale.gp || 0);
          return all;
        }, {}),
      ).sort((a, b) => b[1] - a[1]),
    [sales],
  );
  const canManage = user.role === "admin" || user.role === "commission";
  const canOrders = canManage || user.role === "follow_up";
  async function changeStatus(sale: Sale, status: string) {
    if (!sale.id) return;
    const response = await fetch("/api/telstra/sales", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sale.id, status }),
    });
    if (response.ok)
      setSales((entries) =>
        entries.map((item) =>
          item.id === sale.id ? { ...item, status } : item,
        ),
      );
    else setNotice("Order update could not be saved.");
  }
  async function addSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const sale: Sale = {
      sale_date: String(form.get("saleDate")),
      channel: String(form.get("channel")),
      customer_name: String(form.get("customerName")),
      cac: String(form.get("cac")),
      contact_number: String(form.get("contact")),
      email: String(form.get("email")),
      category: String(form.get("category")),
      store_location: user.store,
      staff: user.name,
      notes: String(form.get("notes")),
      status: "Submitted",
      gp: Number(form.get("gp") || 0),
    };
    const response = await fetch("/api/sales-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sale),
    });
    if (response.ok) {
      const saved = await response.json();
      setSales((entries) => [{ ...sale, ...saved }, ...entries]);
      event.currentTarget.reset();
      setNotice("Sale saved and added to the customer audit.");
    } else
      setNotice(
        "Sale could not be saved. Check the PostgreSQL sales_entry table.",
      );
  }
  function addStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setStock((items) => [
      ...items,
      {
        name: String(values.get("item")),
        sku: String(values.get("sku")),
        quantity: Number(values.get("quantity")),
        threshold: Number(values.get("threshold")),
      },
    ]);
    event.currentTarget.reset();
    setNotice(
      "Stock item added to this demo workspace. Connect inventory_items API to persist it.",
    );
  }
  function logout() {
    sessionStorage.removeItem("telstra-user");
    location.href = "/dashboard";
  }
  const nav: { key: Tab; label: string; allowed?: boolean }[] = [
    { key: "today", label: "Today" },
    { key: "my-sales", label: "My sales" },
    { key: "customers", label: "All customers · audit", allowed: canOrders },
    { key: "leaderboard", label: "Leaderboard" },
    { key: "orders", label: "Orders & activations", allowed: canOrders },
    { key: "stock", label: "Stock" },
    { key: "roster", label: "Roster", allowed: canManage },
    { key: "commission", label: "Commission", allowed: canManage },
    {
      key: "performance",
      label: "Staff performance",
      allowed: user.role === "admin",
    },
    { key: "close", label: "Close day", allowed: canManage },
  ];
  return (
    <main className="telstra-page">
      <header className="telstra-topbar">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">M</span>
          <span>
            Mobile Connect <small>Telstra CRM</small>
          </span>
        </Link>
        <div>
          <span className="telstra-user">
            {user.name} · {roleLabels[user.role]}
          </span>
          <button className="text-button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <div className="telstra-layout">
        <aside className="telstra-sidebar">
          <p>Sales floor</p>
          {nav
            .filter((item) => item.allowed !== false)
            .map((item) => (
              <button
                className={tab === item.key ? "active" : ""}
                key={item.key}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          <div className="sidebar-user">
            <b>{user.name}</b>
            <span>{user.store}</span>
            <em>{roleLabels[user.role]}</em>
          </div>
        </aside>
        <section className="telstra-main">
          {notice && (
            <div className="telstra-notice">
              {notice}
              <button onClick={() => setNotice("")}>×</button>
            </div>
          )}
          <Kpis sales={sales} user={user} stock={stock} />
          {tab === "today" && <Today sales={sales} onSubmit={addSale} />}
          {tab === "my-sales" && (
            <Panel
              title="My sales"
              description="Only sales logged under your staff profile."
            >
              <SaleTable sales={mySales} />
            </Panel>
          )}
          {tab === "customers" && (
            <Panel
              title="All customer records"
              description="Audit view for follow-up and administration teams."
            >
              <SaleTable
                sales={sales}
                canUpdate={canOrders}
                onStatus={changeStatus}
              />
            </Panel>
          )}
          {tab === "leaderboard" && (
            <Leaderboard data={leaderboard} user={user} />
          )}
          {tab === "orders" && (
            <Panel
              title="Orders & activations"
              description="Move submitted sales through the activation workflow."
            >
              <SaleTable sales={sales} canUpdate onStatus={changeStatus} />
            </Panel>
          )}
          {tab === "stock" && (
            <Stock stock={stock} canManage={canManage} onSubmit={addStock} />
          )}
          {tab === "roster" && <Roster />}
          {tab === "commission" && <Commission sales={sales} />}
          {tab === "performance" && <Performance leaderboard={leaderboard} />}
          {tab === "close" && <CloseDay sales={sales} />}
        </section>
      </div>
    </main>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="telstra-panel">
      <div className="telstra-panel-head">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
function Kpis({
  sales,
  user,
  stock,
}: {
  sales: Sale[];
  user: User;
  stock: typeof seedStock;
}) {
  const gp = sales
    .filter((sale) => sale.staff === user.name)
    .reduce((total, sale) => total + Number(sale.gp || 0), 0);
  return (
    <section className="telstra-kpis">
      <article>
        <span>My GP today</span>
        <strong>${gp.toLocaleString()}</strong>
        <small>of $600 target</small>
      </article>
      <article>
        <span>Sales logged</span>
        <strong>{sales.length}</strong>
        <small>All stores</small>
      </article>
      <article>
        <span>Low stock alerts</span>
        <strong>
          {stock.filter((item) => item.quantity <= item.threshold).length}
        </strong>
        <small>Items needing attention</small>
      </article>
    </section>
  );
}
function Today({
  sales,
  onSubmit,
}: {
  sales: Sale[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="telstra-today">
      <form className="telstra-panel sale-form" onSubmit={onSubmit}>
        <div className="telstra-panel-head">
          <div>
            <h1>Log a sale</h1>
            <p>Sales are saved to PostgreSQL and start as Submitted.</p>
          </div>
        </div>
        <div className="telstra-form-grid">
          <label>
            Date *
            <input
              defaultValue={new Date().toISOString().slice(0, 10)}
              name="saleDate"
              type="date"
              required
            />
          </label>
          <label>
            Channel *
            <select name="channel" required defaultValue="">
              <option value="" disabled>
                Select channel
              </option>
              <option>Walk-in</option>
              <option>Referral</option>
              <option>Phone</option>
            </select>
          </label>
          <label>
            Customer name *
            <input name="customerName" placeholder="Customer name" required />
          </label>
          <label>
            Mobile *<input name="contact" placeholder="0412 345 678" required />
          </label>
          <label>
            Email
            <input name="email" type="email" placeholder="customer@email.com" />
          </label>
          <label>
            CAC
            <input name="cac" placeholder="Billing account number" />
          </label>
          <label>
            Product / plan *
            <select name="category" required defaultValue="">
              <option value="" disabled>
                Select plan
              </option>
              <option>NBN Premium</option>
              <option>5G Internet</option>
              <option>Sim Only Plan</option>
              <option>DPC Device</option>
              <option>Accessory</option>
            </select>
          </label>
          <label>
            GP ($)
            <input
              name="gp"
              min="0"
              step="0.01"
              type="number"
              placeholder="0.00"
            />
          </label>
          <label className="wide">
            Notes
            <input name="notes" placeholder="Anything worth flagging" />
          </label>
        </div>
        <button className="button button-primary" type="submit">
          Submit sale →
        </button>
      </form>
      <Panel
        title="Today's sales"
        description={`${sales.length} sales logged across the workspace.`}
      >
        <SaleTable sales={sales.slice(0, 8)} />
      </Panel>
    </div>
  );
}
function Leaderboard({ data, user }: { data: [string, number][]; user: User }) {
  return (
    <Panel
      title="Team leaderboard"
      description="Monthly GP ranking. Customer details are never shown here."
    >
      <div className="leaderboard">
        {data.length ? (
          data.map(([name, gp], index) => (
            <div
              className={name === user.name ? "leader-row mine" : "leader-row"}
              key={name}
            >
              <b>#{index + 1}</b>
              <span>{name}</span>
              <i
                style={{
                  width: `${Math.max(8, (gp / (data[0]?.[1] || 1)) * 100)}%`,
                }}
              ></i>
              <strong>${gp.toLocaleString()}</strong>
            </div>
          ))
        ) : (
          <p className="telstra-empty">No sales to rank yet.</p>
        )}
      </div>
    </Panel>
  );
}
function Stock({
  stock,
  canManage,
  onSubmit,
}: {
  stock: typeof seedStock;
  canManage: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <Panel
        title="In-store stock"
        description="Live store stock view; low levels are highlighted."
      >
        <div className="stock-list">
          {stock.map((item) => (
            <div key={item.sku}>
              <b>
                {item.name}
                <small>{item.sku}</small>
              </b>
              <span>{item.quantity} units</span>
              <em className={item.quantity <= item.threshold ? "low" : "ok"}>
                {item.quantity <= item.threshold ? "Low stock" : "In stock"}
              </em>
            </div>
          ))}
        </div>
      </Panel>
      {canManage && (
        <form className="telstra-panel stock-form" onSubmit={onSubmit}>
          <h1>Add / restock item</h1>
          <div className="telstra-form-grid">
            <label>
              Item name
              <input name="item" required />
            </label>
            <label>
              SKU
              <input name="sku" required />
            </label>
            <label>
              Quantity
              <input name="quantity" type="number" min="0" required />
            </label>
            <label>
              Low stock at
              <input
                name="threshold"
                type="number"
                min="0"
                defaultValue="5"
                required
              />
            </label>
          </div>
          <button className="button button-primary">Save stock item</button>
        </form>
      )}
    </>
  );
}
function Roster() {
  return (
    <Panel
      title="Weekly shift roster"
      description="Team roster and clock-on are ready for PostgreSQL data."
    >
      <div className="roster-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day}>
            <b>{day}</b>
            <span>9:00 AM – 5:00 PM</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
function Commission({ sales }: { sales: Sale[] }) {
  const pending = sales.filter((sale) => sale.status !== "Paid");
  return (
    <Panel
      title="Commission reconciliation"
      description="Match Telstra reports and create claims for exceptions."
    >
      <div className="commission-summary">
        <article>
          <span>Matched & paid</span>
          <b>{sales.filter((sale) => sale.status === "Paid").length}</b>
        </article>
        <article>
          <span>Exceptions</span>
          <b>{pending.length}</b>
        </article>
        <article>
          <span>Claims</span>
          <b>0</b>
        </article>
      </div>
      <SaleTable sales={pending} />
    </Panel>
  );
}
function Performance({ leaderboard }: { leaderboard: [string, number][] }) {
  return (
    <Panel
      title="Staff performance"
      description="Management summary for this month."
    >
      <div className="performance-list">
        {leaderboard.map(([name, gp]) => (
          <div key={name}>
            <b>{name}</b>
            <span>${gp.toLocaleString()} GP</span>
            <small>Sales and follow-up reporting ready</small>
          </div>
        ))}
      </div>
    </Panel>
  );
}
function CloseDay({ sales }: { sales: Sale[] }) {
  const gp = sales.reduce((sum, sale) => sum + Number(sale.gp || 0), 0);
  return (
    <Panel
      title="Daily close"
      description="Review today's results before sending the store report."
    >
      <div className="commission-summary">
        <article>
          <span>Daily GP</span>
          <b>${gp.toLocaleString()}</b>
        </article>
        <article>
          <span>Sales</span>
          <b>{sales.length}</b>
        </article>
        <article>
          <span>Activated</span>
          <b>{sales.filter((sale) => sale.status === "Activated").length}</b>
        </article>
      </div>
      <button
        className="button button-primary"
        onClick={() =>
          alert("Daily report prepared for WhatsApp and email delivery.")
        }
      >
        Prepare daily report
      </button>
    </Panel>
  );
}
