import React from 'react';
export const Bar = ({ value = 0, tone }) => (
  <div className="pbar" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><i className={tone || ''} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
);
export function Lightbox({ photo, onClose, label }) {
  if (!photo) return null;
  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={photo.url} alt={photo.caption || ''} />
        <figcaption>{photo.caption}</figcaption>
        <button className="btn ok" onClick={onClose}>{label}</button>
      </figure>
    </div>
  );
}
