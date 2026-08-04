import React, { useState, useEffect } from 'react';
import {
  Upload, RefreshCw, Download, TrendingUp, Package, Activity, Trash2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import { formatDate } from '../lib/utils';

export default function NgLoaderPage() {
  // JAR state
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
  const [deletingVersion, setDeletingVersion] = useState(null);

  // Launcher (.exe) state
  const [launcherStats, setLauncherStats] = useState(null);
  const [launcherVersions, setLauncherVersions] = useState([]);
  const [launcherFile, setLauncherFile] = useState(null);
  const [launcherVersion, setLauncherVersion] = useState('');
  const [launcherChangelog, setLauncherChangelog] = useState('');
  const [launcherUploading, setLauncherUploading] = useState(false);
  const [launcherSuccess, setLauncherSuccess] = useState('');
  const [launcherError, setLauncherError] = useState('');
  const [deletingLauncherVersion, setDeletingLauncherVersion] = useState(null);

  // JRE (.zip) state
  const [jreVersions, setJreVersions] = useState([]);
  const [jreFile, setJreFile] = useState(null);
  const [jreVersion, setJreVersion] = useState('');
  const [jreChangelog, setJreChangelog] = useState('');
  const [jreUploading, setJreUploading] = useState(false);
  const [jreProgress, setJreProgress] = useState(null);
  const [jreSuccess, setJreSuccess] = useState('');
  const [jreError, setJreError] = useState('');
  const [deletingJreVersion, setDeletingJreVersion] = useState(null);

  // upload progress
  const [uploadProgress, setUploadProgress] = useState(null);
  const [launcherProgress, setLauncherProgress] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, v, ls, lv, jv] = await Promise.all([
        api.getNgStats(),
        api.getNgVersions(),
        api.getNgLauncherStats(),
        api.getNgLauncherVersions(),
        api.getJreVersions(),
      ]);
      setStats(s);
      setVersions(v ?? []);
      setLauncherStats(ls);
      setLauncherVersions(lv ?? []);
      setJreVersions(jv ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { setUploadError('Sélectionnez un fichier .jar'); return; }
    if (!version.trim()) { setUploadError('La version est requise (ex: 1.0.0)'); return; }
    if (!changelog.trim()) { setUploadError('Le changelog est requis'); return; }
    setUploading(true); setUploadError(''); setUploadSuccess(''); setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('version', version.trim());
      formData.append('changelog', changelog.trim());
      formData.append('product', 'NG_LOADER');
      formData.append('mandatory', 'false');
      const result = await api.uploadNgSoftware(formData, setUploadProgress);
      setUploadSuccess(`ngagent v${result.version} uploadé.`);
      setFile(null); setVersion(''); setChangelog('');
      const input = document.getElementById('ng-file-input');
      if (input) input.value = '';
      await load();
    } catch (err) { setUploadError(err.message); }
    finally { setUploading(false); setUploadProgress(null); }
  };

  const handleDelete = async (ver) => {
    if (!window.confirm(`Supprimer la version ${ver} (.jar) ?`)) return;
    setDeletingVersion(ver);
    try { await api.deleteNgVersion(ver); await load(); }
    catch (err) { setError(err.message); }
    finally { setDeletingVersion(null); }
  };

  const handleLauncherUpload = async (e) => {
    e.preventDefault();
    if (!launcherFile) { setLauncherError('Sélectionnez un fichier .exe'); return; }
    if (!launcherVersion.trim()) { setLauncherError('La version est requise (ex: 1.0.0)'); return; }
    if (!launcherChangelog.trim()) { setLauncherError('Le changelog est requis'); return; }
    setLauncherUploading(true); setLauncherError(''); setLauncherSuccess(''); setLauncherProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', launcherFile);
      formData.append('version', launcherVersion.trim());
      formData.append('changelog', launcherChangelog.trim());
      formData.append('product', 'NG_LAUNCHER');
      formData.append('mandatory', 'false');
      const result = await api.uploadNgLauncherSoftware(formData, setLauncherProgress);
      setLauncherSuccess(`NGLauncher v${result.version} uploadé.`);
      setLauncherFile(null); setLauncherVersion(''); setLauncherChangelog('');
      const input = document.getElementById('ngl-file-input');
      if (input) input.value = '';
      await load();
    } catch (err) { setLauncherError(err.message); }
    finally { setLauncherUploading(false); setLauncherProgress(null); }
  };

  const handleLauncherDelete = async (ver) => {
    if (!window.confirm(`Supprimer la version ${ver} (.exe) ?`)) return;
    setDeletingLauncherVersion(ver);
    try { await api.deleteNgLauncherVersion(ver); await load(); }
    catch (err) { setError(err.message); }
    finally { setDeletingLauncherVersion(null); }
  };

  const handleJreUpload = async (e) => {
    e.preventDefault();
    if (!jreFile) { setJreError('Sélectionnez un fichier .zip'); return; }
    if (!jreVersion.trim()) { setJreError('La version est requise (ex: 21.0.3)'); return; }
    if (!jreChangelog.trim()) { setJreError('Le changelog est requis'); return; }
    setJreUploading(true); setJreError(''); setJreSuccess(''); setJreProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', jreFile);
      formData.append('version', jreVersion.trim());
      formData.append('changelog', jreChangelog.trim());
      formData.append('product', 'JRE');
      formData.append('mandatory', 'false');
      const result = await api.uploadJreSoftware(formData, setJreProgress);
      setJreSuccess(`JRE v${result.version} uploadé.`);
      setJreFile(null); setJreVersion(''); setJreChangelog('');
      const input = document.getElementById('jre-file-input');
      if (input) input.value = '';
      await load();
    } catch (err) { setJreError(err.message); }
    finally { setJreUploading(false); setJreProgress(null); }
  };

  const handleJreDelete = async (ver) => {
    if (!window.confirm(`Supprimer la version JRE ${ver} ?`)) return;
    setDeletingJreVersion(ver);
    try { await api.deleteJreVersion(ver); await load(); }
    catch (err) { setError(err.message); }
    finally { setDeletingJreVersion(null); }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const UploadProgress = ({ progress, color = 'green' }) => {
    if (progress === null) return null;
    const colors = {
      green:  { bar: 'bg-green-500',  text: 'text-green-400' },
      purple: { bar: 'bg-purple-500', text: 'text-purple-400' },
      sky:    { bar: 'bg-sky-500',    text: 'text-sky-400' },
    };
    const c = colors[color] || colors.green;
    return (
      <div className="mt-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Upload en cours…</span>
          <span className={c.text + ' font-mono'}>{progress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div
            className={c.bar + ' h-1.5 rounded-full transition-all duration-150'}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">NG Loader</h1>
          <p className="text-sm text-gray-500 mt-1">
            Agent Java <span className="font-mono text-green-400">.jar</span> + Launcher <span className="font-mono text-purple-400">.exe</span>
          </p>
        </div>
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
              <Download className="w-5 h-5 text-green-400" />
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
              <Package className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-400">{versions.length}</p>
          </div>
        </div>
      )}

      {/* Downloads chart */}
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
              <Line type="monotone" dataKey="count" stroke="#22c55e"
                strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* JRE Upload Card */}
      <div className="bg-gray-900 border border-sky-900/40 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Upload className="w-5 h-5 text-sky-400" /> JRE (.zip)
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Archive Java Runtime hébergée sur le backend — le launcher la télécharge automatiquement via{' '}
          <span className="font-mono text-sky-400">GET /api/v1/software/jre</span>
        </p>

        {jreSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-4">
            {jreSuccess}
          </div>
        )}
        {jreError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">
            {jreError}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <form onSubmit={handleJreUpload} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Fichier <span className="font-mono text-sky-400">.zip</span>
              </label>
              <input
                id="jre-file-input"
                type="file"
                accept=".zip"
                onChange={(e) => setJreFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3
                  file:rounded file:border-0 file:text-sm file:bg-gray-700
                  file:text-gray-300 hover:file:bg-gray-600 cursor-pointer"
              />
              {jreFile && (
                <p className="text-xs text-gray-500 mt-1">
                  {jreFile.name} — {formatSize(jreFile.size)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Version (ex: 21.0.3)</label>
              <input
                type="text"
                value={jreVersion}
                onChange={(e) => setJreVersion(e.target.value)}
                placeholder="21.0.3"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Changelog</label>
              <textarea
                value={jreChangelog}
                onChange={(e) => setJreChangelog(e.target.value)}
                rows={3}
                placeholder={"- JRE 21 LTS\n- OpenJDK Temurin..."}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-sky-500"
              />
            </div>
            <button type="submit" disabled={jreUploading}
              className="w-full flex items-center justify-center gap-2 bg-sky-800
                hover:bg-sky-700 disabled:bg-gray-700 text-white font-medium
                py-2.5 rounded-lg transition-colors">
              {jreUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Publier jre.zip
                </>
              )}
            </button>
            <UploadProgress progress={jreProgress} color="sky" />
          </form>

          {/* JRE version history */}
          <div>
            {jreVersions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                Aucun JRE publié
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-2">Versions publiées</p>
                {jreVersions.map((v, idx) => (
                  <div key={v.version}
                    className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-sky-400 shrink-0">v{v.version}</span>
                      {idx === 0 && (
                        <span className="text-xs bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded-full shrink-0">
                          Actuel
                        </span>
                      )}
                      <span className="text-xs text-gray-500 truncate">{v.filename}</span>
                    </div>
                    <button
                      onClick={() => handleJreDelete(v.version)}
                      disabled={deletingJreVersion === v.version}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300
                        disabled:opacity-40 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors ml-2 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                      {deletingJreVersion === v.version ? '...' : 'Suppr.'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* JAR Upload Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-400" /> Agent Java (.jar)
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
              <label className="block text-sm text-gray-400 mb-1">
                Fichier <span className="font-mono text-green-400">.jar</span>
              </label>
              <input
                id="ng-file-input"
                type="file"
                accept=".jar"
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
              <label className="block text-sm text-gray-400 mb-1">Version (ex: 1.0.0)</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Changelog</label>
              <textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                rows={4}
                placeholder={"- Fix injection sur Java 17\n- Amélioration stabilité..."}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-green-500"
              />
            </div>

            <button type="submit" disabled={uploading}
              className="w-full flex items-center justify-center gap-2 bg-green-700
                hover:bg-green-600 disabled:bg-gray-700 text-white font-medium
                py-2.5 rounded-lg transition-colors">
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Publier ngagent.jar
                </>
              )}
            </button>
            <UploadProgress progress={uploadProgress} color="green" />
          </form>
        </div>

        {/* Launcher .exe Upload Card */}
        <div className="bg-gray-900 border border-purple-900/40 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-400" /> Launcher (.exe)
          </h2>

          {launcherSuccess && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-4">
              {launcherSuccess}
            </div>
          )}
          {launcherError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">
              {launcherError}
            </div>
          )}

          <form onSubmit={handleLauncherUpload} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Fichier <span className="font-mono text-purple-400">.exe</span>
              </label>
              <input
                id="ngl-file-input"
                type="file"
                accept=".exe"
                onChange={(e) => setLauncherFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3
                  file:rounded file:border-0 file:text-sm file:bg-gray-700
                  file:text-gray-300 hover:file:bg-gray-600 cursor-pointer"
              />
              {launcherFile && (
                <p className="text-xs text-gray-500 mt-1">
                  {launcherFile.name} — {formatSize(launcherFile.size)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Version (ex: 1.0.0)</label>
              <input
                type="text"
                value={launcherVersion}
                onChange={(e) => setLauncherVersion(e.target.value)}
                placeholder="1.0.0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Changelog</label>
              <textarea
                value={launcherChangelog}
                onChange={(e) => setLauncherChangelog(e.target.value)}
                rows={4}
                placeholder={"- Correction bug au démarrage\n- Nouveau splash screen..."}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-purple-500"
              />
            </div>

            <button type="submit" disabled={launcherUploading}
              className="w-full flex items-center justify-center gap-2 bg-purple-800
                hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium
                py-2.5 rounded-lg transition-colors">
              {launcherUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Publier NGLauncher.exe
                </>
              )}
            </button>
            <UploadProgress progress={launcherProgress} color="purple" />
          </form>
        </div>
      </div>

      {/* Launcher version history */}
      {launcherVersions.length > 0 && (
        <div className="bg-gray-900 border border-purple-900/40 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
              Historique Launcher (.exe)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
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
                {launcherVersions.map((v, idx) => (
                  <tr key={v.version} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <span className="font-mono text-purple-400">v{v.version}</span>
                      {idx === 0 && (
                        <span className="ml-2 text-xs bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded-full">
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
                        onClick={() => handleLauncherDelete(v.version)}
                        disabled={deletingLauncherVersion === v.version}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300
                          disabled:opacity-40 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        {deletingLauncherVersion === v.version ? '...' : 'Supprimer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Versions actives */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" /> Sessions par version (jar)
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Nombre de fois où le jar a été servi par version.
          </p>
          {stats?.activationsByVersion?.length > 0 ? (
            <div className="space-y-2">
              {stats.activationsByVersion.map((v) => (
                <div key={v.version} className="flex items-center justify-between
                  bg-gray-800 rounded-lg px-3 py-2 text-sm">
                  <span className="font-mono text-green-400">v{v.version}</span>
                  <span className="text-gray-400">{v.count} session(s)</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600 text-sm">
              Aucune version publiée
            </div>
          )}
        </div>

      {/* Version History Table (jar) */}
      {versions.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Historique des versions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
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
                      <span className="font-mono text-green-400">v{v.version}</span>
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
        </div>
      )}

      {versions.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
          <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun jar publié. Uploadez votre premier <span className="font-mono">ngagent.jar</span> ci-dessus.</p>
        </div>
      )}
    </div>
  );
}
