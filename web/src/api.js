const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
let token = localStorage.getItem('c360_token') || '';

export class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const setToken = (t) => { token = t || ''; t ? localStorage.setItem('c360_token', t) : localStorage.removeItem('c360_token'); };

async function request(path, { method = 'GET', body, form } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method, body: form || (body ? JSON.stringify(body) : undefined),
      headers: { ...(!form && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
    });
  } catch { throw new ApiError(0, 'network'); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) { setToken(''); window.dispatchEvent(new Event('c360:logout')); }
  if (!res.ok) throw new ApiError(res.status, data.error || 'Request failed');
  return data;
}
const qs = (o = {}) => { const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')); const x = p.toString(); return x ? `?${x}` : ''; };
const post = (p, body) => request(p, { method: 'POST', body });
const patch = (p, body) => request(p, { method: 'PATCH', body });

export const api = {
  login: (email, password) => post('/auth/login', { email, password }),
  me: () => request('/auth/me'),
  company: () => request('/company'),
  updateCompany: (b) => patch('/company', b),
  dashboard: () => request('/dashboard'),
  projects: () => request('/projects'),
  project: (id) => request(`/projects/${id}`),
  createProject: (b) => post('/projects', b),
  updateProject: (id, b) => patch(`/projects/${id}`, b),
  addTask: (id, b) => post(`/projects/${id}/tasks`, b),
  updateTask: (id, tid, b) => patch(`/projects/${id}/tasks/${tid}`, b),
  addMilestone: (id, b) => post(`/projects/${id}/milestones`, b),
  updateMilestone: (id, mid, b) => patch(`/projects/${id}/milestones/${mid}`, b),
  photos: (id) => request(`/projects/${id}/photos`),
  addPhoto: (id, b) => post(`/projects/${id}/photos`, b),
  updatePhoto: (id, pid, b) => patch(`/projects/${id}/photos/${pid}`, b),
  addUpdate: (id, message) => post(`/projects/${id}/updates`, { message }),
  stock: (id) => request(`/projects/${id}/stock`),
  addStock: (id, b) => post(`/projects/${id}/stock`, b),
  logs: () => request('/materials/logs'),
  requests: () => request('/materials/requests'),
  decideRequest: (id, status) => patch(`/materials/requests/${id}`, { status }),
  attendance: () => request('/attendance'),
  decideAttendance: (id, status) => patch(`/attendance/${id}`, { status }),
  reports: (siteId) => request(`/reports${siteId ? `?siteId=${siteId}` : ''}`),
  alerts: (open) => request(`/alerts${open ? '?open=true' : ''}`),
  acknowledge: (id) => patch(`/alerts/${id}/acknowledge`),
  roles: () => request('/roles'),
  saveRole: (key, permissions) => request(`/roles/${key}`, { method: 'PUT', body: { permissions } }),
  users: () => request('/users'),
  createUser: (b) => post('/users', b),
  updateUser: (id, b) => patch(`/users/${id}`, b),
  clients: () => request('/clients'),
  portalProjects: () => request('/portal/projects'),
  portalProject: (id) => request(`/portal/projects/${id}`),
  dailyReports: (p) => request(`/reports/daily${qs(p)}`),
  dailyReport: (id) => request(`/reports/daily/${id}`),
  addReportMedia: (id, b) => post(`/reports/daily/${id}/media`, b),
  updateReportMedia: (id, mid, b) => patch(`/reports/daily/${id}/media/${mid}`, b),
  deleteReportMedia: (id, mid) => request(`/reports/daily/${id}/media/${mid}`, { method: 'DELETE' }),
  releaseDaily: (id, v) => patch(`/reports/daily/${id}`, { clientVisible: v }),
  weeklyReports: (p) => request(`/reports/weekly${qs(p)}`),
  weeklyReport: (id) => request(`/reports/weekly/${id}`),
  generateWeekly: (siteId, date) => post('/reports/weekly/generate', { siteId, date }),
  updateWeekly: (id, b) => patch(`/reports/weekly/${id}`, b),
  lockWeekly: (id) => post(`/reports/weekly/${id}/lock`, {}),
  unlockWeekly: (id) => post(`/reports/weekly/${id}/unlock`, {}),
  releaseWeekly: (id, v) => patch(`/reports/weekly/${id}/release`, { clientVisible: v }),
  workers: (p) => request(`/workers${qs(p)}`),
  expenses: (p) => request(`/expenses${qs(p)}`),
  addExpense: (b) => post('/expenses', b),
  updateExpense: (id, b) => patch(`/expenses/${id}`, b),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  bootstrap: () => request('/sync/bootstrap'),
  attendanceAction: (id, action, body) => post(`/attendance/${id}/${action}`, body),
  requestAction: (id, action, body) => post(`/materials/requests/${id}/${action}`, body),
  monthlyReport: (p) => request(`/reports/monthly${qs(p)}`),
  annualReport: (p) => request(`/reports/annual${qs(p)}`),
  stageDetail: (id, mid) => request(`/projects/${id}/milestones/${mid}/detail`),
  locations: () => request('/transfers/locations'),
  addLocation: (b) => post('/transfers/locations', b),
  balance: (ref) => request(`/transfers/balance?ref=${encodeURIComponent(ref)}`),
  transfers: (p) => request(`/transfers${qs(p)}`),
  createTransfer: (b) => post('/transfers', b),
  assets: (p) => request(`/assets${qs(p)}`),
  createAsset: (b) => post('/assets', b),
  updateAsset: (id, b) => patch(`/assets/${id}`, b),
  addMaintenance: (id, b) => post(`/assets/${id}/maintenance`, b),
  deleteAsset: (id) => request(`/assets/${id}`, { method: 'DELETE' }),
  categories: () => request('/workforce-categories'),
  addCategory: (name) => post('/workforce-categories', { name }),
  createWorker: (b) => post('/workers', b),
  removeWorker: (id) => request(`/workers/${id}`, { method: 'DELETE' }),
  submitAttendance: (b) => post('/attendance', b),
  createDelivery: (b) => post('/materials/logs', b),
  updateDelivery: (id, b) => patch(`/materials/logs/${id}`, b),
  deleteDelivery: (id) => request(`/materials/logs/${id}`, { method: 'DELETE' }),
  submitDaily: (b) => post('/reports/daily', b),
  weeklyCurrent: () => request('/reports/weekly/current'),
  submitWeekly: (id) => post(`/reports/weekly/${id}/submit`, {}),
  upload: (file) => { const f = new FormData(); f.append('photo', file); return request('/uploads', { method: 'POST', form: f }); },
};

// Uploads a photo or video with progress. Videos go to a separate endpoint with a larger size limit.
export function uploadMedia(file, onProgress) {
  const video = file.type.startsWith('video/');
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', `${BASE}/api/uploads${video ? '/video' : ''}`);
    if (token) x.setRequestHeader('Authorization', `Bearer ${token}`);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    x.onload = () => { let d = {}; try { d = JSON.parse(x.responseText); } catch {} x.status >= 200 && x.status < 300 ? resolve(d) : reject(new ApiError(x.status, d.error || 'Upload failed')); };
    x.onerror = () => reject(new ApiError(0, 'network'));
    const f = new FormData(); f.append(video ? 'video' : 'photo', file); x.send(f);
  });
}
