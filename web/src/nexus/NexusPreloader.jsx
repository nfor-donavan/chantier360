import React from 'react';
import NexusMark from './NexusMark.jsx';

// Loading screen shown while the app starts and while a page loads. fullscreen=false centres it inside the page area instead.
export default function NexusPreloader({ fullscreen = true, label = 'NEXUS' }) {
  return (
    <div className={'nx-pre' + (fullscreen ? ' full' : '')} role="status" aria-live="polite" aria-label="Loading">
      <div className="nx-orbit"><span className="nx-ring" aria-hidden="true" /><NexusMark size={64} className="nx-pulse" /></div>
      <p className="nx-word">{label}</p>
    </div>
  );
}
