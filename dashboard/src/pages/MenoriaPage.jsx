import React, { useState, useEffect } from 'react';
import {
  Upload, RefreshCw, Download, TrendingUp, Package, Activity, Trash2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import ProductAnalytics from '../components/ProductAnalytics';
import { formatDate } from '../lib/utils';

export default function MenoriaPage() {
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

  // Loader (.exe) state
  const [loaderStats, setLoaderStats] = useState(null);
  const [loaderVersions, setLoaderVersions] = useState([]);
  const [loaderFile, setLoaderFile] = useState(null);
  const [loaderVersion, setLoaderVersion] = useState('');
  const [loaderChangelog, setLoaderChangelog] = useState('');
  const [loaderUploading, setLoaderUploading] = useState(false);
  const [loaderSuccess, setLoaderSuccess] = useState('');
  const [loaderError, setLoaderError] = useState('');
  const [deletingLoaderVersion, setDeletingLoaderVersion] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, v, ls, lv] = await Promise.all([
        api.getMenoriaStats(),
        api.getMenoriaVersions(),
        api.getLoaderStats(),
        api.getLoaderVersions(),
      ]);
      setStats(s);
      setVersions(v ?? []);
      setLoaderStats(ls);
      setLoaderVersions(lv ?? []);
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
    setUploading(true); setUploadError(''); setUploadSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('version', version.trim());
      formData.append('changelog', changelog.trim());
      formData.append('product', 'MENORIA');
      formData.append('mandatory', 'false');
      const result = await api.uploadMenoriaSoftware(formData);
      setUploadSuccess(`menoria v${result.version} uploadé.`);
      setFile(null); setVersion(''); setChangelog('');
      const input = document.getElementById('menoria-file-input');
      if (input) input.value = '';
      await load();
    } catch (err) { setUploadError(err.message); }
    finally { setUploading(false); }
  };

  const handleDelete = async (ver) => {
    if (!window.confirm(`Supprimer la version ${ver} (.jar) ?`)) return;
    setDeletingVersion(ver);
    try { await api.deleteMenoriaVersion(ver); await load(); }
    catch (err) { setError(err.message); }
    finally { setDeletingVersion(null); }
  };

  const handleLoaderUpload = async (e) => {
    e.preventDefault();
    if (!loaderFile) { setLoaderError('Sélectionnez un fichier .exe'); return; }
    if (!loaderVersion.trim()) { setLoaderError('La version est requise (ex: 1.0.0)'); return; }
    if (!loaderChangelog.trim()) { setLoaderError('Le changelog est requis'); return; }
    setLoaderUploading(true); setLoaderError(''); setLoaderSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', loaderFile);
      formData.append('version', loaderVersion.trim());
      formData.append('changelog', loaderChangelog.trim());
      formData.append('product', 'LOADER');
      formData.append('mandatory', 'false');
      const result = await api.uploadLoaderSoftware(formData);
      setLoaderSuccess(`Loader v${result.version} uploadé.`);
      setLoaderFile(null); setLoaderVersion(''); setLoaderChangelog('');
      const input = document.getElementById('loader-file-input');
      if (input) input.value = '';
      await load();
    } catch (err) { setLoaderError(err.message); }
    finally { setLoaderUploading(false); }
  };

  const handleLoaderDelete = async (ver) => {
    if (!window.confirm(`Supprimer la version ${ver} (.exe) ?`)) return;
    setDeletingLoaderVersion(ver);
    try { await api.deleteLoaderVersion(ver); await load(); }
    catch (err) { setError(err.message); }
    finally { setDeletingLoaderVersion(null); }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Menoria</h1>
          <p className="text-sm text-gray-500 mt-1">
            Agent Java <span className="font-mono text-blue-400">.jar</span> + Loader <span className="font-mono text-purple-400">.exe</span>
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

      <ProductAnalytics productKey="MENORIA" dauProductId="MENORIA" />

      {/* Stats JAR */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Téléchargements Total</span>
              <Download className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold">{stats.totalDownloads ?? 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Aujourd'hui</span>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-400">
              {stats.dailyDownloads?.at(-1)?.count ?? 0}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Versions publiées</span>
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-400">{versions.length}</p>
          </div>
        </div>
      )}

      {/* Chart JAR */}
      {stats?.dailyDownloads?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Téléchargements .jar (30 derniers jours)</h2>
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
              <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* JAR Upload Card */}
        <div className="bg-gray-900 border border-blue-900/40 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" /> Agent Java (.jar)
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
                Fichier <span className="font-mono text-blue-400">.jar</span>
              </label>
              <input
                id="menoria-file-input"
                type="file"
                accept=".jar"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3
                  file:rounded file:border-0 file:text-sm file:bg-gray-700
                  file:text-gray-300 hover:file:bg-gray-600 cursor-pointer"
              />
              {file && <p className="text-xs text-gray-500 mt-1">{file.name} — {formatSize(file.size)}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Version (ex: 1.0.0)</label>
              <input type="text" value={version} onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Changelog</label>
              <textarea value={changelog} onChange={(e) => setChangelog(e.target.value)}
                rows={4} placeholder={"- Fix injection\n- Amélioration stabilité..."}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-blue-500" />
            </div>
            <button type="submit" disabled={uploading}
              className="w-full flex items-center justify-center gap-2 bg-blue-700
                hover:bg-blue-600 disabled:bg-gray-700 text-white font-medium py-2.5 rounded-lg transition-colors">
              {uploading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Upload en cours...</>
              ) : (
                <><Upload className="w-4 h-4" /> Publier menoria.jar</>
              )}
            </button>
          </form>
        </div>

        {/* Loader .exe Upload Card */}
        <div className="bg-gray-900 border border-purple-900/40 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-400" /> Loader (.exe)
          </h2>

          {loaderSuccess && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-4">
              {loaderSuccess}
            </div>
          )}
          {loaderError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">
              {loaderError}
            </div>
          )}

          <form onSubmit={handleLoaderUpload} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Fichier <span className="font-mono text-purple-400">.exe</span>
              </label>
              <input
                id="loader-file-input"
                type="file"
                accept=".exe"
                onChange={(e) => setLoaderFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3
                  file:rounded file:border-0 file:text-sm file:bg-gray-700
                  file:text-gray-300 hover:file:bg-gray-600 cursor-pointer"
              />
              {loaderFile && <p className="text-xs text-gray-500 mt-1">{loaderFile.name} — {formatSize(loaderFile.size)}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Version (ex: 1.0.0)</label>
              <input type="text" value={loaderVersion} onChange={(e) => setLoaderVersion(e.target.value)}
                placeholder="1.0.0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Changelog</label>
              <textarea value={loaderChangelog} onChange={(e) => setLoaderChangelog(e.target.value)}
                rows={4} placeholder={"- Correction bug au démarrage\n- Nouveau splash screen..."}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-purple-500" />
            </div>
            <button type="submit" disabled={loaderUploading}
              className="w-full flex items-center justify-center gap-2 bg-purple-800
                hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium py-2.5 rounded-lg transition-colors">
              {loaderUploading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Upload en cours...</>
              ) : (
                <><Upload className="w-4 h-4" /> Publier Loader.exe</>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Historique Loader .exe */}
      {loaderVersions.length > 0 && (
        <div className="bg-gray-900 border border-purple-900/40 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
              Historique Loader (.exe)
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
                {loaderVersions.map((v, idx) => (
                  <tr key={v.version} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <span className="font-mono text-purple-400">v{v.version}</span>
                      {idx === 0 && (
                        <span className="ml-2 text-xs bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded-full">Actuelle</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{v.filename}</td>
                    <td className="px-4 py-3 text-gray-400">{formatSize(v.size)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(v.uploadedAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={v.changelog}>{v.changelog}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleLoaderDelete(v.version)}
                        disabled={deletingLoaderVersion === v.version}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300
                          disabled:opacity-40 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors">
                        <Trash2 className="w-3 h-3" />
                        {deletingLoaderVersion === v.version ? '...' : 'Supprimer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sessions par version (jar) */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" /> Sessions par version (jar)
        </h2>
        <p className="text-xs text-gray-500 mb-4">Nombre de fois où le jar a été servi par version.</p>
        {stats?.activationsByVersion?.length > 0 ? (
          <div className="space-y-2">
            {stats.activationsByVersion.map((v) => (
              <div key={v.version} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                <span className="font-mono text-blue-400">v{v.version}</span>
                <span className="text-gray-400">{v.count} session(s)</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600 text-sm">Aucune version publiée</div>
        )}
      </div>

      {/* Historique versions .jar */}
      {versions.length > 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Historique des versions (.jar)</h2>
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
                      <span className="font-mono text-blue-400">v{v.version}</span>
                      {idx === 0 && (
                        <span className="ml-2 text-xs bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-full">Actuelle</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{v.filename}</td>
                    <td className="px-4 py-3 text-gray-400">{formatSize(v.size)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(v.uploadedAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={v.changelog}>{v.changelog}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(v.version)}
                        disabled={deletingVersion === v.version}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300
                          disabled:opacity-40 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors">
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
      ) : (
        <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
          <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun jar publié. Uploadez votre premier <span className="font-mono">menoria.jar</span> ci-dessus.</p>
        </div>
      )}
    </div>
  );
}
