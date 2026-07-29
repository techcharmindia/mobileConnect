"use client";
import { useEffect, useState } from "react";
type Shift = {
  id: number;
  shift_date: string;
  shift_label: string;
  name: string;
  store: string;
};
export default function RosterPanel() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/telstra/roster")
      .then((r) => (r.ok ? r.json() : { shifts: [] }))
      .then((data) => setShifts(data.shifts || []))
      .finally(() => setLoading(false));
  }, []);
  return (
    <section className="data-panel">
      <h1>Roster</h1>
      <p>Live shift roster from the database.</p>
      {loading ? (
        <p className="today-empty">Loading roster…</p>
      ) : shifts.length ? (
        <div className="sales-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Team member</th>
                <th>Store</th>
                <th>Shift</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr key={shift.id}>
                  <td>{shift.shift_date}</td>
                  <td>{shift.name}</td>
                  <td>{shift.store}</td>
                  <td>{shift.shift_label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="today-empty">No roster shifts saved yet.</p>
      )}
    </section>
  );
}
