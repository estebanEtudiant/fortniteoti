// Ã¢â€â‚¬Ã¢â€â‚¬ API Client for Dashboard Ã¢â€â‚¬Ã¢â€â‚¬
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  constructor() {
    this.baseUrl = `${API_URL}/api/v1`;
    this.token = localStorage.getItem('admin_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('admin_token');
  }

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${this.baseUrl}${path}`, opts);

    if (res.status === 401 && this.token) {
      this.clearToken();
      window.location.hash = '/';
      throw new Error('Session expirÃƒÂ©e, veuillez vous reconnecter');
    }

    const data = res.status === 204 ? null : await res.json();
    if (!res.ok) {
      const message = data?.message;
      throw new Error(Array.isArray(message) ? message[0] : (message || `Erreur ${res.status}`));
    }
    return data;
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  del(path) { return this.request('DELETE', path); }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Auth Ã¢â€â‚¬Ã¢â€â‚¬
  login(username, password) { return this.post('/admin/login', { username, password }); }
  changeAdminPassword(currentPassword, newPassword) {
    return this.put('/admin/password', { currentPassword, newPassword });
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Stats & Analytics Ã¢â€â‚¬Ã¢â€â‚¬
  getStats() { return this.get('/admin/stats'); }
  getAnalytics() { return this.get('/admin/analytics'); }
  getActivity() { return this.get('/admin/activity'); }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Licenses Ã¢â€â‚¬Ã¢â€â‚¬
  getLicenses(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/admin/licenses${qs ? '?' + qs : ''}`);
  }
  getLicense(id) { return this.get(`/admin/licenses/${id}`); }
  createLicense(data) { return this.post('/admin/licenses', data); }
  generateBatch(data) { return this.post('/admin/licenses/batch', data); }
  banLicense(id, reason) { return this.put(`/admin/licenses/${id}/ban`, { reason }); }
  unbanLicense(id) { return this.put(`/admin/licenses/${id}/unban`); }
  resetHwid(id) { return this.put(`/admin/licenses/${id}/reset-hwid`); }
  extendLicense(id, days) { return this.put(`/admin/licenses/${id}/extend`, { days }); }
  deleteLicense(id) { return this.del(`/admin/licenses/${id}`); }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Customers Ã¢â€â‚¬Ã¢â€â‚¬
  getCustomers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/admin/customers${qs ? '?' + qs : ''}`);
  }
  getCustomer(id) { return this.get(`/admin/customers/${id}`); }
  banCustomer(id) { return this.put(`/admin/customers/${id}/ban`); }
  unbanCustomer(id) { return this.put(`/admin/customers/${id}/unban`); }
  deleteCustomer(id) { return this.del(`/admin/customers/${id}`); }
  sendPasswordReset(id) { return this.post(`/admin/customers/${id}/send-reset`); }
  revokeCustomerLicenses(id) { return this.post(`/admin/customers/${id}/revoke-licenses`); }
  addCustomerLicense(id, data) { return this.post(`/admin/customers/${id}/licenses`, data); }
  // Ã¢â€â‚¬Ã¢â€â‚¬ Orders Ã¢â€â‚¬Ã¢â€â‚¬
  getOrders(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/admin/orders${qs ? '?' + qs : ''}`);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Plans Ã¢â€â‚¬Ã¢â€â‚¬
  getPlans() { return this.get('/admin/plans'); }
  createPlan(data) { return this.post('/admin/plans', data); }
  updatePlan(plan, data) { return this.put(`/admin/plans/${plan}`, data); }
  deletePlan(plan) { return this.del(`/admin/plans/${plan}`); }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Settings Ã¢â€â‚¬Ã¢â€â‚¬
  getSettings() { return this.get('/admin/settings'); }
  updateSettings(data) { return this.put('/admin/settings', data); }
  uploadImage(file) {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${this.baseUrl}/admin/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
      body: form,
    }).then(async r => {
      if (!r.ok) throw new Error((await r.json()).message || 'Upload ÃƒÂ©chouÃƒÂ©');
      return r.json();
    });
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Blocked IPs Ã¢â€â‚¬Ã¢â€â‚¬
  getBlockedIps(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/admin/blocked-ips${qs ? '?' + qs : ''}`);
  }
  unblockIp(id) { return this.del(`/admin/blocked-ips/${id}`); }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Logs Ã¢â€â‚¬Ã¢â€â‚¬
  getLogs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/admin/logs${qs ? '?' + qs : ''}`);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Software Ã¢â€â‚¬Ã¢â€â‚¬
  getSoftwareStats() { return this.get('/software/stats'); }
  getSoftwareVersions() { return this.get('/software/versions'); }
  deleteSoftwareVersion(version) { return this.del(`/software/${encodeURIComponent(version)}`); }
  async uploadSoftware(formData) {
    const res = await fetch(`${this.baseUrl}/software/upload`, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: formData,
    });
    if (res.status === 401 && this.token) {
      this.clearToken();
      window.location.hash = '/';
      throw new Error('Session expirÃƒÂ©e, veuillez vous reconnecter');
    }
    const data = res.status === 204 ? null : await res.json();
    if (!res.ok) {
      const m = data?.message;
      throw new Error(Array.isArray(m) ? m[0] : (m || `Erreur ${res.status}`));
    }
    return data;
  }

  // Reviews (admin)
  getAdminReviews()       { return this.get('/admin/reviews'); }
  deleteReview(discordId) { return this.del(`/admin/reviews/${encodeURIComponent(discordId)}`); }

  // Bot config
  getBotConfig()          { return this.get('/admin/bot-config'); }
  updateBotConfig(data)   { return this.put('/admin/bot-config', data); }

  // Promo codes
  getPromoCodes()         { return this.get('/admin/promo-codes'); }
  createPromoCode(data)   { return this.post('/admin/promo-codes', data); }
  deletePromoCode(code)   { return this.del(`/admin/promo-codes/${encodeURIComponent(code)}`); }
  togglePromoCode(code, active) { return this.put(`/admin/promo-codes/${encodeURIComponent(code)}/toggle`, { active }); }

  // Activity
  getActivity() { return this.get('/admin/activity'); }
}

export const api = new ApiClient();
export default api;