const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
let token = localStorage.getItem('c360_token') || '';

export class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const setToken = (t) => { token = t || ''; t ? localStorage.setItem('c360_token', t) : localStorage.removeItem('c360_token'); };
export const hasToken = () => !!token;

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw new ApiError(0, 'network'); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) { setToken(''); window.dispatchEvent(new Event('c360:logout')); }
  if (!res.ok) throw new ApiError(res.status, data.error || 'Request failed');
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  sites: () => request('/sites'),
  dashboard: () => request('/dashboard'),
  logs: () => request('/materials/logs'),
  requests: () => request('/materials/requests'),
  decideRequest: (id, status) => request(`/materials/requests/${id}`, { method: 'PATCH', body: { status } }),
  attendance: () => request('/attendance'),
  decideAttendance: (id, status) => request(`/attendance/${id}`, { method: 'PATCH', body: { status } }),
  alerts: (open) => request(`/alerts${open ? '?open=true' : ''}`),
  acknowledge: (id) => request(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),
};
