import React, { useState, useEffect, useCallback } from 'react';
import { Skull, ShieldOff, RefreshCw, History, Crosshair, User, Hash, Layers } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';

const PRODUCT = 'FORTNITE_CLIENT';

function Toast({ msg, type, onClose }) {
  if (!msg) return null;
  const colors = type === 'error'
    ? 'bg-red-500/10 border-red-500/30 text-red-400'
    : 'bg-green-500/10 border-green-500/30 text-green-400';
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl border shadow-2xl text-sm font-medium ${colors} flex items-center gap-3`}>
      {msg}
      <button onClick={onClose} className="opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

function KillModal({ title, onCancel, onConfirm, children, confirmLabel = 'CONFIRM KILL', confirmColor = 'bg-red-600 hover:bg-red-500' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>
        {children}
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-sm font-medium">
            Cancel
          </button>
          <button onClick={onConfirm} className={`flex-1 ${confirmColor} text-white py-2.5 rounded-lg text-sm font-bold`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TotpInput({ value, onChange }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">Code 2FA (TOTP)</label>
      <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
        value={value} onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white tracking-[0.3em] text-center font-mono focus:outline-none focus:border-red-500"
        placeholder="••••••" />
    </div>
  );
}

function EmergencyKill({ onSuccess }) {
  const [modal, setModal] = useState(false);
  const [reason, setReason] = useState('');
  const [ttl, setTtl] = useState('');
  const [totp, setTotp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (reason.trim().length < 10) { setError('Reason must be at least 10 characters'); return; }
    if (totp.length !== 6) { setError('Enter a valid 6-digit TOTP code'); return; }
    setLoading(true); setError('');
    try {
      const result = await api.killSwitchActivate(PRODUCT, {
        scope: 'all', reason: reason.trim(),
        ttl_hours: ttl ? parseInt(ttl) : undefined,
        totp,
      });
      setModal(false); setReason(''); setTtl(''); setTotp('');
      onSuccess(`Kill activated — ${result.killId?.slice(0, 8)} — ~${result.killed_sessions_estimated} sessions`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skull className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="font-bold text-red-400 text-lg">Emergency Kill Switch</h3>
              <p className="text-xs text-gray-500">Immediately suspend all fortniteclient sessions</p>
            </div>
          </div>
          <button onClick={() => setModal(true)}
            className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-lg text-sm transition-colors shadow-lg shadow-red-500/20">
            KILL ALL — fortniteclient
          </button>
        </div>
      </div>

      {modal && (
        <KillModal title="Confirm Emergency Kill" onCancel={() => { setModal(false); setError(''); }} onConfirm={handleConfirm}>
          {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded px-3 py-2 mb-3">{error}</div>}
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Reason (min 10 chars)</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 resize-none"
                placeholder="Why are you killing all sessions?" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">TTL (hours, empty = permanent)</label>
              <input type="number" value={ttl} onChange={e => setTtl(e.target.value)} min="1" max="8760"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                placeholder="e.g. 2 (auto-revoke after 2h)" />
            </div>
            <TotpInput value={totp} onChange={setTotp} />
          </div>
        </KillModal>
      )}
    </>
  );
}

const TABS = [
  { key: 'hwid', label: 'By HWID', icon: Hash, scope: 'hwid' },
  { key: 'user', label: 'By User', icon: User, scope: 'user' },
  { key: 'version', label: 'By Version', icon: Layers, scope: 'version' },
];

function TargetedKill({ onSuccess }) {
  const [tab, setTab] = useState('hwid');
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [ttl, setTtl] = useState('');
  const [totp, setTotp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const current = TABS.find(t => t.key === tab);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!target.trim()) { setError('Target is required'); return; }
    if (reason.trim().length < 10) { setError('Reason must be at least 10 characters'); return; }
    if (totp.length !== 6) { setError('Enter a valid 6-digit TOTP code'); return; }
    setLoading(true); setError('');
    try {
      const result = await api.killSwitchActivate(PRODUCT, {
        scope: current.scope, target: target.trim(), reason: reason.trim(),
        ttl_hours: ttl ? parseInt(ttl) : undefined,
        totp,
      });
      setTarget(''); setReason(''); setTtl(''); setTotp('');
      onSuccess(`Targeted kill activated — ${result.killId?.slice(0, 8)}`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Crosshair className="w-5 h-5 text-amber-400" />
        <h3 className="font-semibold text-white">Targeted Kill</h3>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-800/50 p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
              tab === t.key ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-gray-200'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded px-3 py-2 mb-3">{error}</div>}

      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Target ({current.label.split(' ')[1]})</label>
          <input type="text" value={target} onChange={e => setTarget(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
            placeholder={tab === 'hwid' ? 'SHA256 HWID' : tab === 'user' ? 'License ID' : 'Version string'} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Reason (min 10 chars)</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            placeholder="Reason for kill" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">TTL (hours, empty = permanent)</label>
          <input type="number" value={ttl} onChange={e => setTtl(e.target.value)} min="1" max="8760"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
        </div>
        <TotpInput value={totp} onChange={setTotp} />
        <div className="sm:col-span-2">
          <button type="submit" disabled={loading}
            className="bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors">
            {loading ? 'Activating...' : 'Activate Kill'}
          </button>
        </div>
      </form>
    </div>
  );
}

function KillsTable({ kills, title, active, onRevoke }) {
  if (!kills.length) return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <h3 className="font-semibold text-white mb-3">{title}</h3>
      <p className="text-sm text-gray-600 italic">{active ? 'No active kills' : 'No kill history'}</p>
    </div>
  );

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-gray-800">
        <h3 className="font-semibold text-white">{title} ({kills.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-left">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Scope</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Activated</th>
              <th className="px-4 py-3">{active ? 'Expires' : 'Revoked'}</th>
              {active && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {kills.map(k => {
              const scopeColors = { all: 'text-red-400 bg-red-500/10', hwid: 'text-amber-400 bg-amber-500/10', user: 'text-blue-400 bg-blue-500/10', version: 'text-purple-400 bg-purple-500/10' };
              return (
                <tr key={k.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{k.id?.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${scopeColors[k.scope] || 'text-gray-400 bg-gray-700'}`}>{k.scope}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{k.target || '*'}</td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{k.reason}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(k.activatedAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {active ? (k.expiresAt ? formatDate(k.expiresAt) : 'Never') : formatDate(k.revokedAt)}
                  </td>
                  {active && (
                    <td className="px-4 py-3">
                      <button onClick={() => onRevoke(k)}
                        className="text-xs text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 px-2.5 py-1 rounded transition-colors">
                        Revoke
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function KillSwitchPage() {
  const [activeKills, setActiveKills] = useState([]);
  const [historyKills, setHistoryKills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeTotp, setRevokeTotp] = useState('');
  const [revokeError, setRevokeError] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 5000); };

  const loadKills = useCallback(async () => {
    setLoading(true);
    try {
      const [active, history] = await Promise.all([
        api.killSwitchList(PRODUCT, { active: true }),
        showHistory ? api.killSwitchList(PRODUCT, { active: false }) : Promise.resolve([]),
      ]);
      setActiveKills(active);
      if (showHistory) setHistoryKills(history);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  }, [showHistory]);

  useEffect(() => { loadKills(); }, [loadKills]);

  const handleRevoke = async () => {
    if (revokeReason.trim().length < 3) { setRevokeError('Reason required'); return; }
    if (revokeTotp.length !== 6) { setRevokeError('Enter a valid 6-digit TOTP code'); return; }
    setRevokeLoading(true); setRevokeError('');
    try {
      await api.killSwitchRevoke(PRODUCT, revokeTarget.id, { reason: revokeReason.trim(), totp: revokeTotp });
      setRevokeTarget(null); setRevokeReason(''); setRevokeTotp('');
      showToast('Kill revoked successfully');
      loadKills();
    } catch (err) { setRevokeError(err.message); }
    finally { setRevokeLoading(false); }
  };

  const onActionSuccess = (msg) => { showToast(msg); loadKills(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold">Kill Switch</h2>
        <button onClick={loadKills}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      <EmergencyKill onSuccess={onActionSuccess} />
      <TargetedKill onSuccess={onActionSuccess} />
      <KillsTable kills={activeKills} title="Active Kills" active onRevoke={k => setRevokeTarget(k)} />

      <div className="mb-6">
        <button onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadKills(); }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 bg-gray-800 px-4 py-2 rounded-lg">
          <History className="w-4 h-4" /> {showHistory ? 'Hide' : 'Show'} Kill History
        </button>
        {showHistory && <div className="mt-4"><KillsTable kills={historyKills} title="Kill History" /></div>}
      </div>

      {revokeTarget && (
        <KillModal title={`Revoke kill ${revokeTarget.id?.slice(0, 8)}`}
          onCancel={() => { setRevokeTarget(null); setRevokeError(''); }}
          onConfirm={handleRevoke}
          confirmLabel="Revoke Kill" confirmColor="bg-green-600 hover:bg-green-500">
          {revokeError && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded px-3 py-2 mb-3">{revokeError}</div>}
          <div className="space-y-3">
            <div className="text-sm text-gray-400">
              <p>Scope: <span className="text-white">{revokeTarget.scope}</span> | Target: <span className="text-white font-mono">{revokeTarget.target || '*'}</span></p>
              <p className="mt-1">Original reason: <span className="text-gray-300">{revokeTarget.reason}</span></p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Revocation reason</label>
              <input type="text" value={revokeReason} onChange={e => setRevokeReason(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                placeholder="Why are you revoking this kill?" />
            </div>
            <TotpInput value={revokeTotp} onChange={setRevokeTotp} />
          </div>
        </KillModal>
      )}

      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}
