import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Users, AlertTriangle, UserPlus, Skull } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';

function StatTile({ label, value, delta, deltaLabel, icon: Icon, color, onClick }) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  return (
    <div onClick={onClick}
      className={`bg-gray-900 border border-gray-800 rounded-xl p-5 ${onClick ? 'cursor-pointer hover:border-gray-600 transition-colors' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {(delta !== undefined && delta !== null) && (
        <div className={`text-xs mt-1 flex items-center gap-1 ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-500'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : null}
          {isPositive ? '+' : ''}{delta}{deltaLabel || ''}
        </div>
      )}
    </div>
  );
}

const chartTooltipStyle = {
  contentStyle: { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' },
  labelStyle: { color: '#9ca3af' },
};

function MrrChart({ data }) {
  const formatted = (data || []).map(d => ({ ...d, mrr: d.mrr / 100 }));
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h4 className="text-sm font-semibold text-gray-300 mb-4">MRR (30 jours glissants)</h4>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }}
            tickFormatter={v => v.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `${v}€`} />
          <Tooltip {...chartTooltipStyle} formatter={v => [`${v.toFixed(2)}€`, 'MRR']} />
          <Line type="monotone" dataKey="mrr" stroke="#c45cff" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DauChart({ data }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h4 className="text-sm font-semibold text-gray-300 mb-4">DAU (30 jours)</h4>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data || []}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }}
            tickFormatter={v => v.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
          <Tooltip {...chartTooltipStyle} />
          <Line type="monotone" dataKey="dau" stroke="#06b6d4" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SignupsCancelsChart({ data }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h4 className="text-sm font-semibold text-gray-300 mb-4">Signups vs Bans (14 jours)</h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data || []}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }}
            tickFormatter={v => v.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
          <Tooltip {...chartTooltipStyle} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Bar dataKey="signups" fill="#22c55e" radius={[3, 3, 0, 0]} />
          <Bar dataKey="cancels" fill="#ef4444" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ErrorsChart({ data }) {
  const sorted = [...(data || [])].sort((a, b) => b.count - a.count).slice(0, 15);
  const formatted = sorted.map(d => ({ ...d, label: `${d.status} ${d.endpoint?.split('/').slice(-2).join('/')}` }));
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h4 className="text-sm font-semibold text-gray-300 mb-4">Erreurs par endpoint (24h)</h4>
      {formatted.length === 0 ? (
        <p className="text-sm text-gray-600 italic py-8 text-center">Aucune erreur</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={formatted} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: '#6b7280' }} width={140} />
            <Tooltip {...chartTooltipStyle} />
            <Bar dataKey="count" fill="#e040a0" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function TopUsersTable({ data, navigate }) {
  if (!data?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <h3 className="font-semibold text-white">Top Users (7 jours)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-left">
              <th className="px-4 py-3">Email / ID</th>
              <th className="px-4 py-3">Fetches (7j)</th>
              <th className="px-4 py-3">Distinct HWIDs</th>
              <th className="px-4 py-3">Last Activity</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((u, i) => (
              <tr key={u.userId || i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <div className="text-gray-200">{u.email || '—'}</div>
                  <div className="text-xs text-gray-500 font-mono">{u.userId?.slice(0, 12)}</div>
                </td>
                <td className="px-4 py-3 text-gray-300 font-mono">{u.fetches}</td>
                <td className="px-4 py-3">
                  <span className={`font-mono ${u.distinctHwids > 3 ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                    {u.distinctHwids}
                  </span>
                  {u.distinctHwids > 3 && <span className="ml-1 text-xs text-red-400">⚠️</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{formatDate(u.lastActivity)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/kill-switch`)}
                    className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors">
                    Suspend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MetricsPage({ navigate }) {
  const [overview, setOverview] = useState(null);
  const [mrrData, setMrrData] = useState(null);
  const [dauData, setDauData] = useState(null);
  const [signupsData, setSignupsData] = useState(null);
  const [errorsData, setErrorsData] = useState(null);
  const [topUsers, setTopUsers] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, mrr, dau, signups, errors, top] = await Promise.all([
        api.metricsOverview(),
        api.metricsMrr(30),
        api.metricsDau(30, 'fortniteclient'),
        api.metricsSignupsCancels(14),
        api.metricsErrors(24),
        api.metricsTopUsers(7, 20),
      ]);
      setOverview(ov);
      setMrrData(mrr.series);
      setDauData(dau.series);
      setSignupsData(signups.series);
      setErrorsData(errors);
      setTopUsers(top);
    } catch (err) {
      console.error('Metrics load error:', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const iv = setInterval(load, 300_000); return () => clearInterval(iv); }, [load]);

  const fmtMrr = overview ? `${(overview.mrr / 100).toFixed(0)}€` : '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold">Metrics</h2>
        <button onClick={load}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      {/* Overview tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile label="MRR (30j)" value={fmtMrr}
          delta={overview?.mrrDelta} deltaLabel="%"
          icon={TrendingUp} color="text-purple-400" />
        <StatTile label="DAU" value={overview?.dau ?? '—'}
          delta={overview?.dauDelta} deltaLabel=" vs hier"
          icon={Users} color="text-cyan-400" />
        <StatTile label="Signups aujourd'hui" value={overview?.signupsToday ?? '—'}
          icon={UserPlus} color="text-green-400" />
        <StatTile label="Active Kills" value={overview?.activeKills ?? '—'}
          icon={Skull} color="text-red-400"
          onClick={() => navigate('/kill-switch')} />
      </div>

      {/* Charts 2x2 */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <MrrChart data={mrrData} />
        <DauChart data={dauData} />
        <SignupsCancelsChart data={signupsData} />
        <ErrorsChart data={errorsData} />
      </div>

      {/* Top Users */}
      <TopUsersTable data={topUsers} navigate={navigate} />
    </div>
  );
}
