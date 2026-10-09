export const fmtXAF = (n = 0) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)} Md FCFA` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} M FCFA` : `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
export const fmtDate = (s, lang = 'en') => (s ? new Date(s).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
export const pct = (o, r) => (o > 0 ? Math.max(0, ((o - r) / o) * 100) : 0);
export const num = (n) => (n == null ? '' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n));
export const roleName = (t, role, fallback) => { const k = 'role.' + role; const v = t(k); return v === k ? fallback || role : v; };
