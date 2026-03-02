import React, { useState, useEffect } from 'react';
import {
  Key, Users, CheckCircle, Ban, TrendingUp, Euro, ShoppingCart,
  Wifi, RefreshCw, Calendar, AlertCircle, AlertTriangle, ChevronRight,
  Settings, Save,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import { formatPlan, formatDate } from '../lib/utils';

function RevenueGoalCard({ totalRevenue }) {
  const [goal, setGoal] = useState(() => parseInt(localStorage.getItem('revGoal') || '1000', 10));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const percent = Math.min(100, Math.round((totalRevenue / 100 / goal) * 100));

  const save = () => {
    const v = parseInt(draft, 10);
    if (v > 0) { setGoal(v); localStorage.setItem('revGoal', String(v)); }
    setEditing(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" /> Objectif de Revenu
        </h2>
        {editing ? (
          <div className="flex gap-2">
            <input
              type="number"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="w-28 text-sm"
              placeholder="Objectif €"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && save()}
            />
            <button onClick={save} className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded text-sm">
              <Save className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => { setDraft(String(goal)); setEditing(true); }}
            className="text-gray-500 hover:text-white text-sm flex items-center gap-1">
            <Settings className="w-4 h-4" /> Modifier
          </button>
        )}
      </div>
      <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
        <span>{(totalRevenue / 100).toFixed(2)}€ réalisé</span>
        <span>Objectif : {goal.toFixed(0)}€</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-700"
          style={{ width: `${percent}%`, background: percent >= 100 ? '#10b981' : 'linear-gradient(90deg, #06b6d4, #10b981)' }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2 text-right">{percent}% atteint</p>
    </div>
  );
}

export default function DashboardPage({ navigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!stats) return <p className="text-gray-500">Erreur de chargement</p>;

  const alerts = stats.alerts || {};

  const topCards = [
    { label: 'Licences Total',    value: stats.total,             icon: Key,          color: 'cyan' },
    { label: 'Licences Actives',  value: stats.active,            icon: CheckCircle,  color: 'green' },
    { label: 'Utilisateurs',      value: stats.customers?.total,  icon: Users,        color: 'blue' },
    { label: 'Nouveaux (30j)',     value: stats.customers?.new30d, icon: TrendingUp,   color: 'purple' },
    { label: 'Revenu Total',      value: `${((stats.revenue?.total || 0) / 100).toFixed(2)}€`, icon: Euro,       color: 'yellow' },
    { label: 'Revenu (30j)',      value: `${((stats.revenue?.last30d || 0) / 100).toFixed(2)}€`, icon: ShoppingCart, color: 'green' },
    { label: 'Actives maintenant', value: alerts.activeNow ?? '—', icon: Wifi,         color: 'cyan' },
    { label: 'Bannies',           value: stats.banned,            icon: Ban,          color: 'red' },
  ];

  const colorMap = {
    cyan: 'text-cyan-400', green: 'text-green-400', blue: 'text-blue-400',
    purple: 'text-purple-400', yellow: 'text-yellow-400', red: 'text-red-400',
  };

  const alertItems = [
    alerts.expiringIn7d > 0 && {
      icon: Calendar, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      text: `${alerts.expiringIn7d} licence(s) expirent dans 7 jours`,
      action: () => navigate('/licenses'),
    },
    alerts.hwidMismatches24h > 0 && {
      icon: AlertCircle, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      text: `${alerts.hwidMismatches24h} tentative(s) HWID invalide (24h)`,
      action: () => navigate('/logs'),
    },
    alerts.blockedIpCount > 0 && {
      icon: AlertTriangle, color: 'text-red-400 bg-red-500/10 border-red-500/20',
      text: `${alerts.blockedIpCount} IP(s) actuellement bloquée(s)`,
      action: () => navigate('/blocked-ips'),
    },
  ].filter(Boolean);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button onClick={() => window.location.reload()}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Alert strip */}
      {alertItems.length > 0 && (
        <div className="space-y-2 mb-6">
          {alertItems.map((a, i) => (
            <button key={i} onClick={a.action}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm text-left ${a.color}`}>
              <a.icon className="w-4 h-4 shrink-0" />
              <span>{a.text}</span>
              <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
            </button>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {topCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{label}</span>
              <Icon className={`w-5 h-5 ${colorMap[color]}`} />
            </div>
            <p className="text-2xl font-bold">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      {stats.revenueChart?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Revenus — 30 derniers jours</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.revenueChart}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => `${(v / 100).toFixed(0)}€`} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={v => [`${(v / 100).toFixed(2)}€`, 'Revenu']} />
              <Area type="monotone" dataKey="amount" stroke="#06b6d4" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Revenue Goal */}
      <RevenueGoalCard totalRevenue={stats.revenue?.total ?? 0} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Plan breakdown */}
        {stats.planBreakdown?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4">Répartition par Plan</h2>
            <div className="grid grid-cols-2 gap-3">
              {stats.planBreakdown.map(({ plan, count }) => (
                <div key={plan} className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">{formatPlan(plan)}</p>
                  <p className="text-xl font-bold mt-1">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent orders */}
        {stats.recentOrders?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4">Dernières Ventes</h2>
            <div className="space-y-2">
              {stats.recentOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between text-sm bg-gray-800/50 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-medium">{o.customer?.username || '—'}</span>
                    <span className="text-gray-500 text-xs ml-2">{formatPlan(o.plan)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-green-400 font-mono">{(o.amount / 100).toFixed(2)}€</span>
                    <p className="text-xs text-gray-500">{formatDate(o.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
