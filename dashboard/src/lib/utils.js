export const PLAN_COLORS = {
  DAYS_30: '#06b6d4',
  DAYS_90: '#8b5cf6',
  DAYS_365: '#10b981',
  LIFETIME: '#f59e0b',
};

export const PLAN_ICON_MAP = {
  DAYS_1:   { emoji: '⚡', label: '1 jour' },
  DAYS_7:   { emoji: '📅', label: '7 jours' },
  DAYS_14:  { emoji: '📅', label: '14 jours' },
  DAYS_30:  { emoji: '🗓️', label: '30 jours' },
  DAYS_90:  { emoji: '🗓️', label: '90 jours' },
  DAYS_365: { emoji: '⭐', label: '1 an' },
  LIFETIME: { emoji: '♾️', label: 'Illimité' },
};

export function formatPlan(plan) {
  const map = {
    DAYS_30: '30 jours', DAYS_90: '90 jours', DAYS_365: '1 an', LIFETIME: 'Lifetime',
    DAYS_1: '1 jour', DAYS_7: '7 jours', DAYS_14: '14 jours',
  };
  return map[plan] || plan;
}

export function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
