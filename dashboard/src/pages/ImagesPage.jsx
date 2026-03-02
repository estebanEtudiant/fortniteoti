import React, { useState, useEffect } from 'react';
import { Image, Upload, Check, Save } from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';

export default function ImagesPage() {
  const [settings, setSettings]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Seules les images sont acceptées.'); return; }
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      setSettings(s => ({ ...s, screenshotUrl: url }));
    } catch (err) { alert(err.message); }
    finally { setUploading(false); }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Image className="w-6 h-6 text-cyan-400" /> Images boutique
      </h1>

      <div className="space-y-6 max-w-2xl">
        {/* Screenshot logiciel */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
            <Image className="w-4 h-4 text-cyan-400" /> Screenshot logiciel
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Affiché dans la section "Le Logiciel" de la page d'accueil du storefront.
          </p>
          {settings && (
            <div className="space-y-3">
              {/* Drag & drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => document.getElementById('img-upload-input').click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer select-none transition-colors
                  ${dragOver ? 'border-cyan-400 bg-cyan-400/5' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/40'}`}>
                {uploading ? (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm">Upload en cours...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Upload className="w-8 h-8" />
                    <p className="text-sm">
                      Glisse une image ici ou{' '}
                      <span className="text-cyan-400 font-medium">clique pour choisir</span>
                    </p>
                    <p className="text-xs text-gray-600">PNG, JPG, WEBP, GIF — max 5 Mo</p>
                  </div>
                )}
                <input
                  id="img-upload-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleFile(e.target.files[0])}
                />
              </div>

              {/* URL manuelle */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Ou entrer une URL directement</label>
                <input
                  type="url"
                  value={settings.screenshotUrl || ''}
                  onChange={e => setSettings(s => ({ ...s, screenshotUrl: e.target.value }))}
                  className="w-full text-sm"
                  placeholder="https://..."
                />
              </div>

              {/* Aperçu */}
              {settings.screenshotUrl && (
                <div className="rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
                  <p className="text-xs text-gray-500 px-3 py-1.5 border-b border-gray-700">Aperçu</p>
                  <img
                    src={settings.screenshotUrl}
                    alt="Screenshot logiciel"
                    className="w-full max-h-64 object-contain"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={saving || !settings}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors
            ${saved ? 'bg-green-600 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-gray-700'}`}>
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : saved ? (
            <><Check className="w-4 h-4" /> Sauvegardé !</>
          ) : (
            <><Save className="w-4 h-4" /> Sauvegarder</>
          )}
        </button>
      </div>
    </div>
  );
}
