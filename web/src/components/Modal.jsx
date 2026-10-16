import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store.jsx';

// A dialog that fits small screens: it scrolls inside itself, closes with Escape, and keeps keyboard focus inside while open.
export function Modal({ title, onClose, children, wide = false, busy = false }) {
  const { t } = useStore();
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement; ref.current?.focus();
    const key = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', key); document.body.classList.add('modal-open');
    return () => { document.removeEventListener('keydown', key); document.body.classList.remove('modal-open'); prev?.focus?.(); };
  }, []); // eslint-disable-line
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} disabled={busy} aria-label={t('close')}><X size={18} /></button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// Asks before doing something that cannot be silently undone. Cancel changes nothing. A failed or stale request shows its message here.
export function ConfirmModal({ title, children, confirmLabel, tone = 'ok', reasonLabel, reasonRequired = false, onConfirm, onCancel }) {
  const { t } = useStore();
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const ready = !reasonLabel || !reasonRequired || reason.trim().length >= 3;
  const go = async () => { setBusy(true); setErr(''); try { await onConfirm(reason.trim()); } catch (e) { setErr(e.status === 0 ? t('err.network') : e.message); setBusy(false); } };
  return (
    <Modal title={title} onClose={onCancel} busy={busy}>
      <div className="confirm-body">{children}</div>
      {reasonLabel && <label className="reason">{reasonLabel}<textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label>}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="modal-actions">
        <button className="btn no" onClick={onCancel} disabled={busy}>{t('cancel')}</button>
        <button className={'btn ' + (tone === 'danger' ? 'danger' : 'ok')} onClick={go} disabled={!ready || busy}>{busy ? t('saving') : confirmLabel}</button>
      </div>
    </Modal>
  );
}
