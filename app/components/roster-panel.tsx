"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type User = { id: number; name: string; role: string; store: string };
type Staff = { id: number; name: string; store: string };
type Shift = { staff_user_id: number; shift_date: string; shift_label: string };
type ClockStaff = Staff & { clocked_in_at: string | null };

const labels = ["Off", "9-5", "10-3", "11-7"];
const dateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const calendarDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};
function monday(value = dateOnly(new Date())) {
  const d = calendarDate(value);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateOnly(d);
}
function datesFor(week: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = calendarDate(week);
    d.setDate(d.getDate() + i);
    return dateOnly(d);
  });
}
function formatTime(value: string | null) {
  return value
    ? new Date(value).toLocaleTimeString("en-AU", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
}

export default function RosterPanel({ user }: { user: User }) {
  const [weekStart, setWeekStart] = useState(() => monday());
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [clock, setClock] = useState<ClockStaff[]>([]);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [status, setStatus] = useState("published");
  const [inherited, setInherited] = useState(false);
  const [notice, setNotice] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const admin = user.role === "admin";

  const load = useCallback(async () => {
    const [rosterResponse, clockResponse] = await Promise.all([
      fetch(`/api/telstra/roster?weekStart=${weekStart}`),
      fetch("/api/telstra/clock"),
    ]);
    if (rosterResponse.ok) {
      const data = await rosterResponse.json();
      setStaff(data.staff ?? []);
      setShifts(data.shifts ?? []);
      setPublishedAt(data.publishedAt);
      setStatus(data.status ?? "published");
      setInherited(Boolean(data.inherited));
    } else setNotice("Roster could not load. Please sign in again.");
    if (clockResponse.ok) setClock((await clockResponse.json()).staff ?? []);
  }, [weekStart]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const dates = useMemo(() => datesFor(weekStart), [weekStart]);
  const shift = (staffId: number, date: string) =>
    shifts.find(
      (item) => item.staff_user_id === staffId && item.shift_date === date,
    )?.shift_label ?? "Off";
  const me = clock.find((person) => person.id === user.id);
  const isClockedIn = Boolean(me?.clocked_in_at);
  const stores = [...new Set(staff.map((person) => person.store))];
  const selectedWeekLabel = `${calendarDate(dates[0]).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })} – ${calendarDate(dates[6]).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}`;

  async function change(action: string, body: Record<string, unknown>) {
    setSaving(true);
    const response = await fetch("/api/telstra/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, weekStart, ...body }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setNotice(data.message ?? "Change could not be saved.");
      return;
    }
    setNotice(
      action === "publish"
        ? "Roster published. Staff can now see the approved schedule."
        : "Draft saved.",
    );
    await load();
  }
  async function clockAction() {
    const response = await fetch("/api/telstra/clock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin,
        action: isClockedIn ? "clock_out" : "clock_in",
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setNotice(data.message ?? "Clock event could not be saved.");
      return;
    }
    setPin("");
    setNotice(isClockedIn ? "You are clocked out." : "You are clocked in.");
    await load();
  }
  return (
    <div className="roster-page">
      {notice && (
        <div className="today-notice">
          {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}
      <div className="roster-top-grid">
        <section className="data-panel clock-card">
          <h1>Staff login</h1>
          <p>Clock in only on your own staff profile.</p>
          <b className="clock-name">{user.name}</b>
          <small>{user.store}</small>
          <label>
            PIN
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              type="password"
              inputMode="numeric"
              maxLength={20}
              placeholder="••••"
            />
          </label>
          <button
            className={isClockedIn ? "clock-out" : "submit-sale"}
            disabled={!pin}
            onClick={() => void clockAction()}
          >
            {isClockedIn ? "Clock Out" : "Clock In"}
          </button>
          {/* <button
            className="face-preview"
            onClick={() =>
              setNotice(
                "Face ID is a concept preview only. Use your PIN to record a clock event.",
              )
            }
          >
            🔓 Use Face ID / Face Unlock instead
          </button> */}
          <p className="roster-note">
            Each staff member logs into their own profile to clock on — nobody
            clocks in on someone else&apos;s behalf.
          </p>
        </section>
        <section className="data-panel">
          <h1>Who&apos;s working right now</h1>
          <div className="clock-list">
            {clock.map((person) => (
              <div key={person.id}>
                <span>
                  {person.name}
                  {person.id === user.id ? " (you)" : ""}
                </span>
                <b className={person.clocked_in_at ? "in" : "out"}>
                  {person.clocked_in_at
                    ? `● In since ${formatTime(person.clocked_in_at)}`
                    : "● Clocked out"}
                </b>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="data-panel roster-section">
        <div className="roster-heading">
          <div>
            <h1>Store assignments</h1>
            <p>
              Sales are automatically recorded against each staff member&apos;s
              assigned store.
            </p>
          </div>
          <small>
            🔒{" "}
            {admin
              ? "Admin access — changes save immediately."
              : "View only — reassigning staff is Admin only."}
          </small>
        </div>
        <div className="sales-table">
          <table>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Store</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((person) => (
                <tr key={person.id}>
                  <td>
                    <b>{person.name}</b>
                  </td>
                  <td>
                    {admin ? (
                      <select
                        value={person.store}
                        disabled={saving}
                        onChange={(e) =>
                          void change("assign_store", {
                            staffUserId: person.id,
                            store: e.target.value,
                          })
                        }
                      >
                        {stores.map((store) => (
                          <option key={store}>{store}</option>
                        ))}
                      </select>
                    ) : (
                      person.store
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="data-panel roster-section">
        <div className="roster-heading">
          <div>
            <h1>Weekly shift roster</h1>
            <p>
              {publishedAt
                ? `Published ${new Date(publishedAt).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}.`
                : "No published roster for this week yet."}
            </p>
          </div>
          <div className="roster-actions">
            <div className="range-picker">
              <label htmlFor="roster-week-start">Select a range</label>
              <div>
                <input id="roster-week-start" aria-label="Roster week start" type="date" value={weekStart} onChange={(e) => setWeekStart(monday(e.target.value))} />
                <span>to</span>
                <input aria-label="Roster week end" type="date" value={dates[6]} readOnly tabIndex={-1} />
              </div>
            </div>
            {admin && (
              <button
                className="publish-button"
                disabled={saving}
                onClick={() => void change("publish", {})}
              >
                {status === "draft" ? "Publish roster" : "Republish roster"}
              </button>
            )}
          </div>
        </div>
        <div className="roster-info">
        <p className="roster-access">
          🔒{" "}
          {admin
            ? "Admin draft — edits are not visible to staff until published."
            : "View only — editing shifts is Admin only."}
        </p>
        <div className="selected-range"><b>Selected range:</b><span>{selectedWeekLabel}</span>{inherited && <small>Using the latest published roster until Admin changes this week.</small>}</div>
        </div>
        <div className="sales-table">
          <table className="weekly-table">
            <thead>
              <tr>
                <th>Staff</th>
                {dates.map((date) => (
                  <th key={date}>
                    {calendarDate(date).toLocaleDateString("en-AU", {
                      weekday: "short",
                    })}
                    <small>{date.slice(8)}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((person) => (
                <tr key={person.id}>
                  <td>
                    <b>{person.name}</b>
                  </td>
                  {dates.map((date) => (
                    <td key={date}>
                      {admin ? (
                        <select
                          value={shift(person.id, date)}
                          disabled={saving}
                          onChange={(e) =>
                            void change("save_shift", {
                              staffUserId: person.id,
                              shiftDate: date,
                              shiftLabel: e.target.value,
                            })
                          }
                        >
                          {labels.map((label) => (
                            <option key={label}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={
                            shift(person.id, date) === "Off"
                              ? "shift-off"
                              : "shift-on"
                          }
                        >
                          {shift(person.id, date)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
