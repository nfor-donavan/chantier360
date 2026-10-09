import React, { useEffect, useState } from 'react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { roleName } from '../utils.js';

export default function Access() {
  const roles = useApi(api.roles), users = useApi(api.users), projects = useApi(api.projects), clients = useApi(api.clients);
  return <Gate states={[roles, users, projects, clients]}>{() => <><Matrix roles={roles} /><Users users={users} roles={roles.data.roles} projects={projects.data} clients={clients.data} /></>}</Gate>;
}

// The access matrix: tick what each role may do. The server re-reads this on every request, so it is enforced, not just displayed.
function Matrix({ roles }) {
  const { t, notify, user, refresh } = useStore();
  const { permissions, roles: list } = roles.data;
  const [state, setState] = useState({});
  useEffect(() => setState(Object.fromEntries(list.map((r) => [r.key, new Set(r.permissions)]))), [roles.data]); // eslint-disable-line
  const LOCK = { director: ['MANAGE_USERS', 'VIEW_ALL_PROJECTS'] };
  const toggle = (role, p) => setState((s) => { const n = new Set(s[role]); n.has(p) ? n.delete(p) : n.add(p); return { ...s, [role]: n }; });
  const save = async () => {
    try {
      for (const r of list) { const next = [...(state[r.key] || [])]; if (next.length !== r.permissions.length || next.some((p) => !r.permissions.includes(p))) await api.saveRole(r.key, next); }
      notify(t('toast.saved')); roles.reload();
    } catch (e) { notify(e.message); }
  };
  return (
    <section className="panel">
      <h3>{t('ac.roles')} <small>{t('ac.rolesSub')}</small></h3>
      <table className="matrix">
        <thead><tr><th>{t('ac.perm')}</th>{list.map((r) => <th key={r.key} className="c">{roleName(t, r.key, r.label)}</th>)}</tr></thead>
        <tbody>
          {permissions.map((p) => (
            <tr key={p}><td>{t('perm.' + p)}</td>
              {list.map((r) => { const locked = (LOCK[r.key] || []).includes(p); return <td key={r.key} className="c"><input type="checkbox" aria-label={`${roleName(t, r.key, r.label)}: ${t('perm.' + p)}`} checked={!!state[r.key]?.has(p)} disabled={locked} title={locked ? t('ac.locked') : ''} onChange={() => toggle(r.key, p)} /></td>; })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="toolbar"><button className="btn ok" onClick={save}>{t('ac.saveRoles')}</button></div>
    </section>
  );
}

function Users({ users, roles, projects, clients }) {
  const { t, notify, user: me } = useStore();
  const empty = { name: '', email: '', password: '', role: 'engineer', projectIds: [], client: '' };
  const [f, setF] = useState(empty);
  const toggleProject = (id) => setF({ ...f, projectIds: f.projectIds.includes(id) ? f.projectIds.filter((x) => x !== id) : [...f.projectIds, id] });
  const create = async (e) => { e.preventDefault(); try { await api.createUser({ ...f, client: f.role === 'client' ? f.client : undefined }); setF(empty); notify(t('toast.saved')); users.reload(); } catch (err) { notify(err.message); } };
  const flip = async (u) => { try { await api.updateUser(u._id, { isActive: !u.isActive }); users.reload(); } catch (err) { notify(err.message); } };
  const projName = (id) => projects.find((p) => p._id === id)?.siteName;
  return (
    <div className="grid2 wide-left">
      <section className="panel">
        <h3>{t('ac.users')}</h3>
        <table>
          <thead><tr><th>{t('ac.name')}</th><th>{t('email')}</th><th>{t('ac.role')}</th><th>{t('ac.projects')}</th><th /></tr></thead>
          <tbody>{users.data.map((u) => (
            <tr key={u._id} className={u.isActive ? '' : 'flag'}>
              <td><b>{u.name}</b></td><td>{u.email}</td><td>{roleName(t, u.role)}</td>
              <td>{u.role === 'director' ? t('ac.all') : (u.projectIds || []).map(projName).filter(Boolean).join(', ') || '-'}</td>
              <td>{u._id !== me.id && <button className="btn no" onClick={() => flip(u)}>{u.isActive ? t('ac.disable') : t('ac.enable')}</button>}</td>
            </tr>))}
          </tbody>
        </table>
      </section>
      <form className="panel stack" onSubmit={create}>
        <h3>{t('ac.addUser')}</h3>
        <input required placeholder={t('ac.name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input required type="email" placeholder={t('email')} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input required type="password" minLength={6} placeholder={t('password')} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} aria-label={t('ac.role')}>{roles.map((r) => <option key={r.key} value={r.key}>{roleName(t, r.key, r.label)}</option>)}</select>
        {f.role === 'client' && <select value={f.client} onChange={(e) => setF({ ...f, client: e.target.value })} aria-label={t('ac.client')}><option value="">{t('ac.client')}</option>{clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>}
        <fieldset><legend>{t('ac.projects')}</legend>{projects.map((p) => <label key={p._id} className="check left"><input type="checkbox" checked={f.projectIds.includes(p._id)} onChange={() => toggleProject(p._id)} /> {p.siteName}</label>)}</fieldset>
        <button className="btn ok" type="submit">{t('ac.create')}</button>
      </form>
    </div>
  );
}
