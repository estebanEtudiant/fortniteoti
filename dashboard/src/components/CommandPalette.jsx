import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, Key, Users, ShoppingCart, CornerDownLeft, ArrowUp, ArrowDown, Loader2,
} from 'lucide-react';
import { api } from '../lib/api';
import { NAV_INDEX } from '../lib/navIndex';
import { formatPlan, formatDate } from '../lib/utils';

// Bridge used by OrdersPage — the hash router can't carry a query string,
// so we stash the term there and OrdersPage picks it up on mount.
const ORDERS_PREFILL_KEY = 'orders_prefill_search';

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function CommandPalette({ open, onClose, navigate }) {
  const [query, setQuery] = useState('');
  const [licenses, setLicenses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const debouncedQuery = useDebounced(query, 250);

  useEffect(() => {
    if (open) {
      setQuery(''); setLicenses([]); setCustomers([]); setOrders([]); setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (!open || debouncedQuery.trim().length < 2) {
      setLicenses([]); setCustomers([]); setOrders([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const q = debouncedQuery.trim();
    Promise.allSettled([
      api.getLicenses({ search: q, limit: 5 }),
      api.getCustomers({ search: q, limit: 5 }),
      api.getOrders({ search: q, limit: 5 }),
    ]).then(([l, c, o]) => {
      if (cancelled) return;
      setLicenses(l.status === 'fulfilled' ? (l.value.data || []) : []);
      setCustomers(c.status === 'fulfilled' ? (c.value.data || []) : []);
      setOrders(o.status === 'fulfilled' ? (o.value.data || []) : []);
    }).finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery, open]);

  const navMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return NAV_INDEX.filter(n => n.label.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  // Flatten every visible row into one list so arrow keys/enter work uniformly
  const rows = useMemo(() => {
    const list = [];
    navMatches.forEach(n => list.push({ kind: 'nav', ...n }));
    licenses.forEach(l => list.push({ kind: 'license', ...l }));
    customers.forEach(c => list.push({ kind: 'customer', ...c }));
    orders.forEach(o => list.push({ kind: 'order', ...o }));
    return list;
  }, [navMatches, licenses, customers, orders]);

  useEffect(() => { setActiveIndex(0); }, [rows.length]);

  const select = useCallback((row) => {
    if (!row) return;
    if (row.kind === 'nav') navigate(row.p);
    else if (row.kind === 'license') navigate(`/licenses/${row.id}`);
    else if (row.kind === 'customer') navigate(`/customers/${row.id}`);
    else if (row.kind === 'order') {
      try { sessionStorage.setItem(ORDERS_PREFILL_KEY, row.customer?.email || row.stripeSessionId || query.trim()); } catch {}
      navigate('/orders');
    }
    onClose();
  }, [navigate, onClose, query]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); select(rows[activeIndex]); }
  };

  if (!open) return null;

  let rowCursor = -1;
  const isRowActive = () => { rowCursor += 1; return rowCursor === activeIndex; };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <Search className="w-4.5 h-4.5 text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Licence, client, commande, page..."
            className="flex-1 bg-transparent border-0 outline-none text-white placeholder-gray-500 text-sm p-0 focus:ring-0"
          />
          {searching && <Loader2 className="w-4 h-4 text-gray-500 animate-spin shrink-0" />}
          <kbd className="text-[10px] font-mono bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-500 shrink-0">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim().length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">Tapez pour rechercher une page, une licence, un client ou une commande.</p>
          )}
          {query.trim().length > 0 && query.trim().length < 2 && (
            <p className="text-center text-gray-500 text-sm py-8">Continuez à taper...</p>
          )}

          {navMatches.length > 0 && (
            <Section label="Navigation">
              {navMatches.map(n => (
                <Row key={`nav-${n.p}`} active={isRowActive()} onClick={() => select({ kind: 'nav', ...n })} icon={n.icon}>
                  <span className="text-gray-200">{n.label}</span>
                  <span className="ml-auto text-xs text-gray-600 font-mono">{n.p}</span>
                </Row>
              ))}
            </Section>
          )}

          {licenses.length > 0 && (
            <Section label="Licences">
              {licenses.map(l => (
                <Row key={`lic-${l.id}`} active={isRowActive()} onClick={() => select({ kind: 'license', ...l })} icon={Key}>
                  <span className="font-mono text-cyan-400 text-sm">{l.licenseKey}</span>
                  <span className="text-xs text-gray-500">{l.email || '—'}</span>
                  <span className="ml-auto text-xs text-gray-600">{formatPlan(l.plan)} · {l.product}</span>
                </Row>
              ))}
            </Section>
          )}

          {customers.length > 0 && (
            <Section label="Utilisateurs">
              {customers.map(c => (
                <Row key={`cus-${c.id}`} active={isRowActive()} onClick={() => select({ kind: 'customer', ...c })} icon={Users}>
                  <span className="text-gray-200 text-sm">{c.username}</span>
                  <span className="text-xs text-gray-500">{c.email}</span>
                  {c.banned && <span className="ml-auto text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">banni</span>}
                </Row>
              ))}
            </Section>
          )}

          {orders.length > 0 && (
            <Section label="Commandes">
              {orders.map(o => (
                <Row key={`ord-${o.id}`} active={isRowActive()} onClick={() => select({ kind: 'order', ...o })} icon={ShoppingCart}>
                  <span className="text-gray-200 text-sm">{o.customer?.username || o.customer?.email || '—'}</span>
                  <span className="text-xs text-gray-500 font-mono">{(o.amount / 100).toFixed(2)}€</span>
                  <span className="ml-auto text-xs text-gray-600">{formatDate(o.createdAt)}</span>
                </Row>
              ))}
            </Section>
          )}

          {debouncedQuery.trim().length >= 2 && !searching && rows.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">Aucun résultat pour « {debouncedQuery} ».</p>
          )}
        </div>

        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-800 text-[11px] text-gray-600">
          <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" /><ArrowDown className="w-3 h-3" /> naviguer</span>
          <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3" /> ouvrir</span>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div className="py-1.5">
      <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">{label}</p>
      {children}
    </div>
  );
}

function Row({ icon: Icon, active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-left ${active ? 'bg-cyan-500/10' : 'hover:bg-gray-800/60'}`}
    >
      {Icon && <Icon className="w-4 h-4 text-gray-500 shrink-0" />}
      {children}
    </button>
  );
}
