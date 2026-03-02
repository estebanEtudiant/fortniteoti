import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Star, Settings, Globe, Mail, Key, Check, Save, Trash2,
} from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import { formatDate } from '../lib/utils';

function StarDisplay({ count }) {
  return (
    <span className="text-yellow-400 text-sm">
      {'★'.repeat(count)}{'☆'.repeat(5 - count)}
    </span>
  );
}

export default function BotPage() {
  const [tab, setTab]           = useState('reviews');
  const [reviews, setReviews]   = useState([]);
  const [loadingR, setLoadingR] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const [config, setConfig]     = useState(null);
  const [loadingC, setLoadingC] = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    api.getAdminReviews()
      .then(setReviews)
      .catch(console.error)
      .finally(() => setLoadingR(false));
    api.getBotConfig()
      .then(setConfig)
      .catch(console.error)
      .finally(() => setLoadingC(false));
  }, []);

  const handleDelete = async (discordId, username) => {
    if (!confirm(`Supprimer l'avis de ${username} ?`)) return;
    setDeleting(discordId);
    try {
      await api.deleteReview(discordId);
      setReviews(r => r.filter(x => x.discordId !== discordId));
    } catch (err) { alert(err.message); }
    finally { setDeleting(null); }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const updated = await api.updateBotConfig(config);
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1)
    : null;

  const TABS = [
    { id: 'reviews', label: 'Avis clients', icon: Star },
    { id: 'config',  label: 'Configuration embeds', icon: Settings },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-cyan-400" /> Bot Discord
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-800">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${tab === t.id
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Avis */}
      {tab === 'reviews' && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Total avis</p>
              <p className="text-2xl font-bold text-cyan-400">{reviews.length}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Note moyenne</p>
              <p className="text-2xl font-bold text-yellow-400">{avg ? `${avg} / 5` : '—'}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">5 étoiles</p>
              <p className="text-2xl font-bold text-green-400">
                {reviews.filter(r => r.stars === 5).length}
              </p>
            </div>
          </div>

          {/* Table */}
          {loadingR ? <Loading /> : reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucun avis pour l'instant.</p>
              <p className="text-xs mt-1">Les avis soumis via Discord apparaîtront ici.</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-800/60">
                    <tr>
                      <th className="px-4 py-3 text-left">Auteur</th>
                      <th className="px-4 py-3 text-left">Note</th>
                      <th className="px-4 py-3 text-left">Avis</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map(r => (
                      <tr key={r.discordId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-200">{r.username}</p>
                          <p className="text-xs text-gray-500">{r.description}</p>
                        </td>
                        <td className="px-4 py-3"><StarDisplay count={r.stars} /></td>
                        <td className="px-4 py-3 text-gray-400 max-w-sm">
                          <p className="truncate" title={r.text}>"{r.text}"</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {r.createdAt ? formatDate(r.createdAt) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(r.discordId, r.username)}
                            disabled={deleting === r.discordId}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300
                              disabled:opacity-40 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors">
                            <Trash2 className="w-3 h-3" />
                            {deleting === r.discordId ? '...' : 'Supprimer'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Config */}
      {tab === 'config' && (
        <div>
          {loadingC ? <Loading /> : !config ? (
            <p className="text-gray-500">Impossible de charger la configuration.</p>
          ) : (
            <div className="space-y-6 max-w-2xl">
              {/* Welcome channel */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" /> Message de bienvenue — Salon
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Titre <span className="text-gray-600">(&#123;username&#125; = pseudo Discord)</span></label>
                    <input type="text" value={config.welcome_channel_title || ''}
                      onChange={e => setConfig(c => ({ ...c, welcome_channel_title: e.target.value }))}
                      className="w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Description <span className="text-gray-600">(Markdown supporté)</span></label>
                    <textarea rows={6} value={config.welcome_channel_desc || ''}
                      onChange={e => setConfig(c => ({ ...c, welcome_channel_desc: e.target.value }))}
                      className="w-full text-sm resize-y font-mono" />
                  </div>
                </div>
              </div>

              {/* Welcome DM */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" /> Message de bienvenue — DM privé
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Titre</label>
                    <input type="text" value={config.welcome_dm_title || ''}
                      onChange={e => setConfig(c => ({ ...c, welcome_dm_title: e.target.value }))}
                      className="w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <textarea rows={5} value={config.welcome_dm_desc || ''}
                      onChange={e => setConfig(c => ({ ...c, welcome_dm_desc: e.target.value }))}
                      className="w-full text-sm resize-y font-mono" />
                  </div>
                </div>
              </div>

              {/* Setup avis */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" /> Embed "Donner un avis"
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Titre</label>
                    <input type="text" value={config.setup_avis_title || ''}
                      onChange={e => setConfig(c => ({ ...c, setup_avis_title: e.target.value }))}
                      className="w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <textarea rows={4} value={config.setup_avis_desc || ''}
                      onChange={e => setConfig(c => ({ ...c, setup_avis_desc: e.target.value }))}
                      className="w-full text-sm resize-y font-mono" />
                  </div>
                </div>
              </div>

              {/* Tuto */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Key className="w-4 h-4 text-cyan-400" /> Embed "/tuto"
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Titre</label>
                    <input type="text" value={config.tuto_title || ''}
                      onChange={e => setConfig(c => ({ ...c, tuto_title: e.target.value }))}
                      className="w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Introduction (sous-titre)</label>
                    <textarea rows={3} value={config.tuto_intro || ''}
                      onChange={e => setConfig(c => ({ ...c, tuto_intro: e.target.value }))}
                      className="w-full text-sm resize-y font-mono" />
                  </div>
                </div>
              </div>

              <button onClick={handleSaveConfig} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400
                  disabled:opacity-50 text-black font-semibold rounded-lg transition-colors text-sm">
                {saving ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : saved ? (
                  <><Check className="w-4 h-4" /> Sauvegardé !</>
                ) : (
                  <><Save className="w-4 h-4" /> Sauvegarder</>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
