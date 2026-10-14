import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Euro, ShoppingCart, Users } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../lib/api';

function DeltaBadge({ pct }) {
  if (!pct) return <span className="text-xs text-gray-500 flex items-center gap-1"><Minus className="w-3 h-3" /> stable</span>;
  const up = pct > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`text-xs flex items-center gap-1 ${up ? 'text-green-400' : 'text-red-400'}`}>
      <Icon className="w-3 h-3" /> {up ? '+' : ''}{pct}% vs 30j préc.
    </span>
  );
}

function Kpi({ label, value, icon: Icon, sub, color = 'text-white' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-400">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-gray-600" />}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  ProductAnalytics — revenue (+ optional DAU) for one
//  product key, dropped into that product's admin page.
//  productKey must match the `products[].key` returned by
//  GET /admin/metrics/revenue-by-product (License.product /
//  SHOP / POKEMON), e.g. 'FTN_OPTIMIZER', 'NG_LOADER'...
// ══════════════════════════════════════════════════════
export default function ProductAnalytics({ productKey, dauProductId, title = 'Revenus' }) {
  const [revenue, setRevenue] = useState(null);
  const [dau, setDau] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      api.metricsRevenueByProduct(),
      dauProductId ? api.metricsDau(30, dauProductId) : Promise.resolve(null),
    ]).then(([r, d]) => {
      if (cancelled) return;
      if (r.status === 'fulfilled') {
        setRevenue(r.value.products.find(p => p.key === productKey) || null);
      }
      if (d.status === 'fulfilled' && d.value) setDau(d.value.series || []);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productKey, dauProductId]);

  if (loading) {
    return <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 animate-pulse h-32" />;
  }

  const hasRevenue = revenue && (revenue.revenue30d > 0 || revenue.revenuePrev30d > 0);
  const hasDau = dau && dau.some(d => d.dau > 0);
  if (!hasRevenue && !hasDau) return null;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Euro className="w-5 h-5 text-cyan-400" /> {title}
      </h2>
      <div className={`grid gap-4 mb-4 ${dauProductId ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
        <Kpi
          label="Revenu (30j)" icon={Euro} color="text-green-400"
          value={`${((revenue?.revenue30d || 0) / 100).toFixed(2)}€`}
          sub={<DeltaBadge pct={revenue?.deltaPct || 0} />}
        />
        <Kpi label="Commandes (30j)" icon={ShoppingCart} value={revenue?.orders30d ?? 0} />
        <Kpi
          label="Panier moyen" icon={TrendingUp}
          value={revenue?.orders30d ? `${((revenue.revenue30d / revenue.orders30d) / 100).toFixed(2)}€` : '—'}
        />
        {dauProductId && (
          <Kpi label="Actifs aujourd'hui" icon={Users} color="text-purple-400" value={dau?.at(-1)?.dau ?? 0} />
        )}
      </div>

      <div className={`grid gap-4 ${dauProductId && hasDau ? 'lg:grid-cols-2' : ''}`}>
        {hasRevenue && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Revenus — 30 derniers jours</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenue.trend}>
                <defs>
                  <linearGradient id={`rev-${productKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => `${(v / 100).toFixed(0)}€`} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={v => [`${(v / 100).toFixed(2)}€`, 'Revenu']}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" fill={`url(#rev-${productKey})`} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {dauProductId && hasDau && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Utilisateurs actifs — 30 derniers jours</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dau}>
                <defs>
                  <linearGradient id={`dau-${productKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Area type="monotone" dataKey="dau" name="Actifs" stroke="#8b5cf6" fill={`url(#dau-${productKey})`} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
