import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload, RefreshCw, Package, History, ArrowDownToLine, RotateCcw, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';

const PRODUCT = 'fortniteclient';
const KINDS = [
  { key: 'driver', label: 'Driver', ext: '.sys', desc: '404.sys' },
  { key: 'reader', label: 'Reader', ext: '.exe', desc: 'DwmRenderHelper.exe' },
  { key: 'byovd', label: 'BYOVD', ext: '.sys', desc: 'ThrottleStop / CorMem .sys' },
  { key: 'loader', label: 'Loader', ext: '.exe', desc: '404Client.exe (téléchargeable par les clients)' },
];

const formatSize = (b) => {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

const shortSha = (s) => s ? s.slice(0, 12) + '…' : '—';

function BinaryPanel({ kind, onUploaded }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.cheatBinaries(PRODUCT, kind.key);
      setHistory(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [kind.key]);

  useEffect(() => { load(); }, [load]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(''); setSuccess(''); setProgress(0);
    try {
      const result = await api.cheatUploadBinary(PRODUCT, kind.key, file, setProgress);
      setSuccess(`${kind.label} uploadé — sha256: ${shortSha(result.sha256)}`);
      e.target.value = '';
      await load();
      onUploaded?.();
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  };

  const latest = history[0];

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white">{kind.label}</h3>
          <p className="text-xs text-gray-500">{kind.desc} ({kind.ext})</p>
        </div>
        <label className={`cursor-pointer flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors
          ${uploading ? 'bg-gray-700 text-gray-500' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}>
          <Upload className="w-4 h-4" />
          {uploading ? `${progress}%` : 'Replace'}
          <input type="file" accept={kind.ext} onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
      </div>

      {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded px-3 py-1.5 mb-2">{error}</div>}
      {success && <div className="text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded px-3 py-1.5 mb-2">{success}</div>}

      {latest ? (
        <div className="text-xs space-y-1 text-gray-400">
          <div className="flex justify-between"><span>Fichier</span><span className="text-gray-300 font-mono">{latest.filename}</span></div>
          <div className="flex justify-between"><span>Taille</span><span>{formatSize(latest.size)}</span></div>
          <div className="flex justify-between"><span>SHA256</span><span className="font-mono">{shortSha(latest.sha256)}</span></div>
          <div className="flex justify-between"><span>Date</span><span>{formatDate(latest.uploadedAt)}</span></div>
          {latest.uploadedBy && <div className="flex justify-between"><span>Par</span><span>{latest.uploadedBy}</span></div>}
        </div>
      ) : (
        <p className="text-xs text-gray-600 italic">Aucun fichier uploadé</p>
      )}

      {history.length > 1 && (
        <details className="mt-3">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 flex items-center gap-1">
            <History className="w-3 h-3" /> {history.length - 1} version(s) précédente(s)
          </summary>
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {history.slice(1).map((b) => (
              <div key={b.id} className="flex justify-between text-xs text-gray-500 bg-gray-900/50 rounded px-2 py-1">
                <span className="font-mono">{b.filename}</span>
                <span>{formatSize(b.size)} · {formatDate(b.uploadedAt)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default function CheatFilesPage() {
  const [versions, setVersions] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [pubVersion, setPubVersion] = useState('');
  const [pubNotes, setPubNotes] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [pubResult, setPubResult] = useState(null);
  const [pubError, setPubError] = useState('');
  const [rollingBack, setRollingBack] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [v, s] = await Promise.all([
        api.cheatVersions(PRODUCT),
        api.cheatStatus(PRODUCT),
      ]);
      setVersions(v);
      setStatus(s);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handlePublish = async (e) => {
    e.preventDefault();
    setPublishing(true); setPubError(''); setPubResult(null);
    try {
      const result = await api.cheatPublish(PRODUCT, {
        version: pubVersion.trim() || undefined,
        notes: pubNotes.trim() || undefined,
      });
      setPubResult(result);
      setPubVersion(''); setPubNotes('');
      await load();
    } catch (err) { setPubError(err.message); }
    finally { setPublishing(false); }
  };

  const handleRollback = async (id, ver) => {
    if (!window.confirm(`Rollback vers la version ${ver} ?`)) return;
    setRollingBack(id);
    try {
      await api.cheatRollback(PRODUCT, id);
      await load();
    } catch (err) { setError(err.message); }
    finally { setRollingBack(null); }
  };

  const handleDownload = async (id, ver) => {
    try {
      const blob = await api.cheatDownloadBundle(PRODUCT, id);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `fortniteclient_v${ver}.bin`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold">Cheat Files — fortniteclient</h2>
        <button onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Status banner */}
      {status?.activeVersion && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-5 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <span className="text-green-300 font-medium">Version active : v{status.activeVersion.version}</span>
            <span className="text-gray-500 ml-3">SHA256: {shortSha(status.activeVersion.sha256)}</span>
            <span className="text-gray-500 ml-3">{formatSize(status.activeVersion.size)}</span>
            <span className="text-gray-500 ml-3">{status.subscribers} abonné(s) actif(s)</span>
          </div>
        </div>
      )}

      {/* Binary panels */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {KINDS.map((k) => (
          <BinaryPanel key={k.key} kind={k} onUploaded={() => setRefreshKey((n) => n + 1)} />
        ))}
      </div>

      {/* Publish panel */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-cyan-400" /> Publier un nouveau bundle
        </h3>

        {/* Composition preview */}
        {status?.binaries && (
          <div className="mb-4 bg-gray-800/50 rounded-lg p-3 text-xs text-gray-400 space-y-1">
            <div className="text-gray-300 font-medium mb-1">Composition du prochain bundle :</div>
            {KINDS.map((k) => {
              const b = status.binaries[k.key];
              return (
                <div key={k.key} className="flex items-center gap-2">
                  {b ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                      <span className="text-gray-300">{k.label}</span>
                      <span className="font-mono">{b.filename}</span>
                      <span>{formatSize(b.size)}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-red-400" />
                      <span className="text-red-400">{k.label} — manquant</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pubError && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2 mb-3">{pubError}</div>}
        {pubResult && (
          <div className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded px-3 py-2 mb-3">
            Bundle publié — v{pubResult.version} · SHA256: {shortSha(pubResult.sha256)} · {formatSize(pubResult.size)}
          </div>
        )}

        <form onSubmit={handlePublish} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Version (optionnel)</label>
              <input type="text" value={pubVersion} onChange={(e) => setPubVersion(e.target.value)}
                placeholder="auto-incrémentée si vide"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes (optionnel)</label>
              <input type="text" value={pubNotes} onChange={(e) => setPubNotes(e.target.value)}
                placeholder="ex: mise à jour driver v2.1"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
          </div>
          <button type="submit" disabled={publishing}
            className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700
              text-white font-medium py-2.5 px-6 rounded-lg transition-colors">
            {publishing ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publication...</>
            ) : (
              <><Package className="w-4 h-4" /> Publish new version</>
            )}
          </button>
        </form>
      </div>

      {/* Versions panel */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold">Versions publiées</h3>
        </div>
        {loading ? (
          <div className="px-5 py-8 text-center text-gray-600 text-sm">Chargement...</div>
        ) : versions.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-600 text-sm">Aucune version publiée</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3">SHA256</th>
                  <th className="px-4 py-3">Taille</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <span className="font-mono text-cyan-400">v{v.version}</span>
                      {v.isActive && (
                        <span className="ml-2 text-xs bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{v.notes || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{shortSha(v.bundleSha256)}</td>
                    <td className="px-4 py-3 text-gray-400">{formatSize(v.bundleSize)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(v.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!v.isActive && (
                          <button
                            onClick={() => handleRollback(v.id, v.version)}
                            disabled={rollingBack === v.id}
                            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300
                              bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded transition-colors disabled:opacity-40"
                          >
                            <RotateCcw className="w-3 h-3" />
                            {rollingBack === v.id ? '...' : 'Rollback'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(v.id, v.version)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300
                            bg-gray-700/50 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                        >
                          <ArrowDownToLine className="w-3 h-3" /> DL
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
