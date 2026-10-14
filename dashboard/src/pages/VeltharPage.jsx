import React, { useState, useEffect } from 'react';
import { Upload, RefreshCw, Download, TrendingUp, Package, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import ProductAnalytics from '../components/ProductAnalytics';
import { formatDate } from '../lib/utils';

export default function VeltharPage() {
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
  const [uploadProgress, setUploadProgress] = useState(null);
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
  const [launcherProgress, setLauncherProgress] = useState(null);
  const [deletingLauncherVersion, setDeletingLauncherVersion] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, v, ls, lv] = await Promise.all([
        api.getVeltharStats(),
        api.getVeltharVersions(),
        api.getVeltharLauncherStats(),
        api.getVeltharLauncherVersions(),
      ]);
      setStats(s);
      setVersions(v ?? []);
      setLauncherStats(ls);
      setLauncherVersions(lv ?? []);
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
      formData.append('product', 'VELTHAR_LOADER');
      formData.append('mandatory', 'false');
      const result = await api.uploadVeltharSoftware(formData, setUploadProgress);
      setUploadSuccess(`velthar v${result.version} uploadé.`);
      setFile(null); setVersion(''); setChangelog('');
      const input = document.getElementById('velthar-file-input');
      if (input) input.value = '';
      await load();
    } catch (err) { setUploadError(err.message); }
    finally { setUploading(false); setUploadProgress(null); }
  };

  const handleDelete = async (ver) => {
    if (!window.confirm(`Supprimer la version ${ver} (.jar) ?`)) return;
    setDeletingVersion(ver);
    try { await api.deleteVeltharVersion(ver); await load(); }
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
      formData.append('product', 'VELTHAR_LAUNCHER');
      formData.append('mandatory', 'false');
      const result = await api.uploadVeltharLauncherSoftware(formData, setLauncherProgress);
      setLauncherSuccess(`VeltharLoader v${result.version} uploadé.`);
      setLauncherFile(null); setLauncherVersion(''); setLauncherChangelog('');
      const input = document.getElementById('veltharl-file-input');
      if (input) input.value = '';
      await load();
    } catch (err) { setLauncherError(err.message); }
    finally { setLauncherUploading(false); setLauncherProgress(null); }
  };

  const handleLauncherDelete = async (ver) => {
    if (!window.confirm(`Supprimer la version ${ver} (.exe) ?`)) return;
    setDeletingLauncherVersion(ver);
    try { await api.deleteVeltharLauncherVersion(ver); await load(); }
    catch (err) { setError(err.message); }
    finally { setDeletingLauncherVersion(null); }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const UploadProgress = ({ progress, color = 'orange' }) => {
    if (progress === null) return null;
    const colors = {
      orange: { bar: 'bg-orange-500', text: 'text-orange-400' },
      amber:  { bar: 'bg-amber-500',  text: 'text-amber-400' },
    };
    const c = colors[color] || colors.orange;
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
          <h1 className="text-2xl font-bold">Velthar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Agent Java <span className="font-mono text-orange-400">.jar</span> + Loader <span className="font-mono text-amber-400">.exe</span>
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

      <ProductAnalytics productKey="VELTHAR_LOADER" dauProductId="VELTHAR_LOADER" />

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Téléchargements Total</span>
              <Download className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-2xl font-bold">{stats.totalDownloads ?? 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Aujourd'hui</span>
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-orange-400">
              {stats.dailyDownloads?.at(-1)?.count ?? 0}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Versions publiées</span>
              <Package className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-orange-400">{versions.length}</p>
          </div>
        </div>
      )}

      {/* Upload cards */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* JAR Upload Card */}
        <div className="bg-gray-900 border border-orange-900/40 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-orange-400" /> Agent Java (.jar)
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
                Fichier <span className="font-mono text-orange-400">.jar</span>
              </label>
              <input
                id="velthar-file-input"
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Changelog</label>
              <textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                rows={4}
                placeholder={"- Fix injection\n- Amélioration stabilité..."}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-orange-500"
              />
            </div>

            <button type="submit" disabled={uploading}
              className="w-full flex items-center justify-center gap-2 bg-orange-700
                hover:bg-orange-600 disabled:bg-gray-700 text-white font-medium
                py-2.5 rounded-lg transition-colors">
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Publier velthar.jar
                </>
              )}
            </button>
            <UploadProgress progress={uploadProgress} color="orange" />
          </form>
        </div>

        {/* Launcher .exe Upload Card */}
        <div className="bg-gray-900 border border-amber-900/40 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-400" /> Loader (.exe)
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
                Fichier <span className="font-mono text-amber-400">.exe</span>
              </label>
              <input
                id="veltharl-file-input"
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Changelog</label>
              <textarea
                value={launcherChangelog}
                onChange={(e) => setLauncherChangelog(e.target.value)}
                rows={4}
                placeholder={"- Correction bug au démarrage\n- Nouveau splash screen..."}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-amber-500"
              />
            </div>

            <button type="submit" disabled={launcherUploading}
              className="w-full flex items-center justify-center gap-2 bg-amber-700
                hover:bg-amber-600 disabled:bg-gray-700 text-white font-medium
                py-2.5 rounded-lg transition-colors">
              {launcherUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Publier VeltharLoader.exe
                </>
              )}
            </button>
            <UploadProgress progress={launcherProgress} color="amber" />
          </form>
        </div>
      </div>

      {/* Launcher version history */}
      {launcherVersions.length > 0 && (
        <div className="bg-gray-900 border border-amber-900/40 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
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
                {launcherVersions.map((v, idx) => (
                  <tr key={v.version} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <span className="font-mono text-amber-400">v{v.version}</span>
                      {idx === 0 && (
                        <span className="ml-2 text-xs bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full">
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

      {/* JAR version history */}
      {versions.length > 0 ? (
        <div className="bg-gray-900 border border-orange-900/40 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              Historique Agent (.jar)
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
                {versions.map((v, idx) => (
                  <tr key={v.version} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <span className="font-mono text-orange-400">v{v.version}</span>
                      {idx === 0 && (
                        <span className="ml-2 text-xs bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded-full">
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
      ) : (
        <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
          <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun jar publié. Uploadez votre premier <span className="font-mono">velthar.jar</span> ci-dessus.</p>
        </div>
      )}
    </div>
  );
}
