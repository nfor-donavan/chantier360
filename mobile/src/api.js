export const BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://chantier360-api.onrender.com').replace(/\/$/, '');
let token = '';
export const setToken = (t) => { token = t || ''; };

async function call(path, { method = 'GET', body, form } = {}, timeoutMs = 70000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs); // free hosting can take about a minute to wake
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method, signal: ctrl.signal, body: form || (body ? JSON.stringify(body) : undefined),
      headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(!form && body && { 'Content-Type': 'application/json' }) },
    });
  } catch { throw Object.assign(new Error('network'), { network: true }); } finally { clearTimeout(timer); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data;
}

export const api = {
  login: (email, password) => call('/auth/login', { method: 'POST', body: { email, password } }),
  orders: () => call('/materials/orders'),
  sync: (payload) => call('/sync', { method: 'POST', body: payload }),
  upload: (uri) => { const form = new FormData(); form.append('photo', { uri, name: 'photo.jpg', type: 'image/jpeg' }); return call('/uploads', { method: 'POST', form }); },
};
