import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useStore } from '../store.jsx';
import { fmtDate, fmtXAF, shortfallPct, siteName } from '../data.js';

export default function Materials() {
  const { deliveries, requests, decideRequest } = useStore();
  const [tab, setTab] = useState('deliveries');
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const rows = deliveries.filter((d) => !onlyFlagged || shortfallPct(d) > 0);
  return (
    <section className="panel">
      <div className="tabs">
        <button className={tab === 'deliveries' ? 'on' : ''} onClick={() => setTab('deliveries')}>Deliveries</button>
        <button className={tab === 'requests' ? 'on' : ''} onClick={() => setTab('requests')}>Material requests <em className="badge">{requests.filter((r) => r.status === 'Pending').length}</em></button>
        {tab === 'deliveries' && <label className="check"><input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} /> Show flagged only</label>}
      </div>
      {tab === 'deliveries' ? (
        <table>
          <thead><tr><th>Date</th><th>Material</th><th>Site</th><th>Supplier</th><th className="r">Ordered</th><th className="r">Received</th><th>Check</th><th>Logged by</th></tr></thead>
          <tbody>
            {rows.map((d) => { const p = shortfallPct(d); return (
              <tr key={d.id} className={p > 0 ? 'flag' : ''}>
                <td>{fmtDate(d.date)}</td><td>{d.material}</td><td>{siteName(d.siteId)}</td><td>{d.supplier}</td>
                <td className="r">{d.ordered}</td><td className="r">{d.received}</td>
                <td>{p > 0 ? <span className="tag bad">{d.ordered - d.received} short ({p.toFixed(1)}%)</span> : <span className="tag ok">Matches order</span>}</td>
                <td>{d.loggedBy}</td>
              </tr>); })}
          </tbody>
        </table>
      ) : (
        <table>
          <thead><tr><th>Requested</th><th>Material</th><th>Site</th><th className="r">Quantity</th><th className="r">Estimate</th><th>By</th><th>Decision</th></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.date)}</td><td>{r.material}</td><td>{siteName(r.siteId)}</td><td className="r">{r.quantity}</td><td className="r">{fmtXAF(r.estimate)}</td><td>{r.requestedBy}</td>
                <td>{r.status === 'Pending' ? (
                  <div className="actions"><button className="btn ok" onClick={() => decideRequest(r.id, 'Approved')}><Check size={15} /> Approve</button><button className="btn no" onClick={() => decideRequest(r.id, 'Rejected')}><X size={15} /> Reject</button></div>
                ) : <span className={'tag ' + (r.status === 'Approved' ? 'ok' : 'bad')}>{r.status}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
