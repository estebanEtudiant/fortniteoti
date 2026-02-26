import React, { useState, useEffect, useCallback } from 'react';
import { api } from './lib/api';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Shield, Key, Users, BarChart3, LogOut, Plus, Ban, RotateCcw,
  Search, ChevronLeft, ChevronRight, Clock, AlertTriangle,
  CheckCircle, XCircle, Cpu, Trash2, Calendar, RefreshCw, Download,
  UserX, UserCheck, Package, TrendingUp, Euro, ShoppingCart,
  Mail, Settings, Globe, Activity, AlertCircle, Copy, Check,
  Wifi, WifiOff, Eye, Upload, MessageSquare, Star, Save,
} from 'lucide-react';

// ══════════════════════════════════════════════════════
//  Router
// ══════════════════════════════════════════════════════
function useRouter() {
  const parse = () => (window.location.hash.slice(1) || '/').split('?')[0];
  const [path, setPath] = useState(parse);
  useEffect(() => {
    const h = () => setPath(parse());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  const navigate = (to) => { window.location.hash = to; };
  return { path, navigate };
}

// ══════════════════════════════════════════════════════
//  App Root
// ══════════════════════════════════════════════════════
export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('admin_token'));
  const { path, navigate } = useRouter();

  if (!authed) return <LoginPage onLogin={() => { setAuthed(true); navigate('/'); }} />;
  const logout = () => { api.clearToken(); setAuthed(false); };

  let page;
  if (path.startsWith('/licenses/'))       page = <LicenseDetailPage id={path.split('/')[2]} navigate={navigate} />;
  else if (path.startsWith('/customers/')) page = <CustomerDetailPage id={path.split('/')[2]} navigate={navigate} />;
  else if (path === '/licenses')           page = <LicensesPage navigate={navigate} />;
  else if (path === '/customers')          page = <CustomersPage navigate={navigate} />;
  else if (path === '/orders')             page = <OrdersPage navigate={navigate} />;
  else if (path === '/analytics')          page = <AnalyticsPage />;
  else if (path === '/plans')              page = <PlansPage />;
  else if (path === '/generate')           page = <GeneratePage />;
  else if (path === '/blocked-ips')        page = <BlockedIPsPage />;
  else if (path === '/logs')               page = <LogsPage />;
  else if (path === '/settings')           page = <SettingsPage />;
  else if (path === '/software')           page = <SoftwarePage />;
  else if (path === '/bot')                page = <BotPage />;
  else                                     page = <DashboardPage navigate={navigate} />;

  return (
    <div className="flex min-h-screen">
      <Sidebar path={path} navigate={navigate} onLogout={logout} />
      <main className="flex-1 p-6 overflow-auto">{page}</main>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Sidebar
// ══════════════════════════════════════════════════════
function Sidebar({ path, navigate, onLogout }) {
  const items = [
    { icon: BarChart3,     label: 'Dashboard',      p: '/' },
    { icon: Activity,      label: 'Analytiques',    p: '/analytics' },
    { icon: Key,           label: 'Licences',       p: '/licenses' },
    { icon: Users,         label: 'Utilisateurs',   p: '/customers' },
    { icon: ShoppingCart,  label: 'Commandes',      p: '/orders' },
    { icon: Package,       label: 'Plans',          p: '/plans' },
    { icon: Plus,          label: 'Générer',        p: '/generate' },
    { icon: Upload,        label: 'Logiciel',       p: '/software' },
    { icon: MessageSquare, label: 'Bot Discord',    p: '/bot' },
    { icon: AlertTriangle, label: 'IPs Bloquées',   p: '/blocked-ips' },
    { icon: Clock,         label: 'Logs',           p: '/logs' },
    { icon: Settings,      label: 'Paramètres',     p: '/settings' },
  ];
  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-cyan-400" />
          <span className="font-bold text-cyan-400">FnOptimizer</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Admin Dashboard</p>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map(({ icon: Icon, label, p }) => (
          <button key={p} onClick={() => navigate(p)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
              ${path === p || (p !== '/' && path.startsWith(p))
                ? 'bg-cyan-500/10 text-cyan-400'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400">
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>
    </aside>
  );
}

// ══════════════════════════════════════════════════════
//  Login
// ══════════════════════════════════════════════════════
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = await api.login(username, password);
      api.setToken(data.token); onLogin();
    } catch (err) { setError(err.message || 'Identifiants incorrects'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">FnOptimizer Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Licensing Management</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Utilisateur</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full" placeholder="admin" autoFocus required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white font-medium py-2.5 rounded-lg">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Dashboard
// ══════════════════════════════════════════════════════
function DashboardPage({ navigate }) {
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
    { label: 'Actives maintenant',value: alerts.activeNow ?? '—', icon: Wifi,         color: 'cyan' },
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

// ══════════════════════════════════════════════════════
//  Analytics Page
// ══════════════════════════════════════════════════════
const PLAN_COLORS = {
  DAYS_30: '#06b6d4',
  DAYS_90: '#8b5cf6',
  DAYS_365: '#10b981',
  LIFETIME: '#f59e0b',
};

function AnalyticsPage() {
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
          <table className="w-full text-sm">
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
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Orders Page
// ══════════════════════════════════════════════════════
function OrdersPage({ navigate }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 25 };
    if (status) params.status = status;
    if (plan) params.plan = plan;
    api.getOrders(params).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [page, status, plan]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = data?.data?.reduce((a, o) => a + (o.status === 'COMPLETED' ? o.amount : 0), 0) || 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Commandes</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="w-44">
          <option value="">Tous les statuts</option>
          <option value="COMPLETED">Complétée</option>
          <option value="PENDING">En attente</option>
          <option value="FAILED">Échouée</option>
          <option value="REFUNDED">Remboursée</option>
        </select>
        <select value={plan} onChange={e => { setPlan(e.target.value); setPage(1); }} className="w-36">
          <option value="">Tous les plans</option>
          <option value="DAYS_30">30 jours</option>
          <option value="DAYS_90">90 jours</option>
          <option value="DAYS_365">1 an</option>
          <option value="LIFETIME">Lifetime</option>
        </select>
        {data && (
          <div className="ml-auto flex items-center gap-4 text-sm text-gray-400">
            <span>{data.pagination.total} commande(s)</span>
            <span className="text-green-400 font-mono font-bold">
              {(totalRevenue / 100).toFixed(2)}€ (page)
            </span>
          </div>
        )}
      </div>

      {loading ? <Loading /> : !data?.data?.length ? (
        <div className="text-center text-gray-500 py-12">Aucune commande trouvée</div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Stripe Session</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(o => (
                  <tr key={o.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                    onClick={() => o.customer?.id && navigate(`/customers/${o.customer.id}`)}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.customer?.username || '—'}</div>
                      <div className="text-xs text-gray-500">{o.customer?.email || ''}</div>
                    </td>
                    <td className="px-4 py-3">{formatPlan(o.plan)}</td>
                    <td className="px-4 py-3 font-mono text-green-400">{(o.amount / 100).toFixed(2)}€</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {o.stripeSessionId ? o.stripeSessionId.slice(0, 20) + '…' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <span>{data.pagination.total} commandes — Page {page}/{data.pagination.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Settings Page
// ══════════════════════════════════════════════════════
function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError('Les mots de passe ne correspondent pas');
      return;
    }
    setPwLoading(true); setPwError(''); setPwSuccess(false);
    try {
      await api.changeAdminPassword(pwForm.currentPassword, pwForm.newPassword);
      setPwSuccess(true);
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { setPwError(err.message); }
    finally { setPwLoading(false); }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Paramètres</h1>

      {/* Site Settings */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-400" /> Paramètres du site
        </h2>
        {settings && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm text-gray-400 mb-1">URL de téléchargement du logiciel</label>
              <input type="url" value={settings.downloadUrl || ''}
                onChange={e => setSettings(s => ({ ...s, downloadUrl: e.target.value }))}
                className="w-full text-sm" placeholder="https://..." />
              <p className="text-xs text-gray-500 mt-1">Lien affiché aux clients après achat et sur leur profil.</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Annonce publique (affiché sur le storefront)</label>
              <textarea value={settings.announcement || ''}
                onChange={e => setSettings(s => ({ ...s, announcement: e.target.value }))}
                className="w-full text-sm h-20 resize-none" placeholder="Ex: Maintenance prévue le 01/01..." />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">Mode maintenance</p>
                <p className="text-xs text-gray-500">Empêche les nouveaux achats sur le storefront</p>
              </div>
              <div
                onClick={() => setSettings(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${settings.maintenanceMode ? 'bg-orange-500' : 'bg-gray-700'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </div>
            <button onClick={handleSaveSettings} disabled={saving}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-gray-700'}`}>
              {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder les paramètres'}
            </button>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 max-w-xl">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" /> Changer le mot de passe admin
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {pwError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{pwError}</div>}
          {pwSuccess && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">Mot de passe modifié avec succès.</div>}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Mot de passe actuel</label>
            <input type="password" value={pwForm.currentPassword}
              onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
              className="w-full text-sm" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nouveau mot de passe</label>
            <input type="password" value={pwForm.newPassword}
              onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
              className="w-full text-sm" minLength={8} required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirmer le nouveau mot de passe</label>
            <input type="password" value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              className="w-full text-sm" required />
          </div>
          <button type="submit" disabled={pwLoading}
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-gray-700">
            {pwLoading ? 'Modification...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Blocked IPs Page
// ══════════════════════════════════════════════════════
function BlockedIPsPage() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.getBlockedIps({ page, limit: 50 }).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleUnblock = async (id) => {
    setUnblocking(id);
    try {
      await api.unblockIp(id);
      load();
    } catch (err) { alert(err.message); }
    finally { setUnblocking(''); }
  };

  const activeCount = data?.data?.filter(ip => !ip.expired).length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">IPs Bloquées</h1>
        {data && (
          <div className="text-sm text-gray-400">
            <span className="text-red-400 font-medium">{activeCount}</span> actives /
            <span className="ml-1">{data.pagination.total} total</span>
          </div>
        )}
      </div>

      {loading ? <Loading /> : !data?.data?.length ? (
        <div className="text-center text-gray-500 py-12">Aucune IP bloquée</div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="px-4 py-3">Adresse IP</th>
                  <th className="px-4 py-3">Raison</th>
                  <th className="px-4 py-3 text-center">Tentatives</th>
                  <th className="px-4 py-3">Bloquée le</th>
                  <th className="px-4 py-3">Expire le</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(ip => (
                  <tr key={ip.id} className="border-b border-gray-800/50">
                    <td className="px-4 py-3 font-mono text-cyan-400">{ip.ipAddress}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{ip.reason || '—'}</td>
                    <td className="px-4 py-3 text-center">{ip.attempts}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(ip.blockedAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(ip.expiresAt)}</td>
                    <td className="px-4 py-3">
                      {ip.expired
                        ? <span className="text-xs px-2 py-1 rounded-full bg-gray-500/10 text-gray-400">Expirée</span>
                        : <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400">Active</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleUnblock(ip.id)} disabled={unblocking === ip.id}
                        className="text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded transition-colors">
                        {unblocking === ip.id ? '...' : 'Débloquer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <span>Page {page}/{data.pagination.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Customers Page
// ══════════════════════════════════════════════════════
function CustomersPage({ navigate }) {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 25 };
    if (search) params.search = search;
    api.getCustomers(params).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  const doSearch = (e) => { e.preventDefault(); setPage(1); load(); };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Utilisateurs</h1>

      <form onSubmit={doSearch} className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10" placeholder="Rechercher email, username..." />
        </div>
        <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">
          Rechercher
        </button>
      </form>

      {loading ? <Loading /> : !data?.data?.length ? (
        <div className="text-center text-gray-500 py-12">Aucun utilisateur trouvé</div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Commandes</th>
                  <th className="px-4 py-3">Inscrit le</th>
                  <th className="px-4 py-3">Dernière co.</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(c => (
                  <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)}
                    className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer">
                    <td className="px-4 py-3 font-medium">{c.displayName || c.username}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{c.email}</td>
                    <td className="px-4 py-3 text-center">{c._count?.orders ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(c.lastLogin)}</td>
                    <td className="px-4 py-3">
                      {c.banned
                        ? <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400">Banni</span>
                        : <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400">Actif</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <span>{data.pagination.total} utilisateurs — Page {page}/{data.pagination.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Customer Detail
// ══════════════════════════════════════════════════════
function CustomerDetailPage({ id, navigate }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.getCustomer(id).then(setCustomer).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action) => {
    setActionLoading(action); setActionMsg('');
    try {
      if (action === 'ban')    await api.banCustomer(id);
      if (action === 'unban')  await api.unbanCustomer(id);
      if (action === 'reset-email') {
        await api.sendPasswordReset(id);
        setActionMsg('Email de réinitialisation envoyé !');
        setTimeout(() => setActionMsg(''), 3000);
        return;
      }
      if (action === 'revoke') {
        if (!confirm('Révoquer toutes les licences actives de ce compte ?')) return;
        const res = await api.revokeCustomerLicenses(id);
        setActionMsg(`${res.revoked} licence(s) révoquée(s)`);
        setTimeout(() => setActionMsg(''), 3000);
        load(); return;
      }
      if (action === 'delete') {
        if (!confirm('Supprimer définitivement ce compte ?')) return;
        await api.deleteCustomer(id);
        navigate('/customers'); return;
      }
      load();
    } catch (err) { alert(err.message); }
    finally { setActionLoading(''); }
  };

  if (loading) return <Loading />;
  if (!customer) return <p className="text-gray-500">Utilisateur introuvable</p>;

  return (
    <div>
      <button onClick={() => navigate('/customers')} className="text-gray-400 hover:text-white text-sm mb-4 flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xl">
          {(customer.displayName || customer.username || '?')[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{customer.displayName || customer.username}</h1>
          <p className="text-gray-400 text-sm">{customer.email}</p>
        </div>
        {customer.banned && <span className="ml-2 text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400">Banni</span>}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <InfoCard label="Username" value={customer.username} />
        <InfoCard label="Discord" value={customer.discordId || '—'} />
        <InfoCard label="Inscrit le" value={formatDate(customer.createdAt)} />
        <InfoCard label="Dernière connexion" value={formatDate(customer.lastLogin)} />
        <InfoCard label="Email vérifié" value={customer.emailVerified ? 'Oui' : 'Non'} />
        <InfoCard label="Commandes" value={customer.orders?.length ?? 0} />
      </div>

      {/* Actions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold mb-3">Actions</h2>
        {actionMsg && (
          <div className="mb-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">
            {actionMsg}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {customer.banned ? (
            <button onClick={() => doAction('unban')} disabled={!!actionLoading}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> {actionLoading === 'unban' ? '...' : 'Débannir'}
            </button>
          ) : (
            <button onClick={() => doAction('ban')} disabled={!!actionLoading}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <UserX className="w-4 h-4" /> {actionLoading === 'ban' ? '...' : 'Bannir'}
            </button>
          )}
          <button onClick={() => doAction('reset-email')} disabled={!!actionLoading}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <Mail className="w-4 h-4" /> {actionLoading === 'reset-email' ? '...' : 'Envoyer reset email'}
          </button>
          <button onClick={() => doAction('revoke')} disabled={!!actionLoading}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4" /> {actionLoading === 'revoke' ? '...' : 'Révoquer licences'}
          </button>
          <button onClick={() => doAction('delete')} disabled={!!actionLoading}
            className="bg-gray-700 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> {actionLoading === 'delete' ? '...' : 'Supprimer le compte'}
          </button>
        </div>
      </div>

      {/* Licences */}
      {customer.licenses?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Licences</h2>
          <div className="space-y-2">
            {customer.licenses.map(lic => (
              <div key={lic.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3">
                <div>
                  <span className="font-mono text-xs text-cyan-400">{lic.licenseKey}</span>
                  <span className="ml-3 text-gray-400 text-xs">{formatPlan(lic.plan)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={lic.status} />
                  <button onClick={() => navigate(`/licenses/${lic.id}`)}
                    className="text-xs text-gray-400 hover:text-white underline">Détail</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders */}
      {customer.orders?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Commandes</h2>
          <div className="space-y-2">
            {customer.orders.map(o => (
              <div key={o.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3 text-sm">
                <div>
                  <span>{formatPlan(o.plan)}</span>
                  <span className="text-gray-500 text-xs ml-3">{formatDate(o.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-green-400">{(o.amount / 100).toFixed(2)}€</span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Plans Page
// ══════════════════════════════════════════════════════
function PlansPage() {
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [saved, setSaved] = useState('');
  const [deleting, setDeleting] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newPlan, setNewPlan] = useState({ key: '', name: '', price: 999, originalPrice: 0, stripePrice: '' });
  const [addError, setAddError] = useState('');

  const load = () => {
    setLoading(true);
    api.getPlans().then(setPlans).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (planKey) => {
    setSaving(planKey);
    try {
      await api.updatePlan(planKey, plans[planKey]);
      setSaved(planKey);
      setTimeout(() => setSaved(''), 2000);
    } catch (err) { alert(err.message); }
    finally { setSaving(''); }
  };

  const handleDelete = async (planKey) => {
    if (!confirm(`Supprimer le plan "${planKey}" ? Cette action est irréversible.`)) return;
    setDeleting(planKey);
    try {
      await api.deletePlan(planKey);
      load();
    } catch (err) { alert(err.message); }
    finally { setDeleting(''); }
  };

  const handleAdd = async () => {
    setAddError('');
    if (!newPlan.key.trim() || !newPlan.name.trim()) { setAddError('Clé et nom requis.'); return; }
    try {
      await api.createPlan(newPlan);
      setShowAdd(false);
      setNewPlan({ key: '', name: '', price: 999, originalPrice: 0, stripePrice: '' });
      load();
    } catch (err) { setAddError(err.message); }
  };

  // Quand on active "Populaire" sur un plan, on le désactive sur tous les autres
  const setPopular = (planKey) => {
    setPlans(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { next[k] = { ...next[k], popular: k === planKey ? !next[k].popular : false }; });
      return next;
    });
  };

  const update = (planKey, field, value) => {
    setPlans(prev => ({ ...prev, [planKey]: { ...prev[planKey], [field]: value } }));
  };

  if (loading) return <Loading />;
  if (!plans) return <p className="text-gray-500">Erreur de chargement</p>;

  const planKeys = Object.keys(plans);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Gestion des Plans</h1>
        <button onClick={() => setShowAdd(!showAdd)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter un plan
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-6">Configure les plans disponibles à la vente sur le storefront.</p>

      {/* Add Plan Form */}
      {showAdd && (
        <div className="bg-gray-900 border border-cyan-700 rounded-xl p-5 mb-6">
          <h2 className="text-base font-semibold mb-4">Nouveau plan</h2>
          {addError && <p className="text-red-400 text-sm mb-3">{addError}</p>}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Clé interne (enum)</label>
              <select value={newPlan.key} onChange={e => setNewPlan(p => ({ ...p, key: e.target.value }))}
                className="w-full text-sm font-mono">
                <option value="">-- Choisir --</option>
                <option value="DAYS_1">DAYS_1</option>
                <option value="DAYS_7">DAYS_7</option>
                <option value="DAYS_14">DAYS_14</option>
                <option value="DAYS_30">DAYS_30</option>
                <option value="DAYS_90">DAYS_90</option>
                <option value="DAYS_365">DAYS_365</option>
                <option value="LIFETIME">LIFETIME</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nom affiché</label>
              <input type="text" value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))}
                className="w-full text-sm" placeholder="7 Jours" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Prix réel (centimes)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={newPlan.price} onChange={e => setNewPlan(p => ({ ...p, price: parseInt(e.target.value) || 0 }))}
                  className="flex-1 text-sm" min="0" />
                <span className="text-gray-400 text-sm font-mono">{(newPlan.price / 100).toFixed(2)}€</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Prix barré (0 = aucun)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={newPlan.originalPrice} onChange={e => setNewPlan(p => ({ ...p, originalPrice: parseInt(e.target.value) || 0 }))}
                  className="flex-1 text-sm" min="0" />
                <span className="text-gray-400 text-sm font-mono">{newPlan.originalPrice > 0 ? (newPlan.originalPrice / 100).toFixed(2) + '€' : '—'}</span>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Stripe Price ID (optionnel)</label>
              <input type="text" value={newPlan.stripePrice} onChange={e => setNewPlan(p => ({ ...p, stripePrice: e.target.value }))}
                className="w-full text-sm font-mono" placeholder="price_xxx..." />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">Créer</button>
            <button onClick={() => { setShowAdd(false); setAddError(''); }} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">Annuler</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {planKeys.map(key => {
          const p = plans[key];
          if (!p) return null;
          const planColor = PLAN_COLORS[key] || '#06b6d4';
          return (
            <div key={key} className={`bg-gray-900 border rounded-xl p-5 ${p.active ? 'border-gray-700' : 'border-gray-800 opacity-60'}`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: planColor }} />
                  <span className="font-mono text-sm text-gray-400">{key}</span>
                  {p.popular && <span className="text-xs bg-cyan-600 text-white px-2 py-0.5 rounded-full">Populaire</span>}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-400">{p.active ? 'Actif' : 'Inactif'}</span>
                    <div onClick={() => update(key, 'active', !p.active)}
                      className={`w-10 h-5 rounded-full transition-colors ${p.active ? 'bg-cyan-600' : 'bg-gray-700'} relative cursor-pointer`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${p.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nom affiché</label>
                  <input type="text" value={p.name} onChange={e => update(key, 'name', e.target.value)} className="w-full text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Prix réel (centimes)</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={p.price} onChange={e => update(key, 'price', parseInt(e.target.value) || 0)}
                        className="flex-1 text-sm" min="0" />
                      <span className="text-gray-400 text-xs font-mono">{(p.price / 100).toFixed(2)}€</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Prix barré (0 = aucun)</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={p.originalPrice || 0} onChange={e => update(key, 'originalPrice', parseInt(e.target.value) || 0)}
                        className="flex-1 text-sm" min="0" />
                      <span className="text-gray-400 text-xs font-mono">{(p.originalPrice || 0) > 0 ? (p.originalPrice / 100).toFixed(2) + '€' : '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Preview réduction */}
                {(p.originalPrice || 0) > 0 && (
                  <div className="bg-gray-800 rounded-lg px-3 py-2 text-sm flex items-center gap-3">
                    <span className="text-gray-500 line-through">{(p.originalPrice / 100).toFixed(2)}€</span>
                    <span className="text-white font-bold">{(p.price / 100).toFixed(2)}€</span>
                    <span className="text-green-400 text-xs">-{Math.round((1 - p.price / p.originalPrice) * 100)}%</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Stripe Price ID (optionnel)</label>
                  <input type="text" value={p.stripePrice || ''} onChange={e => update(key, 'stripePrice', e.target.value)}
                    className="w-full text-sm font-mono" placeholder="price_xxx..." />
                </div>

                {/* Populaire toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-400">Badge "Populaire" sur le storefront</span>
                  <div onClick={() => setPopular(key)}
                    className={`w-10 h-5 rounded-full transition-colors ${p.popular ? 'bg-cyan-600' : 'bg-gray-700'} relative cursor-pointer`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${p.popular ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => handleSave(key)} disabled={saving === key}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    saved === key ? 'bg-green-600 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-gray-700'}`}>
                  {saving === key ? 'Sauvegarde...' : saved === key ? '✓ Sauvegardé' : 'Sauvegarder'}
                </button>
                <button onClick={() => handleDelete(key)} disabled={deleting === key}
                  className="px-3 py-2 rounded-lg text-sm bg-red-900 hover:bg-red-800 text-red-300 disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Licenses Page
// ══════════════════════════════════════════════════════
function LicensesPage({ navigate }) {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 25 };
    if (search) params.search = search;
    if (status) params.status = status;
    if (plan) params.plan = plan;
    api.getLicenses(params).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [page, search, status, plan]);

  useEffect(() => { load(); }, [load]);
  const doSearch = (e) => { e.preventDefault(); setPage(1); load(); };

  const exportCsv = () => {
    if (!data?.data?.length) return;
    const header = 'Clé,Plan,Statut,Email,HWID,Expire,Dernier HB';
    const rows = data.data.map(l =>
      `${l.licenseKey},${l.plan},${l.status},${l.email || ''},${l.hwid || ''},${l.expiresAt || 'Lifetime'},${l.lastHeartbeat || ''}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'licences.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Licences
          {data && <span className="ml-2 text-base text-gray-500 font-normal">({data.pagination.total})</span>}
        </h1>
        <div className="flex gap-2">
          <button onClick={exportCsv}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => navigate('/generate')}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Générer
          </button>
        </div>
      </div>

      <form onSubmit={doSearch} className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10" placeholder="Clé, email, HWID..." />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="w-40">
          <option value="">Tous statuts</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expirée</option>
          <option value="BANNED">Bannie</option>
          <option value="SUSPENDED">Suspendue</option>
        </select>
        <select value={plan} onChange={e => { setPlan(e.target.value); setPage(1); }} className="w-36">
          <option value="">Tous plans</option>
          <option value="DAYS_30">30 jours</option>
          <option value="DAYS_90">90 jours</option>
          <option value="DAYS_365">1 an</option>
          <option value="LIFETIME">Lifetime</option>
        </select>
      </form>

      {loading ? <Loading /> : !data?.data?.length ? (
        <div className="text-center text-gray-500 py-12">Aucune licence trouvée</div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="px-4 py-3">Clé</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">HWID</th>
                  <th className="px-4 py-3">Dernier HB</th>
                  <th className="px-4 py-3">Expire</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(lic => (
                  <tr key={lic.id} onClick={() => navigate(`/licenses/${lic.id}`)}
                    className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs text-cyan-400">{lic.licenseKey}</td>
                    <td className="px-4 py-3">{formatPlan(lic.plan)}</td>
                    <td className="px-4 py-3"><StatusBadge status={lic.status} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{lic.hwid ? lic.hwid.substring(0, 12) + '...' : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(lic.lastHeartbeat)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{lic.expiresAt ? formatDate(lic.expiresAt) : 'Lifetime'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <span>{data.pagination.total} licences — Page {page}/{data.pagination.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  License Detail
// ══════════════════════════════════════════════════════
function LicenseDetailPage({ id, navigate }) {
  const [lic, setLic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [banReason, setBanReason] = useState('');
  const [extendDays, setExtendDays] = useState(30);

  const load = useCallback(() => {
    setLoading(true);
    api.getLicense(id).then(setLic).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action) => {
    setActionLoading(action);
    try {
      if (action === 'ban')        await api.banLicense(id, banReason || 'Banned by admin');
      else if (action === 'unban')      await api.unbanLicense(id);
      else if (action === 'resetHwid')  await api.resetHwid(id);
      else if (action === 'extend')     await api.extendLicense(id, extendDays);
      else if (action === 'delete') {
        if (!confirm('Supprimer définitivement cette licence ?')) return;
        await api.deleteLicense(id);
        navigate('/licenses'); return;
      }
      load();
    } catch (err) { alert(err.message); }
    finally { setActionLoading(''); }
  };

  if (loading) return <Loading />;
  if (!lic) return <p className="text-gray-500">Licence introuvable</p>;

  return (
    <div>
      <button onClick={() => navigate('/licenses')} className="text-gray-400 hover:text-white text-sm mb-4 flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold font-mono">{lic.licenseKey}</h1>
        <StatusBadge status={lic.status} />
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <InfoCard label="Plan" value={formatPlan(lic.plan)} />
        <InfoCard label="Créée" value={formatDate(lic.createdAt)} />
        <InfoCard label="Expire" value={lic.expiresAt ? formatDate(lic.expiresAt) : 'Lifetime'} />
        <InfoCard label="HWID" value={lic.hwid || '— Non liée —'} mono />
        <InfoCard label="Email" value={lic.email || '—'} />
        <InfoCard label="Dernière IP" value={lic.lastIp || '—'} mono />
        <InfoCard label="Activations" value={`${lic.activationCount} / ${lic.maxActivations}`} />
        <InfoCard label="Dernier Heartbeat" value={formatDate(lic.lastHeartbeat)} />
        <InfoCard label="HWID liée le" value={formatDate(lic.hwidBoundAt)} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {lic.status !== 'BANNED' ? (
            <div className="space-y-2">
              <input type="text" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Raison du ban..." className="w-full text-sm" />
              <button onClick={() => doAction('ban')} disabled={!!actionLoading}
                className="w-full bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2">
                <Ban className="w-4 h-4" /> {actionLoading === 'ban' ? '...' : 'Bannir'}
              </button>
            </div>
          ) : (
            <button onClick={() => doAction('unban')} disabled={!!actionLoading}
              className="bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> {actionLoading === 'unban' ? '...' : 'Débannir'}
            </button>
          )}
          <button onClick={() => doAction('resetHwid')} disabled={!!actionLoading}
            className="bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2">
            <Cpu className="w-4 h-4" /> {actionLoading === 'resetHwid' ? '...' : 'Reset HWID'}
          </button>
          <div className="space-y-2">
            <input type="number" value={extendDays} onChange={e => setExtendDays(parseInt(e.target.value) || 0)} min="1" max="3650" className="w-full text-sm" />
            <button onClick={() => doAction('extend')} disabled={!!actionLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" /> {actionLoading === 'extend' ? '...' : `Étendre ${extendDays}j`}
            </button>
          </div>
          <button onClick={() => doAction('delete')} disabled={!!actionLoading}
            className="bg-gray-700 hover:bg-red-700 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> {actionLoading === 'delete' ? '...' : 'Supprimer'}
          </button>
        </div>
      </div>

      {lic.activations?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Historique des Activations</h2>
          <div className="space-y-2 max-h-80 overflow-auto">
            {lic.activations.map(a => (
              <div key={a.id} className="flex items-center gap-3 text-sm bg-gray-800/50 rounded-lg p-3">
                <StatusBadge status={a.status} small />
                <span className="font-mono text-xs text-gray-400">{a.ipAddress}</span>
                <span className="font-mono text-xs text-gray-500">{a.hwid?.substring(0, 12)}...</span>
                <span className="ml-auto text-xs text-gray-500">{formatDate(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {lic.logs?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Logs</h2>
          <div className="space-y-1 max-h-60 overflow-auto text-xs font-mono">
            {lic.logs.map(l => (
              <div key={l.id} className="flex gap-3 text-gray-400 py-1">
                <span className="text-gray-600 w-36 shrink-0">{formatDate(l.createdAt)}</span>
                <span className="text-cyan-400 w-32 shrink-0">{l.action}</span>
                <span className="text-gray-500">{l.ipAddress || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Generate Keys
// ══════════════════════════════════════════════════════
// ── Plan icons pour le dropdown de génération ──
const PLAN_ICON_MAP = {
  DAYS_1:   { emoji: '⚡', label: '1 jour' },
  DAYS_7:   { emoji: '📅', label: '7 jours' },
  DAYS_14:  { emoji: '📅', label: '14 jours' },
  DAYS_30:  { emoji: '🗓️', label: '30 jours' },
  DAYS_90:  { emoji: '🗓️', label: '90 jours' },
  DAYS_365: { emoji: '⭐', label: '1 an' },
  LIFETIME: { emoji: '♾️', label: 'Illimité' },
};

function planEmoji(key) { return PLAN_ICON_MAP[key]?.emoji || '🔑'; }
function planLabel(key) { return PLAN_ICON_MAP[key]?.label || key; }

// ── Custom plan dropdown avec icones ──
function PlanDropdown({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.key === value) || options[0];
  if (!selected) return null;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 bg-gray-800 border border-gray-700 hover:border-cyan-600 rounded-lg px-3 py-2.5 text-left transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xl leading-none">{selected.emoji}</span>
          <div>
            <div className="text-sm font-medium text-white">{selected.name}</div>
            <div className="text-xs text-gray-500">{selected.sub}</div>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
          {options.map(opt => (
            <button key={opt.key} type="button"
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left ${value === opt.key ? 'bg-gray-800' : ''}`}>
              <span className="text-xl leading-none">{opt.emoji}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{opt.name}</div>
                <div className="text-xs text-gray-500">{opt.sub}</div>
              </div>
              {value === opt.key && <div className="w-2 h-2 rounded-full bg-cyan-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Plans fixes disponibles pour la génération (tous dans l'enum Prisma)
const GENERATE_PLANS = [
  { key: 'DAYS_1',   name: '1 Jour',    emoji: planEmoji('DAYS_1'),   sub: planLabel('DAYS_1') },
  { key: 'DAYS_7',   name: '7 Jours',   emoji: planEmoji('DAYS_7'),   sub: planLabel('DAYS_7') },
  { key: 'DAYS_14',  name: '14 Jours',  emoji: planEmoji('DAYS_14'),  sub: planLabel('DAYS_14') },
  { key: 'DAYS_30',  name: '30 Jours',  emoji: planEmoji('DAYS_30'),  sub: planLabel('DAYS_30') },
  { key: 'DAYS_90',  name: '90 Jours',  emoji: planEmoji('DAYS_90'),  sub: planLabel('DAYS_90') },
  { key: 'DAYS_365', name: '1 An',      emoji: planEmoji('DAYS_365'), sub: planLabel('DAYS_365') },
  { key: 'LIFETIME', name: 'Lifetime',  emoji: planEmoji('LIFETIME'), sub: planLabel('LIFETIME') },
];

function GeneratePage() {
  const [plan, setPlan] = useState('DAYS_30');
  const [count, setCount] = useState(1);
  const [email, setEmail] = useState('');
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('single');
  const [copiedAll, setCopiedAll] = useState(false);

  const handleGenerate = async () => {
    setLoading(true); setKeys([]);
    try {
      if (mode === 'batch') {
        const data = await api.generateBatch({ plan, count: parseInt(count) || 1 });
        setKeys(data.keys);
      } else {
        const data = await api.createLicense({ plan, email: email || undefined });
        setKeys([data.licenseKey]);
      }
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(keys.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Générer des Clés</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 max-w-lg mb-6">
        <div className="flex gap-2 mb-5">
          <button onClick={() => setMode('single')}
            className={`px-4 py-2 rounded-lg text-sm ${mode === 'single' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
            Clé unique
          </button>
          <button onClick={() => setMode('batch')}
            className={`px-4 py-2 rounded-lg text-sm ${mode === 'batch' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
            Lot (batch)
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Plan</label>
            <PlanDropdown options={GENERATE_PLANS} value={plan} onChange={setPlan} />
          </div>

          {mode === 'batch' ? (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre de clés</label>
              <input type="number" value={count} onChange={e => setCount(e.target.value)} min="1" max="500" className="w-full" />
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email (optionnel)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full" placeholder="client@email.com" />
            </div>
          )}

          <button onClick={handleGenerate} disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white py-2.5 rounded-lg font-medium">
            {loading ? 'Génération...' : `Générer ${mode === 'batch' ? (count + ' clé(s)') : 'la clé'}`}
          </button>
        </div>
      </div>

      {keys.length > 0 && (
        <div className="bg-gray-900 border border-green-800/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-green-400">{keys.length} clé(s) générée(s)</h2>
            <button onClick={handleCopyAll}
              className={`text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${copiedAll ? 'bg-green-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}>
              {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedAll ? 'Copié !' : 'Copier tout'}
            </button>
          </div>
          <div className="bg-gray-950 rounded-lg p-3 font-mono text-sm max-h-80 overflow-auto space-y-1">
            {keys.map((k, i) => (
              <div key={i} className="text-cyan-400 hover:bg-gray-800 px-2 py-1 rounded cursor-pointer flex items-center justify-between group"
                onClick={() => navigator.clipboard.writeText(k)}>
                <span>{k}</span>
                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Logs
// ══════════════════════════════════════════════════════
function LogsPage() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getLogs({ page, limit: 50 }).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [page]);

  const filtered = data?.data?.filter(l => !actionFilter || l.action.includes(actionFilter)) || [];

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Logs d'Activation</h1>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="w-48">
          <option value="">Toutes les actions</option>
          <option value="success">Succès</option>
          <option value="ban">Ban</option>
          <option value="reset">Reset</option>
          <option value="hwid">HWID</option>
        </select>
      </div>

      {!filtered.length ? <p className="text-gray-500">Aucun log</p> : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Clé</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id} className="border-b border-gray-800/50">
                    <td className="px-4 py-2 text-xs text-gray-400">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        log.action.includes('success') ? 'bg-green-500/10 text-green-400' :
                        log.action.includes('ban') ? 'bg-red-500/10 text-red-400' :
                        log.action.includes('reset') ? 'bg-amber-500/10 text-amber-400' :
                        'bg-gray-500/10 text-gray-400'}`}>{log.action}</span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{log.license?.licenseKey || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{log.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <span>Page {page}/{data.pagination.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Shared Components
// ══════════════════════════════════════════════════════
function StatusBadge({ status, small = false }) {
  const map = {
    ACTIVE:        { bg: 'bg-green-500/10 text-green-400',    label: 'Active' },
    SUCCESS:       { bg: 'bg-green-500/10 text-green-400',    label: 'Succès' },
    EXPIRED:       { bg: 'bg-yellow-500/10 text-yellow-400',  label: 'Expirée' },
    BANNED:        { bg: 'bg-red-500/10 text-red-400',        label: 'Bannie' },
    SUSPENDED:     { bg: 'bg-orange-500/10 text-orange-400',  label: 'Suspendue' },
    HWID_MISMATCH: { bg: 'bg-red-500/10 text-red-400',        label: 'HWID ≠' },
    INVALID_KEY:   { bg: 'bg-red-500/10 text-red-400',        label: 'Invalide' },
    RATE_LIMITED:  { bg: 'bg-yellow-500/10 text-yellow-400',  label: 'Rate Limited' },
  };
  const s = map[status] || { bg: 'bg-gray-500/10 text-gray-400', label: status };
  return (
    <span className={`${s.bg} ${small ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'} rounded-full font-medium`}>
      {s.label}
    </span>
  );
}

function OrderStatusBadge({ status }) {
  const map = {
    COMPLETED: 'bg-green-500/10 text-green-400',
    PENDING:   'bg-yellow-500/10 text-yellow-400',
    FAILED:    'bg-red-500/10 text-red-400',
    REFUNDED:  'bg-blue-500/10 text-blue-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-500/10 text-gray-400'}`}>
      {status}
    </span>
  );
}

function InfoCard({ label, value, mono = false }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono text-xs break-all' : ''} ${!value || value === '—' || value === '— Non liée —' ? 'text-gray-600' : ''}`}>
        {value || '—'}
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Software Management Page
// ══════════════════════════════════════════════════════
function SoftwarePage() {
  const [stats, setStats] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [file, setFile] = useState(null);
  const [version, setVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, v] = await Promise.all([
        api.getSoftwareStats(),
        api.getSoftwareVersions(),
      ]);
      setStats(s);
      setVersions(v);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { setUploadError('Sélectionnez un fichier .exe'); return; }
    if (!version.trim()) { setUploadError('La version est requise (ex: 1.3.0)'); return; }
    if (!changelog.trim()) { setUploadError('Le changelog est requis'); return; }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('version', version.trim());
      formData.append('changelog', changelog.trim());

      const result = await api.uploadSoftware(formData);
      setUploadSuccess(`Version ${result.version} uploadée — URL de téléchargement mise à jour.`);
      setFile(null);
      setVersion('');
      setChangelog('');
      const input = document.getElementById('software-file-input');
      if (input) input.value = '';
      await load();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const [deletingVersion, setDeletingVersion] = useState(null);

  const handleDelete = async (version) => {
    if (!window.confirm(`Supprimer la version ${version} et son fichier .exe ?`)) return;
    setDeletingVersion(version);
    try {
      await api.deleteSoftwareVersion(version);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingVersion(null);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestion du Logiciel</h1>
        <button onClick={load}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Téléchargements Total</span>
              <Download className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-2xl font-bold">{stats.totalDownloads ?? 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Aujourd'hui</span>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-400">
              {stats.dailyDownloads?.at(-1)?.count ?? 0}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Versions publiées</span>
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-400">{versions.length}</p>
          </div>
        </div>
      )}

      {/* Downloads LineChart */}
      {stats?.dailyDownloads?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Téléchargements (30 derniers jours)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.dailyDownloads}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }}
                tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelFormatter={(d) => `Date: ${d}`}
                formatter={(v) => [v, 'Téléchargements']}
              />
              <Line type="monotone" dataKey="count" stroke="#06b6d4"
                strokeWidth={2} dot={false} name="Téléchargements" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Upload Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" /> Publier une version
          </h2>

          {uploadSuccess && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-4">
              {uploadSuccess}
            </div>
          )}
          {uploadError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">
              {uploadError}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Fichier .exe</label>
              <input
                id="software-file-input"
                type="file"
                accept=".exe"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3
                  file:rounded file:border-0 file:text-sm file:bg-gray-700
                  file:text-gray-300 hover:file:bg-gray-600 cursor-pointer"
              />
              {file && (
                <p className="text-xs text-gray-500 mt-1">
                  {file.name} — {formatSize(file.size)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Version (ex: 1.3.0)</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.3.0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Changelog</label>
              <textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                rows={4}
                placeholder={"- Correction du crash au démarrage\n- Amélioration des performances..."}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button type="submit" disabled={uploading}
              className="w-full flex items-center justify-center gap-2 bg-cyan-600
                hover:bg-cyan-500 disabled:bg-gray-700 text-white font-medium
                py-2.5 rounded-lg transition-colors">
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Publier
                </>
              )}
            </button>
          </form>
        </div>

        {/* Activations by version */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" /> Activations par version
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Le tracking par version sera disponible lorsque le client C++ enverra sa version.
          </p>
          {stats?.activationsByVersion?.length > 0 ? (
            <div className="space-y-2">
              {stats.activationsByVersion.map((v) => (
                <div key={v.version} className="flex items-center justify-between
                  bg-gray-800 rounded-lg px-3 py-2 text-sm">
                  <span className="font-mono text-cyan-400">v{v.version}</span>
                  <span className="text-gray-400">{v.count} activation(s)</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600 text-sm">
              Aucune version publiée
            </div>
          )}
        </div>
      </div>

      {/* Version History Table */}
      {versions.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Historique des versions</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left">
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Fichier</th>
                <th className="px-4 py-3">Taille</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Changelog</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v, idx) => (
                <tr key={v.version} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <span className="font-mono text-cyan-400">v{v.version}</span>
                    {idx === 0 && (
                      <span className="ml-2 text-xs bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full">
                        Actuelle
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{v.filename}</td>
                  <td className="px-4 py-3 text-gray-400">{formatSize(v.size)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(v.uploadedAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={v.changelog}>
                    {v.changelog}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(v.version)}
                      disabled={deletingVersion === v.version}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300
                        disabled:opacity-40 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {deletingVersion === v.version ? '...' : 'Supprimer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {versions.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
          <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune version publiée. Uploadez votre premier .exe ci-dessus.</p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  Bot Discord Page
// ══════════════════════════════════════════════════════
function StarDisplay({ count }) {
  return (
    <span className="text-yellow-400 text-sm">
      {'★'.repeat(count)}{'☆'.repeat(5 - count)}
    </span>
  );
}

function BotPage() {
  const [tab, setTab]           = useState('reviews');
  const [reviews, setReviews]   = useState([]);
  const [loadingR, setLoadingR] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const [config, setConfig]     = useState(null);
  const [loadingC, setLoadingC] = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    api.getAdminReviews()
      .then(setReviews)
      .catch(console.error)
      .finally(() => setLoadingR(false));
    api.getBotConfig()
      .then(setConfig)
      .catch(console.error)
      .finally(() => setLoadingC(false));
  }, []);

  const handleDelete = async (discordId, username) => {
    if (!confirm(`Supprimer l'avis de ${username} ?`)) return;
    setDeleting(discordId);
    try {
      await api.deleteReview(discordId);
      setReviews(r => r.filter(x => x.discordId !== discordId));
    } catch (err) { alert(err.message); }
    finally { setDeleting(null); }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const updated = await api.updateBotConfig(config);
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1)
    : null;

  const TABS = [
    { id: 'reviews', label: 'Avis clients', icon: Star },
    { id: 'config',  label: 'Configuration embeds', icon: Settings },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-cyan-400" /> Bot Discord
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-800">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${tab === t.id
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Avis ── */}
      {tab === 'reviews' && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Total avis</p>
              <p className="text-2xl font-bold text-cyan-400">{reviews.length}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Note moyenne</p>
              <p className="text-2xl font-bold text-yellow-400">{avg ? `${avg} / 5` : '—'}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">5 étoiles</p>
              <p className="text-2xl font-bold text-green-400">
                {reviews.filter(r => r.stars === 5).length}
              </p>
            </div>
          </div>

          {/* Table */}
          {loadingR ? <Loading /> : reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucun avis pour l'instant.</p>
              <p className="text-xs mt-1">Les avis soumis via Discord apparaîtront ici.</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400 uppercase bg-gray-800/60">
                  <tr>
                    <th className="px-4 py-3 text-left">Auteur</th>
                    <th className="px-4 py-3 text-left">Note</th>
                    <th className="px-4 py-3 text-left">Avis</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map(r => (
                    <tr key={r.discordId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-200">{r.username}</p>
                        <p className="text-xs text-gray-500">{r.description}</p>
                      </td>
                      <td className="px-4 py-3"><StarDisplay count={r.stars} /></td>
                      <td className="px-4 py-3 text-gray-400 max-w-sm">
                        <p className="truncate" title={r.text}>"{r.text}"</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {r.createdAt ? formatDate(r.createdAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(r.discordId, r.username)}
                          disabled={deleting === r.discordId}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300
                            disabled:opacity-40 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors">
                          <Trash2 className="w-3 h-3" />
                          {deleting === r.discordId ? '...' : 'Supprimer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Config ── */}
      {tab === 'config' && (
        <div>
          {loadingC ? <Loading /> : !config ? (
            <p className="text-gray-500">Impossible de charger la configuration.</p>
          ) : (
            <div className="space-y-6 max-w-2xl">
              {/* Welcome channel */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" /> Message de bienvenue — Salon
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Titre <span className="text-gray-600">({'{username}'} = pseudo Discord)</span></label>
                    <input type="text" value={config.welcome_channel_title || ''}
                      onChange={e => setConfig(c => ({ ...c, welcome_channel_title: e.target.value }))}
                      className="w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Description <span className="text-gray-600">(Markdown supporté)</span></label>
                    <textarea rows={6} value={config.welcome_channel_desc || ''}
                      onChange={e => setConfig(c => ({ ...c, welcome_channel_desc: e.target.value }))}
                      className="w-full text-sm resize-y font-mono" />
                  </div>
                </div>
              </div>

              {/* Welcome DM */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" /> Message de bienvenue — DM privé
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Titre</label>
                    <input type="text" value={config.welcome_dm_title || ''}
                      onChange={e => setConfig(c => ({ ...c, welcome_dm_title: e.target.value }))}
                      className="w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <textarea rows={5} value={config.welcome_dm_desc || ''}
                      onChange={e => setConfig(c => ({ ...c, welcome_dm_desc: e.target.value }))}
                      className="w-full text-sm resize-y font-mono" />
                  </div>
                </div>
              </div>

              {/* Setup avis */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" /> Embed "Donner un avis"
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Titre</label>
                    <input type="text" value={config.setup_avis_title || ''}
                      onChange={e => setConfig(c => ({ ...c, setup_avis_title: e.target.value }))}
                      className="w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <textarea rows={4} value={config.setup_avis_desc || ''}
                      onChange={e => setConfig(c => ({ ...c, setup_avis_desc: e.target.value }))}
                      className="w-full text-sm resize-y font-mono" />
                  </div>
                </div>
              </div>

              <button onClick={handleSaveConfig} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400
                  disabled:opacity-50 text-black font-semibold rounded-lg transition-colors text-sm">
                {saving ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : saved ? (
                  <><Check className="w-4 h-4" /> Sauvegardé !</>
                ) : (
                  <><Save className="w-4 h-4" /> Sauvegarder</>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function formatPlan(plan) {
  const map = { DAYS_30: '30 jours', DAYS_90: '90 jours', DAYS_365: '1 an', LIFETIME: 'Lifetime' };
  return map[plan] || plan;
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}