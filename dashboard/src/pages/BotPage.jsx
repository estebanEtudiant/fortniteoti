import React, { useState, useEffect, Fragment } from 'react';
import {
  MessageSquare, Star, Settings, Globe, Mail, Key, Check, Save, Trash2,
  Megaphone, Upload, Send, Image as ImageIcon, Plus, X, User, Clock, Palette,
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

// Rendu Discord-markdown (gras/italique/souligné/barré/code) en JSX — sans dangerouslySetInnerHTML.
function inlineMd(line, keyPrefix) {
  const regex = /\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|\*(.+?)\*|`(.+?)`/g;
  const tokens = [];
  let last = 0, m, idx = 0;
  while ((m = regex.exec(line))) {
    if (m.index > last) tokens.push(line.slice(last, m.index));
    const key = `${keyPrefix}-${idx++}`;
    if (m[1] !== undefined) tokens.push(<strong key={key}>{m[1]}</strong>);
    else if (m[2] !== undefined) tokens.push(<u key={key}>{m[2]}</u>);
    else if (m[3] !== undefined) tokens.push(<s key={key}>{m[3]}</s>);
    else if (m[4] !== undefined) tokens.push(<em key={key}>{m[4]}</em>);
    else if (m[5] !== undefined) tokens.push(<code key={key} className="bg-black/30 px-1 rounded text-[0.85em]">{m[5]}</code>);
    last = regex.lastIndex;
  }
  if (last < line.length) tokens.push(line.slice(last));
  return tokens;
}
function MarkdownPreview({ text, className }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <p className={className}>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {inlineMd(line, `l${i}`)}
        </Fragment>
      ))}
    </p>
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

  const blankAnnounce = {
    channelId: '', color: '#00b8d9',
    authorName: '', authorIconUrl: '', authorUrl: '',
    title: '', url: '', message: '',
    fields: [],
    thumbnailUrl: '', imageUrl: '',
    footerText: '', footerIconUrl: '',
    showTimestamp: true, mentionEveryone: true,
  };
  const [announce, setAnnounce]           = useState(blankAnnounce);
  const [uploadingField, setUploadingField] = useState(null);
  const [publishing, setPublishing]       = useState(false);
  const [published, setPublished]         = useState(false);
  const [savingDraft, setSavingDraft]     = useState(false);
  const [draftSaved, setDraftSaved]       = useState(false);
  const [announceErr, setAnnounceErr]     = useState('');
  const [templates, setTemplates]         = useState({});
  const [loadingT, setLoadingT]           = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [deletingTemplate, setDeletingTemplate]     = useState(false);

  useEffect(() => {
    api.getAdminReviews()
      .then(setReviews)
      .catch(console.error)
      .finally(() => setLoadingR(false));
    api.getBotConfig()
      .then(c => {
        setConfig(c);
        setAnnounce(a => ({ ...a, channelId: c.update_channel_id || '' }));
      })
      .catch(console.error)
      .finally(() => setLoadingC(false));
    api.getUpdateTemplates()
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoadingT(false));
  }, []);

  const applyTemplate = (id) => {
    setSelectedTemplateId(id);
    setAnnounceErr('');
    if (!id) { setAnnounce(a => ({ ...blankAnnounce, channelId: a.channelId })); return; }
    const t = templates[id];
    if (!t) return;
    setAnnounce({
      channelId:       t.channelId || '',
      color:           t.color || '#00b8d9',
      authorName:      t.authorName || '',
      authorIconUrl:   t.authorIconUrl || '',
      authorUrl:       t.authorUrl || '',
      title:           t.title || '',
      url:             t.url || '',
      message:         t.message || '',
      fields:          Array.isArray(t.fields) ? t.fields : [],
      thumbnailUrl:    t.thumbnailUrl || '',
      imageUrl:        t.imageUrl || '',
      footerText:      t.footerText || '',
      footerIconUrl:   t.footerIconUrl || '',
      showTimestamp:   t.showTimestamp ?? true,
      mentionEveryone: t.mentionEveryone ?? true,
    });
  };

  const uploadAnnounceImage = async (field, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAnnounceErr(''); setUploadingField(field);
    try {
      const { url } = await api.uploadImage(file);
      setAnnounce(a => ({ ...a, [field]: url }));
    } catch (err) { setAnnounceErr(err.message || "Erreur lors de l'upload de l'image"); }
    finally { setUploadingField(null); }
  };

  const addField = () => setAnnounce(a => ({ ...a, fields: [...a.fields, { name: '', value: '', inline: true }] }));
  const updateField = (i, patch) => setAnnounce(a => ({
    ...a, fields: a.fields.map((f, idx) => idx === i ? { ...f, ...patch } : f),
  }));
  const removeField = (i) => setAnnounce(a => ({ ...a, fields: a.fields.filter((_, idx) => idx !== i) }));

  const buildEmbedPayload = () => ({
    channelId:       announce.channelId.trim(),
    color:           announce.color || undefined,
    authorName:      announce.authorName.trim() || undefined,
    authorIconUrl:   announce.authorIconUrl.trim() || undefined,
    authorUrl:       announce.authorUrl.trim() || undefined,
    title:           announce.title.trim() || undefined,
    url:             announce.url.trim() || undefined,
    message:         announce.message.trim() || undefined,
    fields:          announce.fields.filter(f => f.name.trim() && f.value.trim())
      .map(f => ({ name: f.name.trim(), value: f.value.trim(), inline: !!f.inline })),
    thumbnailUrl:    announce.thumbnailUrl.trim() || undefined,
    imageUrl:        announce.imageUrl.trim() || undefined,
    footerText:      announce.footerText.trim() || undefined,
    footerIconUrl:   announce.footerIconUrl.trim() || undefined,
    showTimestamp:   announce.showTimestamp,
    mentionEveryone: announce.mentionEveryone,
  });

  const handlePublishAnnounce = async () => {
    setAnnounceErr('');
    if (!announce.channelId.trim()) { setAnnounceErr('ID du salon Discord requis.'); return; }
    const hasFields = announce.fields.some(f => f.name.trim() && f.value.trim());
    if (!announce.title.trim() && !announce.message.trim() && !hasFields) {
      setAnnounceErr('Titre, message ou au moins un champ requis.'); return;
    }
    setPublishing(true);
    try {
      await api.announceUpdate(buildEmbedPayload());
      setPublished(true);
      setTimeout(() => setPublished(false), 2500);
    } catch (err) { setAnnounceErr(err.message || 'Échec de la publication.'); }
    finally { setPublishing(false); }
  };

  const handleSaveAnnounceDraft = async () => {
    setAnnounceErr('');
    if (!announce.channelId.trim()) { setAnnounceErr('ID du salon Discord requis.'); return; }

    let name = selectedTemplateId ? templates[selectedTemplateId]?.name : '';
    if (!selectedTemplateId) {
      name = prompt('Nom du modèle (ex: Fortnite, ARC Raiders...) :', announce.title || '');
      if (!name) return;
    }

    setSavingDraft(true);
    try {
      const payload = { name, ...buildEmbedPayload(), channelId: announce.channelId.trim() };
      const result = selectedTemplateId
        ? await api.updateUpdateTemplate(selectedTemplateId, payload)
        : await api.createUpdateTemplate(payload);

      setTemplates(t => ({ ...t, [result.id]: result }));
      setSelectedTemplateId(result.id);
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } catch (err) { setAnnounceErr(err.message || "Échec de l'enregistrement."); }
    finally { setSavingDraft(false); }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;
    const name = templates[selectedTemplateId]?.name || 'ce modèle';
    if (!confirm(`Supprimer le modèle "${name}" ?`)) return;
    setDeletingTemplate(true);
    try {
      await api.deleteUpdateTemplate(selectedTemplateId);
      setTemplates(t => { const n = { ...t }; delete n[selectedTemplateId]; return n; });
      applyTemplate('');
    } catch (err) { setAnnounceErr(err.message || 'Échec de la suppression.'); }
    finally { setDeletingTemplate(false); }
  };

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
    { id: 'update',  label: 'Annonce mise à jour', icon: Megaphone },
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

      {/* Tab Annonce mise à jour / embed personnalisé */}
      {tab === 'update' && (
        <div className="grid lg:grid-cols-2 gap-6 max-w-6xl">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-cyan-400" /> Publier un embed
            </h2>

            {announceErr && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded px-3 py-2">
                {announceErr}
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1">Modèle enregistré</label>
              <div className="flex items-center gap-2">
                <select value={selectedTemplateId} onChange={e => applyTemplate(e.target.value)}
                  disabled={loadingT} className="w-full text-sm">
                  <option value="">+ Nouveau (vierge)</option>
                  {Object.entries(templates)
                    .sort((a, b) => (b[1].updatedAt || '').localeCompare(a[1].updatedAt || ''))
                    .map(([id, t]) => <option key={id} value={id}>{t.name}</option>)}
                </select>
                {selectedTemplateId && (
                  <button type="button" onClick={handleDeleteTemplate} disabled={deletingTemplate}
                    title="Supprimer ce modèle"
                    className="shrink-0 p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-1">Choisis un modèle existant (ex: par jeu) ou pars d'une page vierge.</p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Salon Discord (ID)</label>
              <input type="text" value={announce.channelId}
                onChange={e => setAnnounce(a => ({ ...a, channelId: e.target.value }))}
                placeholder="1234567890123456"
                className="w-full text-sm" />
              <p className="text-xs text-gray-600 mt-1">Clic droit sur le salon Discord → Copier l'ID (mode développeur activé). N'importe quel salon.</p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Palette className="w-3 h-3" /> Couleur de la barre</label>
              <div className="flex items-center gap-2">
                <input type="color" value={announce.color}
                  onChange={e => setAnnounce(a => ({ ...a, color: e.target.value }))}
                  className="w-10 h-9 p-0.5 bg-gray-950 border border-gray-800 rounded cursor-pointer" />
                <input type="text" value={announce.color}
                  onChange={e => setAnnounce(a => ({ ...a, color: e.target.value }))}
                  placeholder="#00b8d9" className="w-32 text-sm font-mono" />
              </div>
            </div>

            {/* Auteur */}
            <div className="border border-gray-800 rounded-lg p-3 space-y-2">
              <p className="text-xs text-gray-400 flex items-center gap-1"><User className="w-3 h-3" /> Auteur (bandeau au-dessus du titre)</p>
              <input type="text" value={announce.authorName}
                onChange={e => setAnnounce(a => ({ ...a, authorName: e.target.value }))}
                placeholder="Nom de l'auteur (optionnel)" className="w-full text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={announce.authorIconUrl}
                  onChange={e => setAnnounce(a => ({ ...a, authorIconUrl: e.target.value }))}
                  placeholder="URL icône auteur" className="w-full text-xs" />
                <input type="text" value={announce.authorUrl}
                  onChange={e => setAnnounce(a => ({ ...a, authorUrl: e.target.value }))}
                  placeholder="URL lien auteur" className="w-full text-xs" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Titre</label>
              <input type="text" value={announce.title}
                onChange={e => setAnnounce(a => ({ ...a, title: e.target.value }))}
                placeholder="ARC RAIDERS - 29/07/2026"
                className="w-full text-sm" />
              <input type="text" value={announce.url}
                onChange={e => setAnnounce(a => ({ ...a, url: e.target.value }))}
                placeholder="URL du titre (optionnel, rend le titre cliquable)"
                className="w-full text-xs mt-1.5" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Message <span className="text-gray-600">(**gras**, *italique*, __souligné__, ~~barré~~, `code`)</span>
              </label>
              <textarea rows={4} value={announce.message}
                onChange={e => setAnnounce(a => ({ ...a, message: e.target.value }))}
                placeholder="Updated for new game versions"
                className="w-full text-sm resize-y font-mono" />
            </div>

            {/* Champs */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Champs</span>
                <button type="button" onClick={addField}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300">
                  <Plus className="w-3 h-3" /> Ajouter un champ
                </button>
              </div>
              <div className="space-y-2">
                {announce.fields.map((f, i) => (
                  <div key={i} className="border border-gray-800 rounded-lg p-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input type="text" value={f.name} onChange={e => updateField(i, { name: e.target.value })}
                        placeholder="Nom" className="flex-1 text-xs" />
                      <button type="button" onClick={() => removeField(i)} className="shrink-0 text-gray-500 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea rows={2} value={f.value} onChange={e => updateField(i, { value: e.target.value })}
                      placeholder="Valeur" className="w-full text-xs resize-y" />
                    <label className="flex items-center gap-1.5 text-xs text-gray-400">
                      <input type="checkbox" checked={!!f.inline} onChange={e => updateField(i, { inline: e.target.checked })} />
                      Sur la même ligne (inline)
                    </label>
                  </div>
                ))}
                {announce.fields.length === 0 && (
                  <p className="text-xs text-gray-600">Aucun champ. Utile pour lister des infos côte à côte (ex: Version / Statut).</p>
                )}
              </div>
            </div>

            <div>
              <span className="block text-xs text-gray-400 mb-1">Miniature (petite image, coin supérieur droit)</span>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg border border-gray-800 bg-gray-950 overflow-hidden flex items-center justify-center shrink-0">
                  {announce.thumbnailUrl
                    ? <img src={announce.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    : <ImageIcon className="w-4 h-4 text-gray-700" />}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs px-3 py-2 rounded-lg cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> {uploadingField === 'thumbnailUrl' ? 'Envoi…' : 'Uploader'}
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden"
                      onChange={e => uploadAnnounceImage('thumbnailUrl', e)} disabled={uploadingField === 'thumbnailUrl'} />
                  </label>
                  <input value={announce.thumbnailUrl}
                    onChange={e => setAnnounce(a => ({ ...a, thumbnailUrl: e.target.value }))}
                    className="w-full text-xs" placeholder="…ou colle une URL d'image" />
                  {announce.thumbnailUrl && (
                    <button type="button" onClick={() => setAnnounce(a => ({ ...a, thumbnailUrl: '' }))}
                      className="text-xs text-gray-500 hover:text-red-400">Retirer</button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <span className="block text-xs text-gray-400 mb-1">Image principale (grande, en bas de l'embed)</span>
              <div className="flex items-start gap-4">
                <div className="w-32 h-20 rounded-lg border border-gray-800 bg-gray-950 overflow-hidden flex items-center justify-center shrink-0">
                  {announce.imageUrl
                    ? <img src={announce.imageUrl} alt="" className="w-full h-full object-cover" />
                    : <ImageIcon className="w-5 h-5 text-gray-700" />}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm px-3 py-2 rounded-lg cursor-pointer">
                    <Upload className="w-4 h-4" /> {uploadingField === 'imageUrl' ? 'Envoi…' : 'Uploader une image'}
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden"
                      onChange={e => uploadAnnounceImage('imageUrl', e)} disabled={uploadingField === 'imageUrl'} />
                  </label>
                  <input value={announce.imageUrl}
                    onChange={e => setAnnounce(a => ({ ...a, imageUrl: e.target.value }))}
                    className="w-full text-xs" placeholder="…ou colle une URL d'image" />
                  {announce.imageUrl && (
                    <button type="button" onClick={() => setAnnounce(a => ({ ...a, imageUrl: '' }))}
                      className="text-xs text-gray-500 hover:text-red-400">Retirer l'image</button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border border-gray-800 rounded-lg p-3 space-y-2">
              <p className="text-xs text-gray-400">Pied de page</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={announce.footerText}
                  onChange={e => setAnnounce(a => ({ ...a, footerText: e.target.value }))}
                  placeholder="(vide = aucun pied de page)" className="w-full text-xs" />
                <input type="text" value={announce.footerIconUrl}
                  onChange={e => setAnnounce(a => ({ ...a, footerIconUrl: e.target.value }))}
                  placeholder="URL icône pied de page" className="w-full text-xs" />
              </div>
              <label className="flex items-center gap-1.5 text-xs text-gray-400">
                <input type="checkbox" checked={announce.showTimestamp}
                  onChange={e => setAnnounce(a => ({ ...a, showTimestamp: e.target.checked }))} />
                <Clock className="w-3 h-3" /> Afficher l'horodatage
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={announce.mentionEveryone}
                onChange={e => setAnnounce(a => ({ ...a, mentionEveryone: e.target.checked }))} />
              Mentionner @everyone
            </label>

            <div className="flex items-center gap-3">
              <button onClick={handlePublishAnnounce} disabled={publishing}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400
                  disabled:opacity-50 text-black font-semibold rounded-lg transition-colors text-sm">
                {publishing ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : published ? (
                  <><Check className="w-4 h-4" /> Publié !</>
                ) : (
                  <><Send className="w-4 h-4" /> Publier sur Discord</>
                )}
              </button>

              <button onClick={handleSaveAnnounceDraft} disabled={savingDraft}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700
                  disabled:opacity-50 text-gray-200 font-medium rounded-lg transition-colors text-sm">
                {savingDraft ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : draftSaved ? (
                  <><Check className="w-4 h-4" /> Enregistré !</>
                ) : (
                  <><Save className="w-4 h-4" /> {selectedTemplateId ? 'Mettre à jour le modèle' : 'Enregistrer comme modèle'}</>
                )}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-6 self-start">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-base font-semibold mb-4 text-gray-400">Aperçu</h2>
              <div className="bg-[#313338] rounded-lg p-4 text-sm">
                {announce.mentionEveryone && (
                  <p className="text-[#dbdee1] mb-2">
                    <span className="bg-[#3c4270] text-[#c9cdfb] px-1 rounded">@everyone</span>
                  </p>
                )}
                <div className="rounded bg-[#2b2d31] pl-3 pr-4 py-3 max-w-md relative"
                  style={{ borderLeft: `4px solid ${announce.color || '#5865F2'}` }}>
                  {announce.authorName && (
                    <div className="flex items-center gap-2 mb-1.5">
                      {announce.authorIconUrl && (
                        <img src={announce.authorIconUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                      )}
                      <span className="text-white text-xs font-medium">{announce.authorName}</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {announce.title && (
                        <p className="text-white font-semibold mb-1 break-words">
                          {announce.url ? <span className="text-[#00a8fc] hover:underline">{announce.title}</span> : announce.title}
                        </p>
                      )}
                      <MarkdownPreview text={announce.message} className="text-[#dbdee1] break-words" />
                    </div>
                    {announce.thumbnailUrl && (
                      <img src={announce.thumbnailUrl} alt="" className="w-16 h-16 rounded object-cover shrink-0" />
                    )}
                  </div>

                  {announce.fields.filter(f => f.name || f.value).length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
                      {announce.fields.filter(f => f.name || f.value).map((f, i) => (
                        <div key={i} className={f.inline ? 'w-[calc(33%-0.75rem)] min-w-[110px]' : 'w-full'}>
                          <p className="text-white text-xs font-semibold break-words">{f.name || ' '}</p>
                          <MarkdownPreview text={f.value} className="text-[#dbdee1] text-xs break-words" />
                        </div>
                      ))}
                    </div>
                  )}

                  {announce.imageUrl && (
                    <img src={announce.imageUrl} alt="" className="mt-3 rounded max-h-48 w-full object-cover" />
                  )}

                  {(announce.footerText || announce.showTimestamp) && (
                    <div className="flex items-center gap-2 mt-3 text-[#949ba4] text-xs">
                      {announce.footerText && announce.footerIconUrl && (
                        <img src={announce.footerIconUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                      )}
                      <span>
                        {announce.footerText}
                        {announce.footerText && announce.showTimestamp && ' • '}
                        {announce.showTimestamp && "aujourd'hui"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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
