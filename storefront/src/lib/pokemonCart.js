const KEY = 'pkm_cart';

export function loadCart() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCart(cart) {
  try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* stockage indisponible, panier en mémoire seulement */ }
}

export function cartCount(cart) {
  return Object.values(cart).reduce((s, qty) => s + (Number(qty) || 0), 0);
}
