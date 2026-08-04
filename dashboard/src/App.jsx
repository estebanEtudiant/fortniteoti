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
import NgPlansPage from './pages/NgPlansPage';
import GeneratePage from './pages/GeneratePage';
import SoftwarePage from './pages/SoftwarePage';
import NgLoaderPage from './pages/NgLoaderPage';
import MenoriaPage from './pages/MenoriaPage';
import MenoriaPlansPage from './pages/MenoriaPlansPage';
import ImagesPage from './pages/ImagesPage';
import BotPage from './pages/BotPage';
import PromoCodesPage from './pages/PromoCodesPage';
import ServersPage from './pages/ServersPage';
import BlockedIPsPage from './pages/BlockedIPsPage';
import LogsPage from './pages/LogsPage';
import SettingsPage from './pages/SettingsPage';
import GalleryPage from './pages/GalleryPage';
import VeltharPage from './pages/VeltharPage';
import VeltharPlansPage from './pages/VeltharPlansPage';
import UploadPage from './pages/UploadPage';
import PlansHubPage from './pages/PlansHubPage';
import ShopContentPage from './pages/ShopContentPage';
import PokemonPage from './pages/PokemonPage';
import KillSwitchPage from './pages/KillSwitchPage';
import MetricsPage from './pages/MetricsPage';
import AffiliatesPage from './pages/AffiliatesPage';
import ResellersPage from './pages/ResellersPage';
import KernelSymbolsPage from './pages/KernelSymbolsPage';
import CrashDumpsPage from './pages/CrashDumpsPage';
import MinecraftPage from './pages/MinecraftPage';

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
  const [totp, setTotp] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = await api.login(username, password, needs2fa ? totp : undefined);
      api.setToken(data.token); onLogin();
    } catch (err) {
      const msg = err.message || 'Identifiants incorrects';
      if (msg === '2FA_REQUIRED') {
        // Password OK — reveal the 2FA field
        setNeeds2fa(true);
        setError('');
      } else {
        setError(msg);
      }
    } finally { setLoading(false); }
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
          {!needs2fa ? (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Utilisateur</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full" placeholder="admin" autoFocus required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Mot de passe</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full" required />
              </div>
            </>
          ) : (
            <div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm rounded-lg px-3 py-2 mb-3">
                Entrez le code à 6 chiffres de votre application d'authentification.
              </div>
              <label className="block text-sm text-gray-400 mb-1">Code 2FA</label>
              <input
                type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                value={totp} onChange={e => setTotp(e.target.value.replace(/\D/g, ''))}
                className="w-full tracking-[0.5em] text-center text-lg font-mono" placeholder="••••••" autoFocus required
              />
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white font-medium py-2.5 rounded-lg">
            {loading ? 'Connexion...' : (needs2fa ? 'Vérifier' : 'Se connecter')}
          </button>
          {needs2fa && (
            <button type="button" onClick={() => { setNeeds2fa(false); setTotp(''); setError(''); }}
              className="w-full text-gray-500 hover:text-gray-300 text-sm">
              ← Retour
            </button>
          )}
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
  else if (path === '/ng-plans')           page = <NgPlansPage />;
  else if (path === '/generate')           page = <GeneratePage />;
  else if (path === '/upload')             page = <UploadPage navigate={navigate} />;
  else if (path === '/plans-hub')          page = <PlansHubPage />;
  else if (path === '/shop-content')       page = <ShopContentPage />;
  else if (path === '/pokemon')            page = <PokemonPage />;
  else if (path === '/kill-switch')         page = <KillSwitchPage />;
  else if (path === '/metrics')            page = <MetricsPage navigate={navigate} />;
  else if (path === '/blocked-ips')        page = <BlockedIPsPage />;
  else if (path === '/logs')               page = <LogsPage />;
  else if (path === '/settings')           page = <SettingsPage />;
  else if (path === '/images')             page = <ImagesPage />;
  else if (path === '/gallery')            page = <GalleryPage navigate={navigate} />;
  else if (path === '/software')           page = <SoftwarePage />;
  else if (path === '/ng-loader')          page = <NgLoaderPage />;
  else if (path === '/velthar')            page = <VeltharPage />;
  else if (path === '/velthar-plans')      page = <VeltharPlansPage />;
  else if (path === '/menoria')            page = <MenoriaPage />;
  else if (path === '/menoria-plans')      page = <MenoriaPlansPage />;
  else if (path === '/bot')                page = <BotPage />;
  else if (path === '/promo-codes')        page = <PromoCodesPage />;
  else if (path === '/affiliates')        page = <AffiliatesPage />;
  else if (path === '/resellers')         page = <ResellersPage />;
  else if (path === '/kernel-symbols')   page = <KernelSymbolsPage />;
  else if (path === '/crash-dumps')      page = <CrashDumpsPage />;
  else if (path === '/minecraft')        page = <MinecraftPage />;
  else if (path === '/servers')            page = <ServersPage />;
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
