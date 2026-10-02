import React from 'react';
import { Check, Camera } from 'lucide-react';
import { useStore } from '../store.jsx';
import { fmtDate, fmtXAF, siteName } from '../data.js';

export default function Attendance() {
  const { attendance, approveAttendance } = useStore();
  return (
    <section className="panel">
      <h3>Daily labour logs <small>approve payroll once the headcount matches the site photo</small></h3>
      <table>
        <thead><tr><th>Date</th><th>Site</th><th>Foreman</th><th className="r">Present</th><th className="r">Planned</th><th className="r">Day's wages</th><th>Photo</th><th>Status</th></tr></thead>
        <tbody>
          {attendance.map((a) => {
            const over = a.present > a.expected * 1.1;
            return (
              <tr key={a.id} className={over ? 'flag' : ''}>
                <td>{fmtDate(a.date)}</td><td>{siteName(a.siteId)}</td><td>{a.foreman}</td>
                <td className="r">{a.present} {over && <span className="tag bad">+{a.present - a.expected}</span>}</td>
                <td className="r">{a.expected}</td><td className="r">{fmtXAF(a.present * a.rate)}</td>
                <td><span className="photo"><Camera size={14} /> Group photo</span></td>
                <td>{a.status === 'Pending' ? <button className="btn ok" onClick={() => approveAttendance(a.id)}><Check size={15} /> Approve</button> : <span className="tag ok">Approved</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
