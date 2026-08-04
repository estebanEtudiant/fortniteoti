import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Play, Square, RotateCw, Users, Terminal, Settings, Save,
  ShieldCheck, ShieldOff, UserPlus, UserMinus, Send, Copy, Check,
  Megaphone, Ban, ShieldAlert,
} from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';

function fmtUptime(seconds) {
  if (!seconds && seconds !== 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function StatCard({ label, value, accent = 'text-cyan-400' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function NameForm({ placeholder, buttonLabel, onSubmit, disabled, withReason }) {
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSubmit(name.trim(), reason.trim() || undefined);
      setName('');
      setReason('');
    } catch (err) { alert(err.message); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="flex gap-2 flex-wrap">
      <input value={name} onChange={e => setName(e.target.value)} placeholder={placeholder}
        maxLength={16} className="text-sm flex-1 min-w-[140px]" disabled={disabled || busy} />
      {withReason && (
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Raison (optionnel)"
          className="text-sm flex-1 min-w-[140px]" disabled={disabled || busy} />
      )}
      <button type="submit" disabled={disabled || busy || !name.trim()}
        className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black text-sm font-medium rounded-lg transition-colors">
        {busy ? '...' : buttonLabel}
      </button>
    </form>
  );
}

export default function MinecraftPage() {
  const [tab, setTab] = useState('overview');
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');

  const [whitelist, setWhitelist] = useState(null);
  const [ops, setOps] = useState(null);
  const [banned, setBanned] = useState(null);

  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [command, setCommand] = useState('');
  const [commandResult, setCommandResult] = useState('');
  const [commandBusy, setCommandBusy] = useState(false);
  const logsEndRef = useRef(null);

  const [props, setProps] = useState(null);
  const [loadingProps, setLoadingProps] = useState(false);
  const [savingProps, setSavingProps] = useState(false);
  const [propsSaved, setPropsSaved] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await api.mcStatus();
      setStatus(data);
    } catch (err) { console.error(err); }
    finally { setLoadingStatus(false); }
  }, []);

  useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 5000);
    return () => clearInterval(id);
  }, [loadStatus]);

  const loadPlayers = async () => {
    try {
      const [wl, opsList, ban] = await Promise.all([api.mcGetWhitelist(), api.mcGetOps(), api.mcGetBanned()]);
      setWhitelist(wl);
      setOps(opsList);
      setBanned(ban);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (tab === 'players') loadPlayers(); }, [tab]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await api.mcLogs();
      setLogs(data.lines);
    } catch (err) { console.error(err); }
    finally { setLoadingLogs(false); }
  }, []);

  useEffect(() => {
    if (tab === 'console') {
      loadLogs();
      const id = setInterval(loadLogs, 4000);
      return () => clearInterval(id);
    }
  }, [tab, loadLogs]);

  useEffect(() => {
    if (tab === 'console') logsEndRef.current?.scrollIntoView({ block: 'end' });
  }, [logs, tab]);

  useEffect(() => {
    if (tab === 'settings' && !props) {
      setLoadingProps(true);
      api.mcGetProperties().then(setProps).catch(err => alert(err.message)).finally(() => setLoadingProps(false));
    }
  }, [tab, props]);

  const runAction = async (fn) => {
    setActionBusy(true);
    try { await fn(); await loadStatus(); }
    catch (err) { alert(err.message); }
    finally { setActionBusy(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(status?.connect || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    try { await api.mcBroadcast(broadcastMsg.trim()); setBroadcastMsg(''); }
    catch (err) { alert(err.message); }
  };

  const handleCommand = async (e) => {
    e.preventDefault();
    if (!command.trim()) return;
    setCommandBusy(true);
    try {
      const res = await api.mcCommand(command.trim());
      setCommandResult(res.result || '(pas de réponse)');
      setCommand('');
      loadLogs();
    } catch (err) { setCommandResult(`Erreur: ${err.message}`); }
    finally { setCommandBusy(false); }
  };

  const handleSaveProps = async () => {
    setSavingProps(true);
    try {
      const updated = await api.mcUpdateProperties(props);
      setProps(updated);
      setPropsSaved(true);
      setTimeout(() => setPropsSaved(false), 2500);
    } catch (err) { alert(err.message); }
    finally { setSavingProps(false); }
  };

  const TABS = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: Box },
    { id: 'players',  label: 'Joueurs',         icon: Users },
    { id: 'console',  label: 'Console',         icon: Terminal },
    { id: 'settings', label: 'Réglages',        icon: Settings },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Box className="w-6 h-6 text-cyan-400" /> Serveur Minecraft
      </h1>

      <div className="flex gap-2 mb-6 border-b border-gray-800 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
              ${tab === t.id ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Vue d'ensemble ── */}
      {tab === 'overview' && (
        loadingStatus ? <Loading /> : !status ? (
          <p className="text-gray-500">Impossible de charger le statut.</p>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${status.active ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
                <div>
                  <p className="font-semibold text-lg">{status.active ? 'En ligne' : 'Hors ligne'}</p>
                  <button onClick={handleCopy}
                    className="text-xs text-gray-400 hover:text-cyan-400 flex items-center gap-1 font-mono">
                    {status.connect} {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => runAction(() => api.mcStart())} disabled={actionBusy || status.active}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 disabled:opacity-30 text-sm font-medium rounded-lg transition-colors">
                  <Play className="w-4 h-4" /> Démarrer
                </button>
                <button onClick={() => { if (confirm('Arrêter le serveur ? Le monde sera sauvegardé.')) runAction(() => api.mcStop()); }}
                  disabled={actionBusy || !status.active}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-30 text-sm font-medium rounded-lg transition-colors">
                  <Square className="w-4 h-4" /> Arrêter
                </button>
                <button onClick={() => { if (confirm('Redémarrer le serveur ?')) runAction(() => api.mcRestart()); }}
                  disabled={actionBusy}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 disabled:opacity-30 text-sm font-medium rounded-lg transition-colors">
                  <RotateCw className="w-4 h-4" /> Redémarrer
                </button>
                <button onClick={() => runAction(() => api.mcSave())} disabled={actionBusy || !status.active}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 disabled:opacity-30 text-sm font-medium rounded-lg transition-colors">
                  <Save className="w-4 h-4" /> Sauvegarder
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Uptime" value={status.active ? fmtUptime(status.uptimeSeconds) : '—'} />
              <StatCard label="RAM" value={status.memoryUsedMb ? `${(status.memoryUsedMb / 1024).toFixed(1)} / ${(status.memoryAllocatedMb / 1024).toFixed(0)} Go` : '—'} />
              <StatCard label="Joueurs" value={status.players ? `${status.players.online} / ${status.players.max}` : '—'} />
              <StatCard label="Taille du monde" value={status.worldSizeMb ? `${status.worldSizeMb} Mo` : '—'} />
            </div>

            {status.players?.names?.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-2">Actuellement connectés</p>
                <div className="flex flex-wrap gap-2">
                  {status.players.names.map(n => (
                    <span key={n} className="text-sm bg-gray-800 px-2.5 py-1 rounded-lg">{n}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-purple-400" /> Annonce en jeu
              </h2>
              <form onSubmit={handleBroadcast} className="flex gap-2">
                <input value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                  placeholder="Message affiché à tous les joueurs..." maxLength={256}
                  className="text-sm flex-1" disabled={!status.active} />
                <button type="submit" disabled={!status.active || !broadcastMsg.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black text-sm font-medium rounded-lg transition-colors">
                  <Send className="w-4 h-4" /> Envoyer
                </button>
              </form>
            </div>
          </div>
        )
      )}

      {/* ── Joueurs / Whitelist / Ops / Bannis ── */}
      {tab === 'players' && (
        !whitelist ? <Loading /> : (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-400" /> Whitelist ({whitelist.length})
                </h2>
                <div className="flex gap-1">
                  <button onClick={() => api.mcToggleWhitelist(true).then(loadPlayers).catch(e => alert(e.message))}
                    className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20">Activer</button>
                  <button onClick={() => api.mcToggleWhitelist(false).then(loadPlayers).catch(e => alert(e.message))}
                    className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700">Désactiver</button>
                </div>
              </div>
              <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                {whitelist.length === 0 ? <p className="text-sm text-gray-500">Aucun joueur (whitelist vide = tout le monde peut rejoindre si désactivée).</p> :
                  whitelist.map(w => (
                    <div key={w.uuid} className="flex items-center justify-between bg-gray-800/60 px-3 py-1.5 rounded-lg text-sm">
                      {w.name}
                      <button onClick={() => api.mcRemoveWhitelist(w.name).then(loadPlayers).catch(e => alert(e.message))}
                        className="text-red-400 hover:text-red-300"><UserMinus className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
              </div>
              <NameForm placeholder="Pseudo Minecraft" buttonLabel="Ajouter"
                onSubmit={(name) => api.mcAddWhitelist(name).then(loadPlayers)} />
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-yellow-400" /> Opérateurs ({ops.length})
              </h2>
              <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                {ops.length === 0 ? <p className="text-sm text-gray-500">Aucun opérateur.</p> :
                  ops.map(o => (
                    <div key={o.uuid} className="flex items-center justify-between bg-gray-800/60 px-3 py-1.5 rounded-lg text-sm">
                      {o.name}
                      <button onClick={() => api.mcRemoveOp(o.name).then(loadPlayers).catch(e => alert(e.message))}
                        className="text-red-400 hover:text-red-300"><UserMinus className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
              </div>
              <NameForm placeholder="Pseudo Minecraft" buttonLabel="Op"
                onSubmit={(name) => api.mcAddOp(name).then(loadPlayers)} />
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" /> Connectés maintenant
              </h2>
              {!status?.players || status.players.online === 0 ? (
                <p className="text-sm text-gray-500">Personne en ligne.</p>
              ) : (
                <div className="space-y-1.5">
                  {status.players.names.map(n => (
                    <div key={n} className="flex items-center justify-between bg-gray-800/60 px-3 py-1.5 rounded-lg text-sm">
                      {n}
                      <button onClick={() => { if (confirm(`Kick ${n} ?`)) api.mcKick(n).then(loadStatus).catch(e => alert(e.message)); }}
                        className="text-orange-400 hover:text-orange-300 text-xs">Kick</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" /> Bannis ({banned.length})
              </h2>
              <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                {banned.length === 0 ? <p className="text-sm text-gray-500">Aucun joueur banni.</p> :
                  banned.map(b => (
                    <div key={b.uuid} className="flex items-center justify-between bg-gray-800/60 px-3 py-1.5 rounded-lg text-sm">
                      <span>{b.name} <span className="text-xs text-gray-500">— {b.reason}</span></span>
                      <button onClick={() => api.mcPardon(b.name).then(loadPlayers).catch(e => alert(e.message))}
                        className="text-green-400 hover:text-green-300 text-xs">Pardonner</button>
                    </div>
                  ))}
              </div>
              <NameForm placeholder="Pseudo Minecraft" buttonLabel="Ban" withReason
                onSubmit={(name, reason) => api.mcBan(name, reason).then(loadPlayers)} />
            </div>
          </div>
        )
      )}

      {/* ── Console ── */}
      {tab === 'console' && (
        <div className="space-y-4">
          <div className="bg-black border border-gray-800 rounded-xl p-4 font-mono text-xs h-96 overflow-y-auto">
            {loadingLogs && logs.length === 0 ? <Loading /> : logs.map((l, i) => (
              <div key={i} className="text-gray-300 whitespace-pre-wrap break-all">{l}</div>
            ))}
            <div ref={logsEndRef} />
          </div>
          <form onSubmit={handleCommand} className="flex gap-2">
            <Terminal className="w-4 h-4 text-cyan-400 shrink-0 self-center" />
            <input value={command} onChange={e => setCommand(e.target.value)}
              placeholder="Commande console (ex: gamemode creative Steve)"
              className="text-sm flex-1 font-mono" disabled={commandBusy} />
            <button type="submit" disabled={commandBusy || !command.trim()}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black text-sm font-medium rounded-lg transition-colors">
              {commandBusy ? '...' : 'Exécuter'}
            </button>
          </form>
          {commandResult && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 font-mono text-xs text-gray-300 whitespace-pre-wrap">
              {commandResult}
            </div>
          )}
        </div>
      )}

      {/* ── Réglages ── */}
      {tab === 'settings' && (
        loadingProps ? <Loading /> : !props ? (
          <p className="text-gray-500">Impossible de charger les réglages.</p>
        ) : (
          <div className="space-y-6 max-w-2xl">
            <p className="text-xs text-gray-500 bg-gray-900 border border-gray-800 rounded-lg p-3">
              Ces réglages modifient <code>server.properties</code> et nécessitent un redémarrage du serveur pour s'appliquer.
            </p>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">MOTD (message d'accueil)</label>
                <input value={props.motd || ''} onChange={e => setProps(p => ({ ...p, motd: e.target.value }))} className="w-full text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Joueurs max</label>
                  <input type="number" min="1" value={props['max-players'] || ''}
                    onChange={e => setProps(p => ({ ...p, 'max-players': e.target.value }))} className="w-full text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Difficulté</label>
                  <select value={props.difficulty || 'normal'} onChange={e => setProps(p => ({ ...p, difficulty: e.target.value }))} className="w-full text-sm">
                    <option value="peaceful">Paisible</option>
                    <option value="easy">Facile</option>
                    <option value="normal">Normale</option>
                    <option value="hard">Difficile</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Mode de jeu par défaut</label>
                  <select value={props.gamemode || 'survival'} onChange={e => setProps(p => ({ ...p, gamemode: e.target.value }))} className="w-full text-sm">
                    <option value="survival">Survie</option>
                    <option value="creative">Créatif</option>
                    <option value="adventure">Aventure</option>
                    <option value="spectator">Spectateur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Distance de vue (chunks)</label>
                  <input type="number" min="3" max="32" value={props['view-distance'] || ''}
                    onChange={e => setProps(p => ({ ...p, 'view-distance': e.target.value }))} className="w-full text-sm" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                {[
                  ['pvp', 'PvP activé'],
                  ['white-list', 'Whitelist activée'],
                  ['online-mode', 'Mode en ligne (vérif. compte Mojang)'],
                  ['enable-command-block', 'Command blocks'],
                  ['hardcore', 'Hardcore'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" checked={props[key] === 'true'}
                      onChange={e => setProps(p => ({ ...p, [key]: e.target.checked ? 'true' : 'false' }))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <button onClick={handleSaveProps} disabled={savingProps}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold rounded-lg transition-colors text-sm">
              {savingProps ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : propsSaved ? (
                <><Check className="w-4 h-4" /> Sauvegardé !</>
              ) : (
                <><Save className="w-4 h-4" /> Sauvegarder</>
              )}
            </button>
          </div>
        )
      )}
    </div>
  );
}
