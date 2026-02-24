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
    const data = await this.request('POST', '/customer/register', { email, username, password });
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

  async createCheckoutSession(plan) {
    return this.request('POST', '/payment/checkout', { plan });
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
}

export const api = new ApiClient();
export default api;
