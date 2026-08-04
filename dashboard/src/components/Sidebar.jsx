import React, { useState, useEffect } from 'react';
import {
  Shield, BarChart3, Activity, Key, Users, ShoppingCart, Package,
  Plus, Upload, Image, MessageSquare, Tag, AlertTriangle, Clock,
  Settings, LogOut, Globe, Menu, X, Server, Gamepad2, Skull, TrendingUp, UserCheck, Store, Cpu, Box, Sparkles, Bug,
} from 'lucide-react';

export default function Sidebar({ path, navigate, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close on route change
  useEffect(() => { setMobileOpen(false); }, [path]);

  const items = [
    { icon: BarChart3,     label: 'Dashboard',       p: '/' },
    { icon: Activity,      label: 'Analytiques',     p: '/analytics' },
    { icon: Globe,         label: 'Activité site',   p: '/activity' },
    { icon: Key,           label: 'Licences',        p: '/licenses' },
    { icon: Users,         label: 'Utilisateurs',    p: '/customers' },
    { icon: ShoppingCart,  label: 'Commandes',       p: '/orders' },
    { icon: Package,       label: 'Plans',           p: '/plans-hub' },
    { icon: Plus,          label: 'Générer',         p: '/generate' },
    { icon: Upload,        label: 'Upload',          p: '/upload' },
    { icon: Gamepad2,      label: 'Shop',            p: '/shop-content' },
    { icon: Sparkles,      label: 'Pokémon',         p: '/pokemon' },
    { icon: Server,        label: 'Serveurs',         p: '/servers' },
    { icon: MessageSquare, label: 'Bot Discord',     p: '/bot' },
    { icon: Box,           label: 'Minecraft',       p: '/minecraft' },
    { icon: Tag,           label: 'Codes Promo',     p: '/promo-codes' },
    { icon: UserCheck,     label: 'Affiliés',        p: '/affiliates' },
    { icon: Store,         label: 'Resellers',       p: '/resellers' },
    { icon: TrendingUp,    label: 'Metrics',          p: '/metrics' },
    { icon: Cpu,           label: 'Kernel Symbols',   p: '/kernel-symbols' },
    { icon: Bug,           label: 'Crash Reports',    p: '/crash-dumps' },
    { icon: Skull,         label: 'Kill Switch',      p: '/kill-switch' },
    { icon: AlertTriangle, label: 'IPs Bloquées',    p: '/blocked-ips' },
    { icon: Clock,         label: 'Logs',            p: '/logs' },
    { icon: Settings,      label: 'Paramètres',      p: '/settings' },
  ];

  const NavContent = () => (
    <>
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-cyan-400" />
          <span className="font-bold text-cyan-400">FnOptimizer</span>
        </div>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
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
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 hover:text-white shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-60 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-gray-900 border-r border-gray-800 flex-col shrink-0">
        <NavContent />
      </aside>
    </>
  );
}
