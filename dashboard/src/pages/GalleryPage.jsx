import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image, Trash2, Copy, Upload, X, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

const DEFAULT_TABS = [
  { id: 'ftn', label: 'FTN Optimizer' },
  { id: 'ng',  label: 'NG Client' },
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GalleryPage({ tabs = DEFAULT_TABS, title = "Galerie d'images" }) {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(async (tab) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getGallery(tab);
      setImages(data.images || []);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(activeTab);
  }, [activeTab, load]);

  const handleUpload = async (files) => {
    const file = files[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Format non supporté. Utilisez jpg, png, webp ou gif.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`Fichier trop lourd (max ${MAX_SIZE_MB} MB).`);
      return;
    }

    setError('');
    setUploading(true);
    setUploadProgress('Envoi en cours...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.uploadGallery(activeTab, formData);
      setUploadProgress('Upload réussi !');
      setTimeout(() => setUploadProgress(null), 2000);
      load(activeTab);
    } catch (err) {
      setError(err.message || "Erreur lors de l'upload");
      setUploadProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e) => {
    handleUpload(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`Supprimer "${filename}" ? Cette action est irréversible.`)) return;
    try {
      await api.deleteGallery(activeTab, filename);
      setImages(prev => prev.filter(img => img.filename !== filename));
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Image className="w-6 h-6 text-cyan-400" />
        <h1 className="text-xl font-bold text-white">{title}</h1>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 ${tabs.length <= 1 ? 'hidden' : ''}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-transparent'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Upload zone */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${dragOver
            ? 'border-cyan-400 bg-cyan-400/10'
            : 'border-gray-700 hover:border-gray-500 bg-gray-900/50'
          }
          ${uploading ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif"
          className="hidden"
          onChange={handleFileInput}
          disabled={uploading}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-cyan-400 text-sm">{uploadProgress}</p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-300 font-medium">Glisser-déposer ou cliquer pour uploader</p>
            <p className="text-gray-500 text-sm mt-1">JPG, PNG, WEBP, GIF — max {MAX_SIZE_MB} MB</p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
          <X className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload success banner */}
      {uploadProgress && !uploading && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{uploadProgress}</span>
        </div>
      )}

      {/* Image grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune image dans cette galerie</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {images.map(img => (
            <div
              key={img.filename}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col group"
            >
              {/* Thumbnail */}
              <div className="relative w-full aspect-square bg-gray-800 overflow-hidden">
                <img
                  src={img.url}
                  alt={img.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Info & actions */}
              <div className="p-2 flex flex-col gap-1.5">
                <p
                  className="text-xs text-gray-400 truncate"
                  title={img.filename}
                >
                  {img.filename}
                </p>
                <p className="text-xs text-gray-600">{formatBytes(img.size)}</p>

                <div className="flex gap-1 mt-0.5">
                  <button
                    onClick={() => handleCopy(img.url)}
                    title="Copier l'URL"
                    className={`flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-md transition-colors
                      ${copiedUrl === img.url
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-gray-800 text-gray-400 hover:bg-cyan-500/10 hover:text-cyan-400 border border-gray-700'}`}
                  >
                    {copiedUrl === img.url ? (
                      <><CheckCircle className="w-3 h-3" /> Copié</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copier URL</>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(img.filename)}
                    title="Supprimer"
                    className="p-1 rounded-md bg-gray-800 border border-gray-700 text-gray-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
