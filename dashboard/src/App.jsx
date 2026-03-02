import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShoppingCart } from 'lucide-react';
import { api } from './lib/api';

// Components
import Sidebar from './components/Sidebar';

// Pages
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ActivityPage from './pages/ActivityPage';
import LicensesPage from './pages/LicensesPage';
import LicenseDetailPage from './pages/LicenseDetailPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import OrdersPage from './pages/OrdersPage';
import PlansPage from './pages/PlansPage';
import GeneratePage from './pages/GeneratePage';
import SoftwarePage from './pages/SoftwarePage';
import ImagesPage from './pages/ImagesPage';
import BotPage from './pages/BotPage';
import PromoCodesPage from './pages/PromoCodesPage';
import BlockedIPsPage from './pages/BlockedIPsPage';
import LogsPage from './pages/LogsPage';
import SettingsPage from './pages/SettingsPage';

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
//  useNewOrderNotifier — polls stats every 30s, fires cb on new revenue
// ══════════════════════════════════════════════════════
function useNewOrderNotifier(enabled, onNewOrder) {
  const prevTotal = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    const check = async () => {
      try {
        const stats = await api.getStats();
        const total = stats.revenue?.total ?? 0;
        if (prevTotal.current !== null && total > prevTotal.current) {
          onNewOrder(total - prevTotal.current);
        }
        prevTotal.current = total;
      } catch {}
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [enabled]);
}

// ══════════════════════════════════════════════════════
//  Login Page (kept inline — small enough)
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
//  App Root
// ══════════════════════════════════════════════════════
export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('admin_token'));
  const [orderToast, setOrderToast] = useState(null);
  const { path, navigate } = useRouter();

  useNewOrderNotifier(authed, (amount) => {
    setOrderToast(amount);
    setTimeout(() => setOrderToast(null), 6000);
  });

  if (!authed) return <LoginPage onLogin={() => { setAuthed(true); navigate('/'); }} />;
  const logout = () => { api.clearToken(); setAuthed(false); };

  let page;
  if (path.startsWith('/licenses/'))       page = <LicenseDetailPage id={path.split('/')[2]} navigate={navigate} />;
  else if (path.startsWith('/customers/')) page = <CustomerDetailPage id={path.split('/')[2]} navigate={navigate} />;
  else if (path === '/licenses')           page = <LicensesPage navigate={navigate} />;
  else if (path === '/customers')          page = <CustomersPage navigate={navigate} />;
  else if (path === '/orders')             page = <OrdersPage navigate={navigate} />;
  else if (path === '/analytics')          page = <AnalyticsPage />;
  else if (path === '/activity')           page = <ActivityPage />;
  else if (path === '/plans')              page = <PlansPage />;
  else if (path === '/generate')           page = <GeneratePage />;
  else if (path === '/blocked-ips')        page = <BlockedIPsPage />;
  else if (path === '/logs')               page = <LogsPage />;
  else if (path === '/settings')           page = <SettingsPage />;
  else if (path === '/images')             page = <ImagesPage />;
  else if (path === '/software')           page = <SoftwarePage />;
  else if (path === '/bot')                page = <BotPage />;
  else if (path === '/promo-codes')        page = <PromoCodesPage />;
  else                                     page = <DashboardPage navigate={navigate} />;

  return (
    <div className="flex min-h-screen">
      <Sidebar path={path} navigate={navigate} onLogout={logout} />
      <main className="flex-1 min-w-0 p-4 lg:p-6 overflow-auto pt-16 lg:pt-6">{page}</main>

      {/* New order notification toast */}
      {orderToast !== null && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 bg-green-700 border border-green-500/40 text-white px-5 py-3 rounded-xl shadow-2xl z-50 text-sm font-medium">
          <ShoppingCart className="w-5 h-5 shrink-0" />
          <span>Nouvelle vente : <strong>+{(orderToast / 100).toFixed(2)}€</strong></span>
          <button onClick={() => setOrderToast(null)} className="ml-1 opacity-70 hover:opacity-100 text-white">✕</button>
        </div>
      )}
    </div>
  );
}
