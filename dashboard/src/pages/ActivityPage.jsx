import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Users, Eye, RefreshCw, TrendingUp, Monitor, Smartphone, Wifi } from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../lib/api';
import Loading from '../components/Loading';

const PIE_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899'];

function MiniPie({ title, data }) {
  const entries = Object.entries(data || {}).map(([name, value]) => ({ name, value }));
  if (!entries.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={entries} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} paddingAngle={2}>
            {entries.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function langFlag(lang) {
  if (!lang || lang === 'unknown') return '🌐';
  const code = lang.slice(0, 2).toLowerCase();
  if (code === 'fr') return '🇫🇷';
  if (code === 'en') return '🇬🇧';
  if (code === 'es') return '🇪🇸';
  if (code === 'de') return '🇩🇪';
  if (code === 'pt') return '🇧🇷';
  if (code === 'it') return '🇮🇹';
  if (code === 'ru') return '🇷🇺';
  if (code === 'ar') return '🇸🇦';
  return '🌐';
}

export default function ActivityPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.getActivity();
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <Loading />;
  if (!data) return <p className="text-gray-500">Erreur de chargement</p>;

  const totalPvToday = data.topPages?.reduce((a, p) => a + p.count, 0) ?? 0;
  const totalPv30d = data.daily?.reduce((a, d) => a + d.pageViews, 0) ?? 0;
  const totalSess30d = data.daily?.reduce((a, d) => a + d.sessions, 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-cyan-400" /> Activité du site
        </h1>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Visiteurs en temps réel</span>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
          <p className="text-3xl font-bold text-green-400">{data.realtimeVisitors ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">actifs dans les 10 dernières minutes</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Pages vues (aujourd'hui)</span>
            <Eye className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-3xl font-bold">{totalPvToday}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Pages vues (30j)</span>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-purple-400">{totalPv30d}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Sessions uniques (30j)</span>
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-blue-400">{totalSess30d}</p>
        </div>
      </div>

      {/* Traffic chart */}
      {data.daily?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Trafic — 30 derniers jours</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.daily}>
              <defs>
                <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
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
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
              <Area type="monotone" dataKey="pageViews" name="Pages vues" stroke="#06b6d4" fill="url(#pv)" strokeWidth={2} />
              <Area type="monotone" dataKey="sessions" name="Sessions uniques" stroke="#8b5cf6" fill="url(#sess)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Breakdowns 2x2 grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MiniPie title="Appareils" data={data.deviceBreakdown} />
        <MiniPie title="Navigateurs" data={data.browserBreakdown} />
        <MiniPie title="Systèmes d'exploitation" data={data.osBreakdown} />
        <MiniPie title="Sources / Referrers" data={data.referrerBreakdown} />
      </div>

      {/* Live visitors table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wifi className="w-5 h-5 text-green-400" />
          Visiteurs en direct
          <span className="ml-2 text-xs bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full border border-green-800">
            {data.liveVisitors?.length ?? 0} actifs
          </span>
        </h2>
        {!data.liveVisitors?.length ? (
          <p className="text-gray-500 text-sm text-center py-6">Aucun visiteur actif en ce moment</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="pb-2 pr-4 font-medium">Session ID</th>
                  <th className="pb-2 pr-4 font-medium">Page actuelle</th>
                  <th className="pb-2 pr-4 font-medium">Dernière activité</th>
                  <th className="pb-2 font-medium">Langue</th>
                </tr>
              </thead>
              <tbody>
                {data.liveVisitors.map((visitor, i) => {
                  const minsAgo = Math.floor((Date.now() - visitor.lastSeen) / 60000);
                  return (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 pr-4 font-mono text-gray-400 text-xs">
                        {visitor.sessionId}...
                      </td>
                      <td className="py-2 pr-4 font-mono text-cyan-400 text-xs">
                        {visitor.path || '/'}
                      </td>
                      <td className="py-2 pr-4 text-gray-400">
                        {minsAgo === 0 ? 'A l\'instant' : `il y a ${minsAgo} min`}
                      </td>
                      <td className="py-2 text-gray-300">
                        <span title={visitor.lang}>{langFlag(visitor.lang)} {visitor.lang || 'unknown'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top pages */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Top pages — aujourd'hui</h2>
        {data.topPages?.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">Aucune visite enregistrée aujourd'hui.</p>
        ) : (
          <div className="space-y-2">
            {(data.topPages || []).map((p, i) => {
              const max = data.topPages[0]?.count || 1;
              return (
                <div key={p.path} className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-mono text-gray-300">{p.path || '/'}</span>
                      <span className="text-sm font-bold text-cyan-400">{p.count}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-cyan-500"
                        style={{ width: `${(p.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
