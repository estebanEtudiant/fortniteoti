import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, Ban, CheckCircle, Cpu, Calendar, Trash2,
} from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import StatusBadge from '../components/StatusBadge';
import InfoCard from '../components/InfoCard';
import { formatPlan, formatDate } from '../lib/utils';

export default function LicenseDetailPage({ id, navigate }) {
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
        <InfoCard label="Expire" value={lic.expiresAt ? formatDate(lic.expiresAt) : (lic.metadata?.startOnActivation ? `${lic.metadata.durationDays} j dès l'activation` : 'Lifetime')} />
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

      {lic.activations?.length > 0 && (() => {
        // Detect shared key: group by distinct (username, hostname) pairs
        const identities = [];
        const seen = new Set();
        lic.activations.forEach(a => {
          const mi = a.machineInfo || {};
          const key = `${mi.username || ''}|${mi.hostname || ''}`;
          if ((mi.username || mi.hostname) && !seen.has(key)) {
            seen.add(key);
            identities.push({ username: mi.username, hostname: mi.hostname, ip: a.ipAddress });
          }
        });

        return (
          <>
            {identities.length > 1 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                <p className="text-red-400 font-semibold text-sm mb-2">
                  ⚠ Clé potentiellement partagée — {identities.length} identités distinctes détectées
                </p>
                <div className="space-y-1">
                  {identities.map((id, i) => (
                    <div key={i} className="flex gap-4 text-xs font-mono text-red-300">
                      <span className="text-red-400">{id.username || '—'}</span>
                      <span className="text-gray-400">@{id.hostname || '—'}</span>
                      <span className="text-gray-500">{id.ip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <h2 className="text-lg font-semibold mb-4">Historique des Activations</h2>
              <div className="space-y-2 max-h-80 overflow-auto">
                {lic.activations.map(a => {
                  const mi = a.machineInfo || {};
                  return (
                    <div key={a.id} className="bg-gray-800/50 rounded-lg p-3 text-xs space-y-1.5">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={a.status} small />
                        <span className="font-mono text-gray-400">{a.ipAddress}</span>
                        <span className="font-mono text-gray-500">{a.hwid?.substring(0, 12)}...</span>
                        <span className="ml-auto text-gray-500">{formatDate(a.createdAt)}</span>
                      </div>
                      {(mi.username || mi.hostname || mi.os || mi.locale) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 pl-1 text-gray-500">
                          {mi.username && <span><span className="text-gray-400">user</span> {mi.username}</span>}
                          {mi.hostname && <span><span className="text-gray-400">host</span> {mi.hostname}</span>}
                          {mi.os      && <span><span className="text-gray-400">os</span> {mi.os}</span>}
                          {mi.locale  && <span><span className="text-gray-400">locale</span> {mi.locale}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        );
      })()}

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
