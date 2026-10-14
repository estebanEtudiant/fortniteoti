import React, { useState, useEffect } from 'react';
import { Shield, LogOut, Menu, X, ChevronRight, Search } from 'lucide-react';
import { NAV_GROUPS as GROUPS } from '../lib/navIndex';

const DEFAULT_OPEN = { overview: true, sales: true, products: true, security: false, system: false };
const STORAGE_KEY = 'dashboard_sidebar_groups';

function loadOpenGroups() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_OPEN, ...JSON.parse(raw) } : { ...DEFAULT_OPEN };
  } catch { return { ...DEFAULT_OPEN }; }
}

function isActive(path, p) {
  return path === p || (p !== '/' && path.startsWith(p));
}

export default function Sidebar({ path, navigate, onLogout, onOpenSearch }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(loadOpenGroups);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [path]);

  // Auto-expand whichever group contains the current route
  useEffect(() => {
    const activeGroup = GROUPS.find(g => g.items.some(it => isActive(path, it.p)));
    if (activeGroup) {
      setOpenGroups(prev => (prev[activeGroup.id] ? prev : { ...prev, [activeGroup.id]: true }));
    }
  }, [path]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups)); } catch {}
  }, [openGroups]);

  const toggleGroup = (id) => setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const NavContent = () => (
    <>
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-cyan-400" />
          <span className="font-bold text-cyan-400">404</span>
        </div>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-3 border-b border-gray-800">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 bg-gray-800/60 hover:bg-gray-800 hover:text-gray-200 border border-gray-800"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Rechercher...</span>
          <kbd className="text-[10px] font-mono bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-gray-500">⌘K</kbd>
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {GROUPS.map(group => {
          const open = !!openGroups[group.id];
          return (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-300"
              >
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${open ? 'rotate-90' : ''}`} />
                {group.label}
              </button>
              {open && (
                <div className="space-y-0.5 mb-1">
                  {group.items.map(({ icon: Icon, label, p }) => (
                    <button key={p} onClick={() => navigate(p)}
                      className={`w-full flex items-center gap-3 pl-7 pr-3 py-2 rounded-lg text-sm
                        ${isActive(path, p)
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
                      <Icon className="w-4 h-4 shrink-0" />{label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
