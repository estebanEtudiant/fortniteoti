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

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const message = data?.message;
      throw new Error(Array.isArray(message) ? message[0] : (message || `Erreur ${res.status}`));
    }
    return data;
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  patch(path, body) { return this.request('PATCH', path, body); }
  del(path) { return this.request('DELETE', path); }

  uploadWithProgress(formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/software/upload`);
      if (this.token) xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener('load', () => {
        if (xhr.status === 401 && this.token) {
          this.clearToken();
          window.location.hash = '/';
          reject(new Error('Session expirée, veuillez vous reconnecter'));
          return;
        }
        let data = null;
        try { data = xhr.status !== 204 ? JSON.parse(xhr.responseText) : null; } catch {}
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          const m = data?.message;
          reject(new Error(Array.isArray(m) ? m[0] : (m || `Erreur ${xhr.status}`)));
        }
      });
      xhr.addEventListener('error', () => reject(new Error('Erreur réseau')));
      xhr.send(formData);
    });
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Auth Ã¢â€â‚¬Ã¢â€â‚¬
  login(username, password, totp) { return this.post('/admin/login', { username, password, ...(totp ? { totp } : {}) }); }
  changeAdminPassword(currentPassword, newPassword) {
    return this.put('/admin/password', { currentPassword, newPassword });
  }

  // ── 2FA (TOTP) ──
  get2faStatus()        { return this.get('/admin/2fa/status'); }
  setup2fa()            { return this.post('/admin/2fa/setup'); }
  enable2fa(code)       { return this.post('/admin/2fa/enable', { code }); }
  disable2fa(password, code) { return this.post('/admin/2fa/disable', { password, code }); }

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
  bulkExtendLicenses(data) { return this.post('/admin/licenses/bulk-extend', data); }
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
  attachExistingCustomerLicense(id, data) { return this.post(`/admin/customers/${id}/licenses/attach`, data); }
  // Ã¢â€â‚¬Ã¢â€â‚¬ Orders Ã¢â€â‚¬Ã¢â€â‚¬
  getOrders(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/admin/orders${qs ? '?' + qs : ''}`);
  }
  cancelSpooferOrder(id) { return this.del(`/payment/admin/shop-orders/${id}`); }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Plans Ã¢â€â‚¬Ã¢â€â‚¬
  getPlans() { return this.get('/admin/plans'); }
  createPlan(data) { return this.post('/admin/plans', data); }
  updatePlan(plan, data) { return this.put(`/admin/plans/${plan}`, data); }
  deletePlan(plan) { return this.del(`/admin/plans/${plan}`); }

  getNgPlans() { return this.get('/admin/ng-plans'); }
  createNgPlan(data) { return this.post('/admin/ng-plans', data); }
  updateNgPlan(plan, data) { return this.put(`/admin/ng-plans/${plan}`, data); }
  deleteNgPlan(plan) { return this.del(`/admin/ng-plans/${plan}`); }

  getMenoriaPlans() { return this.get('/admin/menoria-plans'); }
  createMenoriaPlan(data) { return this.post('/admin/menoria-plans', data); }
  updateMenoriaPlan(plan, data) { return this.put(`/admin/menoria-plans/${plan}`, data); }
  deleteMenoriaPlan(plan) { return this.del(`/admin/menoria-plans/${plan}`); }

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
  async getSoftwareStats() { const r = await this.get('/software/stats'); return r.FTN_OPTIMIZER; }
  async getSoftwareVersions() { const r = await this.get('/software/versions'); return r.FTN_OPTIMIZER; }
  deleteSoftwareVersion(version) { return this.del(`/software/ftnoptimizer/${encodeURIComponent(version)}`); }
  uploadSoftware(formData, onProgress) { return this.uploadWithProgress(formData, onProgress); }

  // ── Software (NG Loader) ──
  async getNgStats() { const r = await this.get('/software/stats'); return r.NG_LOADER; }
  async getNgVersions() { const r = await this.get('/software/versions'); return r.NG_LOADER; }
  deleteNgVersion(version) { return this.del(`/software/ngloader/${encodeURIComponent(version)}`); }
  uploadNgSoftware(formData, onProgress) { return this.uploadWithProgress(formData, onProgress); }

  // ── Software (NG Launcher .exe) ──
  async getNgLauncherStats() { const r = await this.get('/software/stats'); return r.NG_LAUNCHER; }
  async getNgLauncherVersions() { const r = await this.get('/software/versions'); return r.NG_LAUNCHER; }
  deleteNgLauncherVersion(version) { return this.del(`/software/nglauncher/${encodeURIComponent(version)}`); }
  uploadNgLauncherSoftware(formData, onProgress) { return this.uploadWithProgress(formData, onProgress); }

  // ── Software (Menoria .jar) ──
  async getMenoriaStats() { const r = await this.get('/software/stats'); return r.MENORIA; }
  async getMenoriaVersions() { const r = await this.get('/software/versions'); return r.MENORIA; }
  deleteMenoriaVersion(version) { return this.del(`/software/menoria/${encodeURIComponent(version)}`); }
  uploadMenoriaSoftware(formData, onProgress) { return this.uploadWithProgress(formData, onProgress); }

  // ── Software (JRE .zip) ──
  async getJreStats() { const r = await this.get('/software/stats'); return r.JRE; }
  async getJreVersions() { const r = await this.get('/software/versions'); return r.JRE; }
  deleteJreVersion(version) { return this.del(`/software/jre/${encodeURIComponent(version)}`); }
  uploadJreSoftware(formData, onProgress) { return this.uploadWithProgress(formData, onProgress); }

  // ── Software (Loader .jar) ──
  async getLoaderStats() { const r = await this.get('/software/stats'); return r.LOADER; }
  async getLoaderVersions() { const r = await this.get('/software/versions'); return r.LOADER; }
  deleteLoaderVersion(version) { return this.del(`/software/loader/${encodeURIComponent(version)}`); }
  uploadLoaderSoftware(formData, onProgress) { return this.uploadWithProgress(formData, onProgress); }

  // ── Software (Velthar .jar) ──
  async getVeltharStats() { const r = await this.get('/software/stats'); return r.VELTHAR_LOADER; }
  async getVeltharVersions() { const r = await this.get('/software/versions'); return r.VELTHAR_LOADER; }
  deleteVeltharVersion(version) { return this.del(`/software/veltharloader/${encodeURIComponent(version)}`); }
  uploadVeltharSoftware(formData, onProgress) { return this.uploadWithProgress(formData, onProgress); }

  // ── Software (Velthar Launcher .exe) ──
  async getVeltharLauncherStats() { const r = await this.get('/software/stats'); return r.VELTHAR_LAUNCHER; }
  async getVeltharLauncherVersions() { const r = await this.get('/software/versions'); return r.VELTHAR_LAUNCHER; }
  deleteVeltharLauncherVersion(version) { return this.del(`/software/veltharlauncher/${encodeURIComponent(version)}`); }
  uploadVeltharLauncherSoftware(formData, onProgress) { return this.uploadWithProgress(formData, onProgress); }

  // Gallery
  getGallery(type) { return this.get(`/admin/gallery?type=${type}`); }
  async uploadGallery(type, formData) {
    const res = await fetch(`${this.baseUrl}/admin/gallery/upload?type=${type}`, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: formData,
    });
    if (res.status === 401 && this.token) {
      this.clearToken();
      window.location.hash = '/';
      throw new Error('Session expirée, veuillez vous reconnecter');
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const m = data?.message;
      throw new Error(Array.isArray(m) ? m[0] : (m || `Erreur ${res.status}`));
    }
    return data;
  }
  deleteGallery(type, filename) {
    return this.del(`/admin/gallery/${encodeURIComponent(filename)}?type=${type}`);
  }

  // Reviews (admin)
  getAdminReviews()       { return this.get('/admin/reviews'); }
  deleteReview(discordId) { return this.del(`/admin/reviews/${encodeURIComponent(discordId)}`); }

  // Bot config
  getBotConfig()          { return this.get('/admin/bot-config'); }
  updateBotConfig(data)   { return this.put('/admin/bot-config', data); }
  announceUpdate(data)    { return this.post('/admin/bot-config/announce-update', data); }

  // Modèles d'annonces de mise à jour
  getUpdateTemplates()          { return this.get('/admin/update-templates'); }
  createUpdateTemplate(data)    { return this.post('/admin/update-templates', data); }
  updateUpdateTemplate(id, data){ return this.put(`/admin/update-templates/${encodeURIComponent(id)}`, data); }
  deleteUpdateTemplate(id)      { return this.del(`/admin/update-templates/${encodeURIComponent(id)}`); }

  // Promo codes
  getPromoCodes()         { return this.get('/admin/promo-codes'); }
  createPromoCode(data)   { return this.post('/admin/promo-codes', data); }
  deletePromoCode(code)   { return this.del(`/admin/promo-codes/${encodeURIComponent(code)}`); }
  togglePromoCode(code, active) { return this.put(`/admin/promo-codes/${encodeURIComponent(code)}/toggle`, { active }); }

  // Activity
  getActivity() { return this.get('/admin/activity'); }
  getMinecraftActivity() { return this.get('/admin/activity/minecraft'); }

  // Velthar plans
  getVeltharPlans() { return this.get('/admin/velthar-plans'); }
  createVeltharPlan(data) { return this.post('/admin/velthar-plans', data); }
  updateVeltharPlan(plan, data) { return this.put(`/admin/velthar-plans/${plan}`, data); }
  deleteVeltharPlan(plan) { return this.del(`/admin/velthar-plans/${plan}`); }

  // Servers
  getServers()                  { return this.get('/admin/servers'); }
  createServer(data)            { return this.post('/admin/servers', data); }
  updateServer(id, data)        { return this.put(`/admin/servers/${id}`, data); }
  deleteServer(id)              { return this.del(`/admin/servers/${id}`); }

  // Shop — Games
  getShopGames()                { return this.get('/shop/admin/games'); }
  createShopGame(data)          { return this.post('/shop/admin/games', data); }
  updateShopGame(id, data)      { return this.patch(`/shop/admin/games/${id}`, data); }
  deleteShopGame(id)            { return this.del(`/shop/admin/games/${id}`); }

  // Shop — Plans
  getShopPlans()                { return this.get('/shop/admin/plans'); }
  createShopPlan(data)          { return this.post('/shop/admin/plans', data); }
  updateShopPlan(id, data)      { return this.patch(`/shop/admin/plans/${id}`, data); }
  deleteShopPlan(id)            { return this.del(`/shop/admin/plans/${id}`); }

  // Shop — Settings (hero, etc.)
  getShopSettings()             { return this.get('/shop/admin/settings'); }
  updateShopSettings(data)      { return this.patch('/shop/admin/settings', data); }
  getShopReviews()              { return this.get('/shop/admin/reviews'); }
  moderateShopReview(id, approved) { return this.patch(`/shop/admin/reviews/${id}`, { approved }); }
  deleteShopReview(id)          { return this.del(`/shop/admin/reviews/${id}`); }

  // Pokemon — Produits (kits de rénovation)
  getPokemonProducts()          { return this.get('/pokemon/admin/products'); }
  createPokemonProduct(data)    { return this.post('/pokemon/admin/products', data); }
  updatePokemonProduct(id, data) { return this.patch(`/pokemon/admin/products/${id}`, data); }
  deletePokemonProduct(id)      { return this.del(`/pokemon/admin/products/${id}`); }

  // Pokemon — Réglages (livraison, hero)
  getPokemonSettings()          { return this.get('/pokemon/admin/settings'); }
  updatePokemonSettings(data)   { return this.patch('/pokemon/admin/settings', data); }

  // Pokemon — Commandes (préparation / expédition)
  getPokemonOrders(status)      { return this.get(`/pokemon/admin/orders${status ? `?status=${status}` : ''}`); }
  updatePokemonOrder(id, data)  { return this.patch(`/pokemon/admin/orders/${id}`, data); }

  // Kill Switch
  killSwitchActivate(productId, { scope, target, reason, ttl_hours, totp }) {
    return this.post(`/admin/software/${productId}/kill`, { scope, target, reason, ttl_hours, totp });
  }
  killSwitchRevoke(productId, killId, { reason, totp }) {
    return this.post(`/admin/software/${productId}/kill/${killId}/revoke`, { reason, totp });
  }
  killSwitchList(productId, { active } = {}) {
    const qs = active !== undefined ? `?active=${active}` : '';
    return this.get(`/admin/software/${productId}/kills${qs}`);
  }

  // Metrics
  metricsOverview() { return this.get('/admin/metrics/overview'); }
  metricsMrr(days = 30) { return this.get(`/admin/metrics/mrr?days=${days}`); }
  metricsDau(days = 30, productId) {
    let qs = `?days=${days}`;
    if (productId) qs += `&productId=${productId}`;
    return this.get(`/admin/metrics/dau${qs}`);
  }
  metricsErrors(hours = 24) { return this.get(`/admin/metrics/errors?hours=${hours}`); }
  metricsTopUsers(days = 7, limit = 20) { return this.get(`/admin/metrics/top-users?days=${days}&limit=${limit}`); }
  metricsSignupsCancels(days = 14) { return this.get(`/admin/metrics/signups-cancels?days=${days}`); }
  metricsRevenueByProduct() { return this.get('/admin/metrics/revenue-by-product'); }

  // Affiliates (admin)
  affiliateList(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this.get(`/admin/affiliate/list${qs ? '?' + qs : ''}`);
  }
  affiliateSuspend(id, reason) { return this.post(`/admin/affiliate/${id}/suspend`, { reason }); }
  affiliateUnsuspend(id) { return this.post(`/admin/affiliate/${id}/unsuspend`); }
  affiliateSetTier(id, tier, commissionRate) { return this.post(`/admin/affiliate/${id}/set-tier`, { tier, commissionRate }); }
  affiliateConversions(status) {
    const qs = status ? `?status=${status}` : '';
    return this.get(`/admin/affiliate/conversions${qs}`);
  }
  affiliateApproveConversion(id) { return this.post(`/admin/affiliate/conversions/${id}/approve`); }
  affiliateRejectConversion(id, reason) { return this.post(`/admin/affiliate/conversions/${id}/reject`, { reason }); }
  affiliatePayouts(status) {
    const qs = status ? `?status=${status}` : '';
    return this.get(`/admin/affiliate/payouts${qs}`);
  }
  affiliateApprovePayout(id) { return this.post(`/admin/affiliate/payouts/${id}/approve`); }
  affiliateMarkPaid(id, txHash) { return this.post(`/admin/affiliate/payouts/${id}/mark-paid`, { txHash }); }
  affiliateRejectPayout(id, reason) { return this.post(`/admin/affiliate/payouts/${id}/reject`, { reason }); }
  affiliateGetTierConfig() { return this.get('/admin/affiliate/tier-config'); }
  affiliateUpdateTierConfig(tiers, minPayout) { return this.put('/admin/affiliate/tier-config', { tiers, minPayout }); }
  affiliateDelete(id) { return this.del(`/admin/affiliate/${id}`); }
  affiliateDeleteConversion(id) { return this.del(`/admin/affiliate/conversions/${id}`); }
  affiliateDeletePayout(id) { return this.del(`/admin/affiliate/payouts/${id}`); }

  // Resellers (admin)
  resellerList(filters) {
    const qs = new URLSearchParams();
    if (filters?.status) qs.set('status', filters.status);
    if (filters?.tier) qs.set('tier', filters.tier);
    const q = qs.toString();
    return this.get(`/admin/resellers${q ? '?' + q : ''}`);
  }
  resellerApprove(id) { return this.post(`/admin/resellers/${id}/approve`); }
  resellerSuspend(id, reason) { return this.post(`/admin/resellers/${id}/suspend`, { reason }); }
  resellerSetTier(id, tier, discount) { return this.post(`/admin/resellers/${id}/set-tier`, { tier, discount }); }
  resellerCredit(id, amountCents, reason) { return this.post(`/admin/resellers/${id}/credit`, { amountCents, reason }); }
  resellerBatches(id) { return this.get(`/admin/resellers/${id}/batches`); }
  resellerRevokeBatch(id, reason) { return this.post(`/admin/resellers/batches/${id}/revoke`, { reason }); }

  // Cheat Files (fortniteclient binaries + bundles)
  cheatUploadBinary(productId, kind, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/admin/software/${productId}/binary/${kind}`);
      if (this.token) xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener('load', () => {
        if (xhr.status === 401 && this.token) {
          this.clearToken(); window.location.hash = '/';
          reject(new Error('Session expirée')); return;
        }
        let data = null;
        try { data = JSON.parse(xhr.responseText); } catch {}
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else {
          const m = data?.message;
          reject(new Error(Array.isArray(m) ? m[0] : (m || `Erreur ${xhr.status}`)));
        }
      });
      xhr.addEventListener('error', () => reject(new Error('Erreur réseau')));
      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    });
  }
  // ── Kernel Symbols ──
  symbolsOverview()                   { return this.get('/admin/symbols/overview'); }
  symbolsCache(params)                { const q = new URLSearchParams(params).toString(); return this.get(`/admin/symbols/cache?${q}`); }
  symbolsPending()                    { return this.get('/admin/symbols/pending'); }
  symbolsInvalidate(id)               { return this.post(`/admin/symbols/cache/${id}/invalidate`); }
  symbolsTimeline(days = 30)          { return this.get(`/admin/symbols/timeline?days=${days}`); }
  symbolsDeleteExtraction(id)         { return this.del(`/admin/symbols/extraction/${id}`); }
  symbolsDeleteCache(id)              { return this.del(`/admin/symbols/cache/${id}`); }
  symbolsPurgeFailedExtractions(mins) { return this.post(`/admin/symbols/extractions/purge-failed?olderThanMinutes=${mins || 60}`); }
  symbolsValidate(id, validatedBy, notes) { return this.post(`/admin/symbols/cache/${id}/validate`, { validatedBy, notes }); }
  symbolsUnvalidate(id, reason, wasBsod) { return this.post(`/admin/symbols/cache/${id}/unvalidate`, { reason, wasBsod }); }

  cheatPublish(productId, data)  { return this.post(`/admin/software/${productId}/publish`, data); }
  cheatVersions(productId)       { return this.get(`/admin/software/${productId}/versions`); }
  cheatVersion(productId, id)    { return this.get(`/admin/software/${productId}/versions/${id}`); }
  cheatRollback(productId, id)   { return this.post(`/admin/software/${productId}/versions/${id}/rollback`); }
  cheatStatus(productId)         { return this.get(`/admin/software/${productId}/status`); }
  cheatBinaries(productId, kind) { return this.get(`/admin/software/${productId}/binaries/${kind}`); }
  cheatDownloadBundle(productId, id) {
    const url = `${this.baseUrl}/admin/software/${productId}/versions/${id}/download`;
    return fetch(url, { headers: { Authorization: `Bearer ${this.token}` } })
      .then(r => { if (!r.ok) throw new Error(`Erreur ${r.status}`); return r.blob(); });
  }

  // ── Telemetry: crash dumps & loader logs ──
  getCrashDumps(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/admin/telemetry/crashdumps${qs ? '?' + qs : ''}`);
  }
  downloadCrashDump(id) {
    const url = `${this.baseUrl}/admin/telemetry/crashdumps/${id}/download`;
    return fetch(url, { headers: { Authorization: `Bearer ${this.token}` } })
      .then(r => { if (!r.ok) throw new Error(`Erreur ${r.status}`); return r.blob(); });
  }
  getTelemetryLogs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/admin/telemetry/logs${qs ? '?' + qs : ''}`);
  }
  downloadTelemetryLog(id) {
    const url = `${this.baseUrl}/admin/telemetry/logs/${id}/download`;
    return fetch(url, { headers: { Authorization: `Bearer ${this.token}` } })
      .then(r => { if (!r.ok) throw new Error(`Erreur ${r.status}`); return r.blob(); });
  }
  deleteCrashDump(id)   { return this.del(`/admin/telemetry/crashdumps/${id}`); }
  deleteTelemetryLog(id) { return this.del(`/admin/telemetry/logs/${id}`); }

  // ── Minecraft Server ──
  mcStatus()                { return this.get('/admin/minecraft/status'); }
  mcStart()                 { return this.post('/admin/minecraft/start'); }
  mcStop()                  { return this.post('/admin/minecraft/stop'); }
  mcRestart()                { return this.post('/admin/minecraft/restart'); }
  mcLogs()                  { return this.get('/admin/minecraft/logs'); }
  mcPlayers()                { return this.get('/admin/minecraft/players'); }
  mcKick(name, reason)      { return this.post('/admin/minecraft/players/kick', { name, reason }); }
  mcBroadcast(message)      { return this.post('/admin/minecraft/broadcast', { message }); }
  mcSave()                  { return this.post('/admin/minecraft/save'); }
  mcCommand(command)        { return this.post('/admin/minecraft/command', { command }); }
  mcGetWhitelist()          { return this.get('/admin/minecraft/whitelist'); }
  mcAddWhitelist(name)      { return this.post('/admin/minecraft/whitelist/add', { name }); }
  mcRemoveWhitelist(name)   { return this.post('/admin/minecraft/whitelist/remove', { name }); }
  mcToggleWhitelist(enabled) { return this.post('/admin/minecraft/whitelist/toggle', { enabled }); }
  mcGetOps()                { return this.get('/admin/minecraft/ops'); }
  mcAddOp(name)              { return this.post('/admin/minecraft/ops/add', { name }); }
  mcRemoveOp(name)           { return this.post('/admin/minecraft/ops/remove', { name }); }
  mcGetBanned()              { return this.get('/admin/minecraft/banned'); }
  mcBan(name, reason)        { return this.post('/admin/minecraft/ban', { name, reason }); }
  mcPardon(name)              { return this.post('/admin/minecraft/pardon', { name }); }
  mcGetProperties()          { return this.get('/admin/minecraft/properties'); }
  mcUpdateProperties(patch) { return this.patch('/admin/minecraft/properties', patch); }
}

export const api = new ApiClient();
export default api;
