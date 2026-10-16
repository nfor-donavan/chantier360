import React from 'react';

// The Nexus "N" mark as a vector, so it stays sharp at any size and follows light and dark mode.
export default function NexusMark({ size = 72, className = '' }) {
  return (
    <svg className={className} width={size} height={size * 1.22} viewBox="0 0 495 605" role="img" aria-label="Nexus" focusable="false">
      <polygon points="0,180 135,290 135,485 0,565" fill="var(--nx-dark,#3A4150)" />
      <polygon points="360,97 495,10 495,345 360,245" fill="var(--nx-dark,#3A4150)" />
      <path d="M0 0 L495 372 L495 605 L360 515 L360 470 L102 262 L0 190 Z" fill="var(--nx-blue,#0040C8)" />
      <circle cx="75" cy="170" r="62" fill="var(--nx-bg,#FFFFFF)" /><circle cx="75" cy="170" r="40" fill="var(--nx-blue,#0040C8)" />
      <circle cx="438" cy="440" r="62" fill="var(--nx-bg,#FFFFFF)" /><circle cx="438" cy="440" r="40" fill="var(--nx-blue,#0040C8)" />
    </svg>
  );
}
