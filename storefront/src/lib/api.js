const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  constructor() {
    this.baseUrl = `${API_URL}/api/v1`;
    this.token = localStorage.getItem('customer_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('customer_token', token);
    } else {
      localStorage.removeItem('customer_token');
    }
  }

  getToken() {
    return this.token;
  }

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${this.baseUrl}${path}`, options);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const message = data?.message || `Erreur ${res.status}`;
      throw new Error(Array.isArray(message) ? message[0] : message);
    }

    return data;
  }

  // Auth
  async register(email, username, password) {
    const refCode = document.cookie.split('; ').find(c => c.startsWith('ref='))?.split('=')[1];
    const data = await this.request('POST', '/customer/register', { email, username, password, ...(refCode && { refCode }) });
    this.setToken(data.token);
    return data;
  }

  async login(login, password) {
    const data = await this.request('POST', '/customer/login', { login, password });
    this.setToken(data.token);
    return data;
  }

  logout() {
    this.setToken(null);
  }

  // Profile
  async getProfile() {
    return this.request('GET', '/customer/profile');
  }

  async updateProfile(data) {
    return this.request('PUT', '/customer/profile', data);
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('PUT', '/customer/password', { currentPassword, newPassword });
  }

  // Payment
  async getPlans() {
    return this.request('GET', '/payment/plans');
  }

  async confirmPayment(sessionId) {
    return this.request('POST', '/payment/confirm', { sessionId });
  }

  // Password reset
  async forgotPassword(email) {
    return this.request('POST', '/customer/forgot-password', { email });
  }

  async resetPassword(token, newPassword) {
    return this.request('POST', '/customer/reset-password', { token, newPassword });
  }

  // Email verification
  async verifyEmail(token) {
    return this.request('GET', `/customer/verify-email?token=${encodeURIComponent(token)}`);
  }

  async resendVerification() {
    return this.request('POST', '/customer/resend-verification');
  }

  // Software
  async getLatestSoftware() {
    return this.request('GET', '/software/latest');
  }

  async downloadFtnSoftware() {
    const jwtToken = this.token;
    const res = await fetch(`${this.baseUrl}/software/customer/download-token?product=ftn`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    if (!res.ok) throw new Error('Téléchargement refusé');
    const { token } = await res.json();
    const a = document.createElement('a');
    a.href = `${this.baseUrl}/software/dl?token=${token}`;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Reviews
  async getReviews() {
    return this.request('GET', '/reviews');
  }

  // Public settings (screenshot URL, Discord invite, announcement)
  async getPublicSettings() {
    return this.request('GET', '/admin/public-settings');
  }

  // Public stats (active clients this month)
  async getPublicStats() {
    return this.request('GET', '/payment/stats');
  }

  // Promo code validation
  async validatePromo(code) {
    return this.request('GET', `/payment/validate-promo?code=${encodeURIComponent(code)}`);
  }

  // Checkout with optional promo code
  async createCheckoutSession(plan, promoCode) {
    const body = { plan };
    if (promoCode) body.promoCode = promoCode;
    return this.request('POST', '/payment/checkout', body);
  }

  // Menoria plans + checkout
  async getMenoriaPlans() {
    return this.request('GET', '/payment/plans?product=MENORIA');
  }

  async createMenoriaCheckoutSession(plan, promoCode) {
    const body = { plan, product: 'MENORIA' };
    if (promoCode) body.promoCode = promoCode;
    return this.request('POST', '/payment/checkout', body);
  }

  // Pokemon — kits de rénovation (produit physique)
  async getPokemonProducts() {
    return this.request('GET', '/pokemon/products');
  }

  async getPokemonSettings() {
    return this.request('GET', '/pokemon/settings');
  }

  async getPokemonOrders() {
    return this.request('GET', '/pokemon/orders');
  }

  async createPokemonCheckoutSession(payload) {
    return this.request('POST', '/payment/pokemon/checkout', payload);
  }

  // Admin: promo codes
  async getPromoCodes() {
    return this.request('GET', '/admin/promo-codes');
  }

  async createPromoCode(dto) {
    return this.request('POST', '/admin/promo-codes', dto);
  }

  async deletePromoCode(code) {
    return this.request('DELETE', `/admin/promo-codes/${encodeURIComponent(code)}`);
  }

  // Activity tracking (fire-and-forget, no auth required)
  trackPageview(path) {
    let sessionId = localStorage.getItem('ftn_sid');
    if (!sessionId) {
      sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('ftn_sid', sessionId);
    }
    // Fire and forget — ignore errors silently
    fetch(`${this.baseUrl}/admin/track/pageview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path,
        sessionId,
        userAgent: navigator.userAgent,
        referrer: document.referrer || '',
        language: navigator.language || '',
      }),
      keepalive: true,
    }).catch(() => {});
  }
}

export const api = new ApiClient();
export default api;
