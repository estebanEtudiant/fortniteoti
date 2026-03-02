import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import { formatPlan, PLAN_COLORS } from '../lib/utils';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data) return <p className="text-gray-500">Erreur de chargement</p>;

  const pieData = (data.salesByPlan || []).map(s => ({
    name: formatPlan(s.plan),
    value: s.count,
    revenue: s.revenue,
    color: PLAN_COLORS[s.plan] || '#6b7280',
  }));

  const successRate = data.activationSuccessRate ?? 100;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytiques</h1>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400 mb-1">Taux de succès (7j)</p>
          <p className={`text-3xl font-bold ${successRate >= 90 ? 'text-green-400' : successRate >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
            {successRate}%
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400 mb-1">Activations (7j)</p>
          <p className="text-3xl font-bold">{data.totalActivations7d ?? 0}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400 mb-1">Succès (7j)</p>
          <p className="text-3xl font-bold text-green-400">{data.successCount ?? 0}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400 mb-1">Plans vendus (total)</p>
          <p className="text-3xl font-bold">{(data.salesByPlan || []).reduce((a, s) => a + s.count, 0)}</p>
        </div>
      </div>

      {/* Monthly revenue bar chart */}
      {data.monthlyRevenueChart?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Revenus mensuels (6 derniers mois)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthlyRevenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => `${(v / 100).toFixed(0)}€`} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                formatter={v => [`${(v / 100).toFixed(2)}€`, 'Revenu']} />
              <Bar dataKey="amount" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Activation chart */}
        {data.activationChart?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4">Activations (7 derniers jours)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.activationChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} dot={false} name="Succès" />
                <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={false} name="Echecs" />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Plan distribution pie */}
        {pieData.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4">Répartition des ventes par plan</h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                    formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-gray-300 flex-1">{p.name}</span>
                    <span className="font-bold">{p.value}</span>
                    <span className="text-gray-500 text-xs">{(p.revenue / 100).toFixed(0)}€</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Revenue per plan table */}
      {data.salesByPlan?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Détail des ventes par plan</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-800">
                  <th className="pb-3">Plan</th>
                  <th className="pb-3 text-center">Ventes</th>
                  <th className="pb-3 text-right">Revenu total</th>
                  <th className="pb-3 text-right">Prix moyen</th>
                </tr>
              </thead>
              <tbody>
                {data.salesByPlan.map(s => (
                  <tr key={s.plan} className="border-b border-gray-800/50">
                    <td className="py-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PLAN_COLORS[s.plan] || '#6b7280' }} />
                      {formatPlan(s.plan)}
                    </td>
                    <td className="py-3 text-center font-bold">{s.count}</td>
                    <td className="py-3 text-right text-green-400 font-mono">{(s.revenue / 100).toFixed(2)}€</td>
                    <td className="py-3 text-right text-gray-400 font-mono">
                      {s.count > 0 ? (s.revenue / s.count / 100).toFixed(2) : '0.00'}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
