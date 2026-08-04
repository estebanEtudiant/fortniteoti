import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, Users, Eye, RefreshCw, TrendingUp, Wifi, Gamepad2, Server,
  Activity, ShieldAlert, Clock, Plug, CheckCircle2, AlertTriangle, Ban,
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../lib/api';
import Loading from '../components/Loading';

const PIE_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899'];

// ── Helpers ──
function timeAgo(ts) {
  if (!ts) return '—';
  const ms = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins <= 0) return "À l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs} h`;
  return `il y a ${Math.floor(hrs / 24)} j`;
}

function expiresLabel(ts) {
  if (!ts) return { text: 'Permanent', cls: 'text-gray-400' };
  const ms = new Date(ts).getTime() - Date.now();
  if (ms <= 0) return { text: 'Expirée', cls: 'text-red-400' };
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return { text: `${days} j`, cls: days <= 3 ? 'text-amber-400' : 'text-gray-300' };
  const hrs = Math.floor(ms / 3600000);
  return { text: `${hrs} h`, cls: 'text-red-400' };
}

function langFlag(lang) {
  if (!lang || lang === 'unknown') return '🌐';
  const code = lang.slice(0, 2).toLowerCase();
  const map = { fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', de: '🇩🇪', pt: '🇧🇷', it: '🇮🇹', ru: '🇷🇺', ar: '🇸🇦' };
  return map[code] || '🌐';
}

const EVENT_STYLE = {
  success:       { icon: CheckCircle2, cls: 'text-green-400 bg-green-900/30 border-green-800', label: 'Connexion' },
  expired:       { icon: Clock,        cls: 'text-amber-400 bg-amber-900/30 border-amber-800', label: 'Expirée' },
  banned:        { icon: Ban,          cls: 'text-red-400 bg-red-900/30 border-red-800',       label: 'Bannie' },
  hwid_mismatch: { icon: ShieldAlert,  cls: 'text-orange-400 bg-orange-900/30 border-orange-800', label: 'HWID ≠' },
};

function osIcon(os) {
  if (!os) return '🖥️';
  const s = os.toLowerCase();
  if (s.includes('win')) return '🪟';
  if (s.includes('mac') || s.includes('darwin')) return '🍎';
  if (s.includes('linux')) return '🐧';
  return '🖥️';
}

// ── Small UI building blocks ──
function Kpi({ label, value, icon: Icon, color = 'text-white', pulse = false, sub }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        {pulse
          ? <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          : Icon && <Icon className="w-5 h-5 text-gray-500" />}
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

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
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Minecraft tab ──
function MinecraftTab({ data }) {
  if (!data) return <p className="text-gray-500">Aucune donnée Minecraft.</p>;
  const s = data.summary || {};
  const servers = data.productStats || [];
  const sessions = data.liveSessions || [];
  const events = data.recentEvents || [];

  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <Kpi label="Joueurs connectés" value={s.onlineNow ?? 0} color="text-green-400" pulse sub="loader actif (10 min)" />
        <Kpi label="Connexions (24h)" value={s.connections24h ?? 0} icon={Plug} sub="tentatives d'activation" />
        <Kpi label="Réussies (24h)" value={s.success24h ?? 0} icon={CheckCircle2} color="text-cyan-400" />
        <Kpi label="HWID refusés (24h)" value={s.mismatch24h ?? 0} icon={ShieldAlert} color={s.mismatch24h ? 'text-orange-400' : 'text-white'} sub="partage de clé probable" />
        <Kpi label="Licences actives" value={s.activeLicenses ?? 0} icon={Activity} color="text-purple-400" />
        <Kpi label="Actives aujourd'hui" value={s.activeToday ?? 0} icon={Users} color="text-blue-400" sub="vues dans les 24h" />
      </div>

      {/* Per-server cards */}
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Server className="w-5 h-5 text-orange-400" /> Par serveur
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {servers.length === 0 && (
          <p className="text-gray-500 text-sm col-span-full">Aucun produit loader configuré.</p>
        )}
        {servers.map((sv) => (
          <div key={sv.product} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: sv.color }} />
                <span className="font-semibold">{sv.serverName}</span>
                {sv.serverActive === false && (
                  <span className="text-[10px] uppercase bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">inactif</span>
                )}
              </div>
              <span className="text-xs font-mono text-gray-600">{sv.product}</span>
            </div>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-3xl font-bold text-green-400">{sv.online}</p>
                <p className="text-xs text-gray-500">en ligne</p>
              </div>
              <div className="text-right text-xs text-gray-500 space-y-0.5">
                <p><span className="text-gray-300 font-semibold">{sv.activeToday}</span> aujourd'hui</p>
                <p><span className="text-gray-300 font-semibold">{sv.connections24h}</span> connexions 24h</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center border-t border-gray-800 pt-3">
              <Stat n={sv.active} label="actives" cls="text-purple-400" />
              <Stat n={sv.expiringSoon} label="< 7 j" cls={sv.expiringSoon ? 'text-amber-400' : 'text-gray-300'} />
              <Stat n={sv.mismatch24h} label="HWID≠" cls={sv.mismatch24h ? 'text-orange-400' : 'text-gray-300'} />
              <Stat n={sv.total} label="total" cls="text-gray-300" />
            </div>
          </div>
        ))}
      </div>

      {/* Connections chart */}
      {data.dailyConnections?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Connexions loader — 14 derniers jours</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.dailyConnections}>
              <defs>
                <linearGradient id="mcok" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mcko" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#9ca3af' }} />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
              <Area type="monotone" dataKey="success" name="Réussies" stroke="#10b981" fill="url(#mcok)" strokeWidth={2} />
              <Area type="monotone" dataKey="mismatch" name="HWID refusés" stroke="#f97316" fill="url(#mcko)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Live sessions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-green-400" />
          Sessions loader en direct
          <span className="ml-2 text-xs bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full border border-green-800">
            {sessions.length} en ligne
          </span>
        </h2>
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">Aucun client connecté au loader en ce moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="pb-2 pr-4 font-medium">Serveur</th>
                  <th className="pb-2 pr-4 font-medium">Licence</th>
                  <th className="pb-2 pr-4 font-medium">Machine</th>
                  <th className="pb-2 pr-4 font-medium">OS</th>
                  <th className="pb-2 pr-4 font-medium">Version</th>
                  <th className="pb-2 pr-4 font-medium">IP</th>
                  <th className="pb-2 pr-4 font-medium">Expire</th>
                  <th className="pb-2 font-medium">Vu</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((v, i) => {
                  const exp = expiresLabel(v.expiresAt);
                  return (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: v.color }} />
                          {v.serverName}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-cyan-400 text-xs">{v.key}</td>
                      <td className="py-2 pr-4 text-gray-300">
                        {v.username || v.hostname
                          ? <span title={v.hwid || ''}>{v.username || '?'}{v.hostname ? `@${v.hostname}` : ''}</span>
                          : <span className="text-gray-600 font-mono text-xs">{v.hwid || '—'}</span>}
                      </td>
                      <td className="py-2 pr-4 text-gray-400 text-xs">{osIcon(v.os)} {v.os || '—'}</td>
                      <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{v.appVersion || '—'}</td>
                      <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{v.ip || '—'}</td>
                      <td className={`py-2 pr-4 text-xs ${exp.cls}`}>{exp.text}</td>
                      <td className="py-2 text-gray-400 text-xs">{timeAgo(v.lastHeartbeat)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent events */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" /> Flux des connexions récentes
        </h2>
        {events.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">Aucun évènement récent.</p>
        ) : (
          <div className="space-y-1.5 max-h-[28rem] overflow-y-auto">
            {events.map((e, i) => {
              const st = EVENT_STYLE[e.status] || { icon: AlertTriangle, cls: 'text-gray-400 bg-gray-800 border-gray-700', label: e.status };
              const Icon = st.icon;
              return (
                <div key={i} className="flex items-center gap-3 text-sm py-1.5 px-2 rounded hover:bg-gray-800/30">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${st.cls}`}>
                    <Icon className="w-3 h-3" /> {st.label}
                  </span>
                  <span className="text-gray-300">{e.serverName || '—'}</span>
                  <span className="font-mono text-cyan-400 text-xs">{e.key || '—'}</span>
                  <span className="font-mono text-gray-500 text-xs">{e.ip || '—'}</span>
                  <span className="ml-auto text-gray-500 text-xs whitespace-nowrap">{timeAgo(e.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ n, label, cls }) {
  return (
    <div>
      <p className={`text-lg font-bold ${cls}`}>{n}</p>
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
    </div>
  );
}

// ── Website tab ──
function WebTab({ data }) {
  if (!data) return <p className="text-gray-500">Aucune donnée site.</p>;
  const totalPvToday = data.topPages?.reduce((a, p) => a + p.count, 0) ?? 0;
  const totalPv30d = data.daily?.reduce((a, d) => a + d.pageViews, 0) ?? 0;
  const totalSess30d = data.daily?.reduce((a, d) => a + d.sessions, 0) ?? 0;

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Visiteurs en temps réel" value={data.realtimeVisitors ?? 0} color="text-green-400" pulse sub="actifs (10 min)" />
        <Kpi label="Pages vues (aujourd'hui)" value={totalPvToday} icon={Eye} />
        <Kpi label="Pages vues (30j)" value={totalPv30d} icon={TrendingUp} color="text-purple-400" />
        <Kpi label="Sessions uniques (30j)" value={totalSess30d} icon={Users} color="text-blue-400" />
      </div>

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
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#9ca3af' }} />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
              <Area type="monotone" dataKey="pageViews" name="Pages vues" stroke="#06b6d4" fill="url(#pv)" strokeWidth={2} />
              <Area type="monotone" dataKey="sessions" name="Sessions uniques" stroke="#8b5cf6" fill="url(#sess)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MiniPie title="Appareils" data={data.deviceBreakdown} />
        <MiniPie title="Navigateurs" data={data.browserBreakdown} />
        <MiniPie title="Systèmes d'exploitation" data={data.osBreakdown} />
        <MiniPie title="Sources / Referrers" data={data.referrerBreakdown} />
      </div>

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
                {data.liveVisitors.map((visitor, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 pr-4 font-mono text-gray-400 text-xs">{visitor.sessionId}...</td>
                    <td className="py-2 pr-4 font-mono text-cyan-400 text-xs">{visitor.path || '/'}</td>
                    <td className="py-2 pr-4 text-gray-400">{timeAgo(visitor.lastSeen)}</td>
                    <td className="py-2 text-gray-300">
                      <span title={visitor.lang}>{langFlag(visitor.lang)} {visitor.lang || 'unknown'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                      <div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${(p.count / max) * 100}%` }} />
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

export default function ActivityPage() {
  const [web, setWeb] = useState(null);
  const [mc, setMc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('minecraft');

  const load = useCallback(async () => {
    try {
      const [w, m] = await Promise.all([
        api.getActivity().catch(() => null),
        api.getMinecraftActivity().catch(() => null),
      ]);
      setWeb(w);
      setMc(m);
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

  const onlineNow = mc?.summary?.onlineNow ?? 0;

  const tabs = [
    { id: 'minecraft', label: 'Minecraft', icon: Gamepad2, badge: onlineNow },
    { id: 'web', label: 'Site web', icon: Globe, badge: web?.realtimeVisitors ?? 0 },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6 text-cyan-400" /> Activité
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> auto 30s
          </span>
          <button onClick={load} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-800">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active ? 'border-cyan-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
              {t.badge > 0 && (
                <span className="text-[10px] bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded-full border border-green-800">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'minecraft' ? <MinecraftTab data={mc} /> : <WebTab data={web} />}
    </div>
  );
}
