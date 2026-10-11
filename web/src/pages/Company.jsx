import React, { useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';

// Shrinks the chosen image in the browser so the stored logo stays small, and keeps transparency.
function toLogo(file) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 256 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad')); };
    img.src = url;
  });
}

export default function Company() {
  const { t, user, setTenant, notify } = useStore();
  const [name, setName] = useState(user.tenant?.companyName || '');
  const [logo, setLogo] = useState(user.tenant?.logoUrl || null);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const choose = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return notify(t('co.bad'));
    try { setLogo(await toLogo(f)); } catch { notify(t('co.bad')); }
  };
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { const r = await api.updateCompany({ companyName: name, logoUrl: logo }); setTenant(r); notify(t('toast.saved')); } catch (err) { notify(err.message); }
    setBusy(false);
  };
  return (
    <form className="panel form-grid" onSubmit={save}>
      <h3 className="full">{t('nav.company')}</h3>
      <label className="full">{t('co.name')}<input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="full">
        <span className="lbl">{t('co.logo')}</span>
        <p className="muted small">{t('co.logoHelp')}</p>
        <div className="logo-edit">
          <div className="logo-box">{logo ? <img src={logo} alt="" /> : <span className="muted">—</span>}</div>
          <div className="actions">
            <button type="button" className="btn ok" onClick={() => input.current.click()}>{t('co.upload')}</button>
            {logo && <button type="button" className="btn no" onClick={() => setLogo(null)}>{t('co.remove')}</button>}
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={choose} />
          </div>
        </div>
      </div>
      <div className="full">
        <span className="lbl">{t('co.preview')}</span>
        <div className="tenant preview">{logo ? <img className="tenant-logo" src={logo} alt="" /> : <span className="dot" />}<b>{name}</b></div>
      </div>
      <div className="full"><button className="btn ok" type="submit" disabled={busy}>{busy ? t('saving') : t('save')}</button></div>
    </form>
  );
}
