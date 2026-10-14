import React, { useState, useEffect } from 'react';
import {
  Gamepad2, CreditCard, Plus, Pencil, Trash2, X, Save, Eye, EyeOff, Star, Upload,
  Image as ImageIcon, Euro, ShoppingCart, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../lib/api';
import Collapsible from '../components/Collapsible';
import { SpooferStock } from './SpooferPage';

// ── helpers ──
const linesToArr = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const arrToLines = (a) => (a || []).join('\n');

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

// ════════════════════════════════ GAMES ════════════════════════════════
const GAME_STATUSES = ['NEW', 'UPDATED', 'UPDATING'];
const emptyGame = {
  slug: '', name: '', chip: '', logo: '', image: '', status: 'UPDATED',
  sinceFr: '', sinceEn: '', rating: 5, members: 0, tipsCount: 0, hue: 26,
  taglineFr: '', taglineEn: '', includesFr: [], includesEn: [], order: 0, visible: true,
};

function GameForm({ initial, onSave, onCancel }) {
  const DEFAULT_SEC = { fr: 'Ce qui est inclus', en: "What's included" };
  const [f, setF] = useState({ ...emptyGame, ...initial });
  const [sections, setSections] = useState(
    (initial?.sections && initial.sections.length)
      ? initial.sections.map((s) => ({ titleFr: s.titleFr || '', titleEn: s.titleEn || '', itemsFr: arrToLines(s.itemsFr), itemsEn: arrToLines(s.itemsEn) }))
      : [{ titleFr: DEFAULT_SEC.fr, titleEn: DEFAULT_SEC.en, itemsFr: arrToLines(initial?.includesFr), itemsEn: arrToLines(initial?.includesEn) }]
  );
  const setSec = (i, k, v) => setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));
  const addSec = () => setSections((prev) => [...prev, { titleFr: '', titleEn: '', itemsFr: '', itemsEn: '' }]);
  const rmSec = (i) => setSections((prev) => prev.filter((_, idx) => idx !== i));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [imgUploading, setImgUploading] = useState(false);
  const [gallery, setGallery] = useState(initial?.images || []);
  const [galUploading, setGalUploading] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setNum = (k) => (e) => setF({ ...f, [k]: e.target.value === '' ? '' : Number(e.target.value) });

  const uploadGalleryImg = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErr(''); setGalUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const { url } = await api.uploadGallery('shop', fd);
      setGallery((g) => [...g, url]);
    } catch (e2) { setErr(e2.message || "Erreur lors de l'upload de l'image"); }
    finally { setGalUploading(false); }
  };
  const rmGalleryImg = (i) => setGallery((g) => g.filter((_, idx) => idx !== i));
  const moveGalleryImg = (i, dir) => setGallery((g) => {
    const j = i + dir; if (j < 0 || j >= g.length) return g;
    const c = [...g]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErr(''); setImgUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { url } = await api.uploadGallery('shop', fd);
      setF((cur) => ({ ...cur, image: url }));
    } catch (e2) { setErr(e2.message || "Erreur lors de l'upload de l'image"); }
    finally { setImgUploading(false); }
  };

  const submit = async () => {
    setErr('');
    if (!f.slug || !f.name || !f.chip) { setErr('slug, nom et catégorie sont requis'); return; }
    setSaving(true);
    try {
      const { id, createdAt, updatedAt, ...rest } = f;
      const sectionsPayload = sections
        .map((s) => ({ titleFr: s.titleFr.trim(), titleEn: s.titleEn.trim(), itemsFr: linesToArr(s.itemsFr), itemsEn: linesToArr(s.itemsEn) }))
        .filter((s) => s.titleFr || s.titleEn || s.itemsFr.length || s.itemsEn.length);
      await onSave({
        ...rest,
        rating: Number(f.rating) || 0, members: Number(f.members) || 0,
        tipsCount: Number(f.tipsCount) || 0, hue: Number(f.hue) || 0, order: Number(f.order) || 0,
        sections: sectionsPayload,
        images: gallery,
        includesFr: sectionsPayload[0]?.itemsFr ?? [], includesEn: sectionsPayload[0]?.itemsEn ?? [],
      });
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-4 space-y-3">
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded px-3 py-2">{err}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Slug (id, ex: fortnite)"><input value={f.slug} onChange={set('slug')} className="w-full" placeholder="fortnite" /></Field>
        <Field label="Nom"><input value={f.name} onChange={set('name')} className="w-full" placeholder="Fortnite" /></Field>
        <Field label="Catégorie (chip)"><input value={f.chip} onChange={set('chip')} className="w-full" placeholder="Battle Royale" /></Field>
        <Field label="Logo (texte, \n = saut)"><input value={f.logo} onChange={set('logo')} className="w-full" placeholder="FORT\nNITE" /></Field>
        <Field label="Statut">
          <select value={f.status} onChange={set('status')} className="w-full">
            {GAME_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Ordre"><input type="number" value={f.order} onChange={setNum('order')} className="w-full" /></Field>
        <Field label="Depuis (FR)"><input value={f.sinceFr} onChange={set('sinceFr')} className="w-full" placeholder="7 mois" /></Field>
        <Field label="Depuis (EN)"><input value={f.sinceEn} onChange={set('sinceEn')} className="w-full" placeholder="7 months" /></Field>
        <Field label="Note (0-5)"><input type="number" step="0.1" value={f.rating} onChange={setNum('rating')} className="w-full" /></Field>
        <Field label="Membres"><input type="number" value={f.members} onChange={setNum('members')} className="w-full" /></Field>
        <Field label="Nb de tips"><input type="number" value={f.tipsCount} onChange={setNum('tipsCount')} className="w-full" /></Field>
        <Field label="Teinte (hue 0-360)"><input type="number" value={f.hue} onChange={setNum('hue')} className="w-full" /></Field>
      </div>

      {/* Image / artwork du jeu */}
      <div>
        <span className="block text-xs text-gray-400 mb-1">Image du jeu (artwork)</span>
        <div className="flex items-start gap-4">
          <div className="w-40 h-24 rounded-lg border border-gray-800 bg-gray-900 overflow-hidden flex items-center justify-center shrink-0">
            {f.image
              ? <img src={f.image} alt="" className="w-full h-full object-cover" />
              : <span className="text-gray-600 text-xs">aucune image</span>}
          </div>
          <div className="flex-1 space-y-2">
            <label className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm px-3 py-2 rounded-lg cursor-pointer">
              <Upload className="w-4 h-4" /> {imgUploading ? 'Envoi…' : 'Uploader une image'}
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={uploadImage} disabled={imgUploading} />
            </label>
            <input value={f.image} onChange={set('image')} className="w-full text-xs" placeholder="…ou colle une URL d'image" />
            {f.image && <button type="button" onClick={() => setF({ ...f, image: '' })} className="text-xs text-gray-500 hover:text-red-400">Retirer l'image</button>}
          </div>
        </div>
      </div>

      {/* Galerie d'images de la page produit (défilable + zoom côté shop) */}
      <div>
        <span className="block text-xs text-gray-400 mb-1">Galerie page produit (plusieurs images, défilables + zoom)</span>
        <div className="flex flex-wrap gap-2">
          {gallery.map((url, i) => (
            <div key={i} className="relative w-28 h-20 rounded-lg border border-gray-800 bg-gray-900 overflow-hidden group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                <button type="button" onClick={() => moveGalleryImg(i, -1)} disabled={i === 0} className="text-white text-xs px-1.5 py-0.5 rounded bg-gray-700/80 disabled:opacity-30">←</button>
                <button type="button" onClick={() => rmGalleryImg(i)} className="text-white p-1 rounded bg-red-600/80"><Trash2 className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => moveGalleryImg(i, 1)} disabled={i === gallery.length - 1} className="text-white text-xs px-1.5 py-0.5 rounded bg-gray-700/80 disabled:opacity-30">→</button>
              </div>
              <span className="absolute top-1 left-1 text-[10px] font-mono bg-black/60 text-gray-200 px-1 rounded">{i + 1}</span>
            </div>
          ))}
          <label className="w-28 h-20 rounded-lg border border-dashed border-gray-700 hover:border-cyan-500 bg-gray-900/50 flex flex-col items-center justify-center gap-1 cursor-pointer text-gray-500 hover:text-cyan-400 text-xs">
            <Upload className="w-4 h-4" /> {galUploading ? 'Envoi…' : 'Ajouter'}
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={uploadGalleryImg} disabled={galUploading} />
          </label>
        </div>
        <p className="text-[11px] text-gray-600 mt-1">Si vide, la page produit utilise l'image du jeu ci-dessus.</p>
      </div>

      <Field label="Tagline (FR)"><textarea value={f.taglineFr} onChange={set('taglineFr')} className="w-full" rows={2} /></Field>
      <Field label="Tagline (EN)"><textarea value={f.taglineEn} onChange={set('taglineEn')} className="w-full" rows={2} /></Field>
      {/* Sections / catégories de la page jeu (titre modifiable + ajout) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-200">Sections de la page (titre modifiable, ex : « Ce qui est inclus »)</span>
          <button type="button" onClick={addSec} className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-2.5 py-1.5 rounded-lg">
            <Plus className="w-3.5 h-3.5" /> Ajouter une catégorie
          </button>
        </div>
        {sections.map((s, i) => (
          <div key={i} className="border border-gray-800 rounded-lg p-3 space-y-2 bg-gray-900/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-500 shrink-0">#{i + 1}</span>
              <input value={s.titleFr} onChange={(e) => setSec(i, 'titleFr', e.target.value)} className="flex-1 min-w-0 text-sm" placeholder="Titre (FR) — ex : Ce qui est inclus" />
              <input value={s.titleEn} onChange={(e) => setSec(i, 'titleEn', e.target.value)} className="flex-1 min-w-0 text-sm" placeholder="Titre (EN) — ex : What's included" />
              {sections.length > 1 && (
                <button type="button" onClick={() => rmSec(i)} className="p-1.5 text-gray-500 hover:text-red-400 shrink-0" title="Supprimer la catégorie"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <textarea value={s.itemsFr} onChange={(e) => setSec(i, 'itemsFr', e.target.value)} className="w-full font-mono text-sm" rows={4} placeholder="Éléments (FR) — 1 par ligne" />
              <textarea value={s.itemsEn} onChange={(e) => setSec(i, 'itemsEn', e.target.value)} className="w-full font-mono text-sm" rows={4} placeholder="Éléments (EN) — 1 par ligne" />
            </div>
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input type="checkbox" checked={f.visible} onChange={(e) => setF({ ...f, visible: e.target.checked })} />
        Visible sur le shop
      </label>
      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={saving} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg">
          <Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-200 text-sm px-3 py-2">Annuler</button>
      </div>
    </div>
  );
}

function GamesManager() {
  const [games, setGames] = useState(null);
  const [editing, setEditing] = useState(null); // id | 'new' | null
  const [error, setError] = useState('');

  const load = () => api.getShopGames().then(setGames).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (data) => {
    if (editing === 'new') await api.createShopGame(data);
    else await api.updateShopGame(editing, data);
    setEditing(null); await load();
  };
  const remove = async (g) => {
    if (!confirm(`Supprimer le jeu « ${g.name} » ? Cette action est irréversible.`)) return;
    await api.deleteShopGame(g.id); await load();
  };

  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!games) return <div className="text-gray-500 text-sm">Chargement…</div>;

  return (
    <div className="space-y-3">
      {editing !== 'new' && (
        <button onClick={() => setEditing('new')} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Ajouter un jeu
        </button>
      )}
      {editing === 'new' && <GameForm onSave={save} onCancel={() => setEditing(null)} />}

      {games.map((g) => (
        <div key={g.id} className="bg-gray-950/40 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-xs font-mono text-gray-500 w-8 text-center">{g.order}</span>
            {g.image
              ? <img src={g.image} alt="" className="w-12 h-8 rounded object-cover border border-gray-800 shrink-0" />
              : <span className="w-12 h-8 rounded bg-gray-800 border border-gray-800 shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{g.name}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">{g.chip}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">{g.status}</span>
                {!g.visible && <span className="text-xs text-amber-400 flex items-center gap-1"><EyeOff className="w-3 h-3" /> caché</span>}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                <span className="flex items-center gap-1"><Star className="w-3 h-3" />{g.rating}</span>
                <span>{g.members} membres</span><span>{g.tipsCount} tips</span><span className="font-mono">{g.slug}</span>
              </div>
            </div>
            <button onClick={() => setEditing(g.id)} className="p-2 text-gray-400 hover:text-cyan-400"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => remove(g)} className="p-2 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>
          {editing === g.id && <div className="px-4 pb-4"><GameForm initial={g} onSave={save} onCancel={() => setEditing(null)} /></div>}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════ PLANS ════════════════════════════════
const emptyPlan = { slug: '', nameFr: '', nameEn: '', price: 0, perFr: '', perEn: '', featured: false, perksFr: [], perksEn: [], order: 0, visible: true };

function PlanForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState({ ...emptyPlan, ...initial });
  const [perksFr, setPerksFr] = useState(arrToLines(initial?.perksFr));
  const [perksEn, setPerksEn] = useState(arrToLines(initial?.perksEn));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    setErr('');
    if (!f.slug || !f.nameFr || !f.nameEn) { setErr('slug et noms FR/EN sont requis'); return; }
    setSaving(true);
    try {
      const { id, createdAt, updatedAt, ...rest } = f;
      await onSave({ ...rest, price: Number(f.price) || 0, order: Number(f.order) || 0, perksFr: linesToArr(perksFr), perksEn: linesToArr(perksEn) });
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-4 space-y-3">
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded px-3 py-2">{err}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Slug (id, ex: 1m)"><input value={f.slug} onChange={set('slug')} className="w-full" placeholder="1m" /></Field>
        <Field label="Nom (FR)"><input value={f.nameFr} onChange={set('nameFr')} className="w-full" placeholder="1 Mois" /></Field>
        <Field label="Nom (EN)"><input value={f.nameEn} onChange={set('nameEn')} className="w-full" placeholder="1 Month" /></Field>
        <Field label="Prix (€)"><input type="number" step="0.01" value={f.price} onChange={set('price')} className="w-full" /></Field>
        <Field label="Période (FR)"><input value={f.perFr} onChange={set('perFr')} className="w-full" placeholder="/ mois" /></Field>
        <Field label="Période (EN)"><input value={f.perEn} onChange={set('perEn')} className="w-full" placeholder="/ month" /></Field>
        <Field label="Ordre"><input type="number" value={f.order} onChange={set('order')} className="w-full" /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Avantages (FR) — 1 par ligne"><textarea value={perksFr} onChange={(e) => setPerksFr(e.target.value)} className="w-full font-mono text-sm" rows={5} /></Field>
        <Field label="Avantages (EN) — 1 par ligne"><textarea value={perksEn} onChange={(e) => setPerksEn(e.target.value)} className="w-full font-mono text-sm" rows={5} /></Field>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> Mis en avant (featured)</label>
        <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={f.visible} onChange={(e) => setF({ ...f, visible: e.target.checked })} /> Visible sur le shop</label>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={saving} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg">
          <Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-200 text-sm px-3 py-2">Annuler</button>
      </div>
    </div>
  );
}

function PlansManager() {
  const [plans, setPlans] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.getShopPlans().then(setPlans).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (data) => {
    if (editing === 'new') await api.createShopPlan(data);
    else await api.updateShopPlan(editing, data);
    setEditing(null); await load();
  };
  const remove = async (p) => {
    if (!confirm(`Supprimer le plan « ${p.nameFr} » ?`)) return;
    await api.deleteShopPlan(p.id); await load();
  };

  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!plans) return <div className="text-gray-500 text-sm">Chargement…</div>;

  return (
    <div className="space-y-3">
      {editing !== 'new' && (
        <button onClick={() => setEditing('new')} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Ajouter un plan
        </button>
      )}
      {editing === 'new' && <PlanForm onSave={save} onCancel={() => setEditing(null)} />}

      {plans.map((p) => (
        <div key={p.id} className="bg-gray-950/40 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-xs font-mono text-gray-500 w-8 text-center">{p.order}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{p.nameFr}</span>
                <span className="text-cyan-400 font-semibold">{p.price}€</span>
                <span className="text-xs text-gray-500">{p.perFr}</span>
                {p.featured && <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">featured</span>}
                {!p.visible && <span className="text-xs text-amber-400 flex items-center gap-1"><EyeOff className="w-3 h-3" /> caché</span>}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 font-mono">{p.slug}</div>
            </div>
            <button onClick={() => setEditing(p.id)} className="p-2 text-gray-400 hover:text-cyan-400"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => remove(p)} className="p-2 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>
          {editing === p.id && <div className="px-4 pb-4"><PlanForm initial={p} onSave={save} onCancel={() => setEditing(null)} /></div>}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════ SETTINGS (HERO) ════════════════════════════════
function SettingsManager() {
  const [hero, setHero] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.getShopSettings().then((s) => { setHero(s.heroImage || ''); setLoaded(true); }).catch((e) => setErr(e.message));
  }, []);

  const upload = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setErr(''); setMsg(''); setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const { url } = await api.uploadGallery('shop', fd);
      setHero(url);
    } catch (e2) { setErr(e2.message || "Erreur lors de l'upload"); }
    finally { setUploading(false); }
  };

  const save = async () => {
    setErr(''); setMsg(''); setSaving(true);
    try { await api.updateShopSettings({ heroImage: hero }); setMsg('Enregistré ✓'); }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  if (!loaded) return <div className="text-gray-500 text-sm">Chargement…</div>;

  return (
    <div className="space-y-3">
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded px-3 py-2">{err}</div>}
      {msg && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded px-3 py-2">{msg}</div>}
      <span className="block text-xs text-gray-400">Image du Hero (accueil) — remplace le quadrillage. Format paysage conseillé (~1600×900).</span>
      <div className="flex items-start gap-4">
        <div className="w-56 h-32 rounded-lg border border-gray-800 bg-gray-900 overflow-hidden flex items-center justify-center shrink-0">
          {hero ? <img src={hero} alt="" className="w-full h-full object-cover" /> : <span className="text-gray-600 text-xs">aucune image</span>}
        </div>
        <div className="flex-1 space-y-2">
          <label className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm px-3 py-2 rounded-lg cursor-pointer">
            <Upload className="w-4 h-4" /> {uploading ? 'Envoi…' : 'Uploader une image'}
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={upload} disabled={uploading} />
          </label>
          <input value={hero} onChange={(e) => setHero(e.target.value)} className="w-full text-xs" placeholder="…ou colle une URL d'image" />
          {hero && <button type="button" onClick={() => setHero('')} className="block text-xs text-gray-500 hover:text-red-400">Retirer l'image</button>}
        </div>
      </div>
      <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg">
        <Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  );
}

// ════════════════════════════════ AVIS CLIENTS ════════════════════════════════
export function ReviewsManager() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.getShopReviews().then(setList).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const toggle = async (r) => { await api.moderateShopReview(r.id, !r.approved); load(); };
  const remove = async (r) => { if (!confirm(`Supprimer l'avis de ${r.name} ?`)) return; await api.deleteShopReview(r.id); load(); };

  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!list) return <div className="text-gray-500 text-sm">Chargement…</div>;
  if (!list.length) return <div className="text-gray-500 text-sm">Aucun avis pour l'instant. Les clients qui ont acheté un jeu peuvent laisser un avis depuis leur profil ; il apparaîtra ici en attente de validation.</div>;
  const pending = list.filter((r) => !r.approved).length;
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">{pending} en attente · {list.length - pending} publié(s). Seuls les avis validés s'affichent sur la boutique.</p>
      {list.map((r) => (
        <div key={r.id} className={`border rounded-lg px-4 py-3 ${r.approved ? 'border-gray-800 bg-gray-950/40' : 'border-amber-500/40 bg-amber-500/5'}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{r.name}</span>
            <span className="text-xs text-gray-500">· {r.gameName}</span>
            <span className="flex items-center gap-0.5 text-amber-400">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-3.5 h-3.5" fill={i <= r.rating ? 'currentColor' : 'none'} />)}</span>
            <span className="text-xs text-gray-600">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded ${r.approved ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>{r.approved ? 'Publié' : 'En attente'}</span>
          </div>
          <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{r.text}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => toggle(r)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${r.approved ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-green-600 hover:bg-green-500 text-white'}`}>
              {r.approved ? <><EyeOff className="w-3.5 h-3.5" /> Masquer</> : <><Eye className="w-3.5 h-3.5" /> Publier</>}
            </button>
            <button onClick={() => remove(r)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white"><Trash2 className="w-3.5 h-3.5" /> Supprimer</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════ ANALYTICS ════════════════════════════════
function ShopAnalytics() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.metricsRevenueByProduct().then(setData).catch(() => {});
  }, []);

  if (!data) return null;
  const shop = data.products.find((p) => p.key === 'SHOP');
  if (!shop || (shop.revenue30d === 0 && shop.revenuePrev30d === 0)) return null;

  const pct = shop.deltaPct || 0;
  const DeltaIcon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const byGame = (data.byGame || []).slice(0, 8).map((g) => ({ ...g, revenueEur: g.revenue / 100 }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400">Revenu (30j)</span>
            <Euro className="w-4 h-4 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-green-400">{(shop.revenue30d / 100).toFixed(2)}€</p>
          <span className={`text-xs flex items-center gap-1 mt-1 ${pct > 0 ? 'text-green-400' : pct < 0 ? 'text-red-400' : 'text-gray-500'}`}>
            <DeltaIcon className="w-3 h-3" /> {pct > 0 ? '+' : ''}{pct}% vs 30j préc.
          </span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400">Commandes (30j)</span>
            <ShoppingCart className="w-4 h-4 text-gray-600" />
          </div>
          <p className="text-2xl font-bold">{shop.orders30d}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400">Panier moyen</span>
            <TrendingUp className="w-4 h-4 text-gray-600" />
          </div>
          <p className="text-2xl font-bold">{shop.orders30d ? `${((shop.revenue30d / shop.orders30d) / 100).toFixed(2)}€` : '—'}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Revenus — 30 derniers jours</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={shop.trend}>
              <defs>
                <linearGradient id="shop-rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${(v / 100).toFixed(0)}€`} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v) => [`${(v / 100).toFixed(2)}€`, 'Revenu']}
              />
              <Area type="monotone" dataKey="amount" stroke="#10b981" fill="url(#shop-rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {byGame.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Revenu par jeu (30j)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byGame} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}€`} />
                <YAxis type="category" dataKey="game" tick={{ fill: '#9ca3af', fontSize: 11 }} width={90} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(v) => [`${v.toFixed(2)}€`, 'Revenu']}
                />
                <Bar dataKey="revenueEur" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════ PAGE ════════════════════════════════
export function ShopReviewsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Star className="w-6 h-6 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold">Avis clients</h1>
          <p className="text-gray-500 text-sm">Avis laissés par les acheteurs sur shop.404tweaks.tech. Publie ceux que tu veux afficher sur la boutique.</p>
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <ReviewsManager />
      </div>
    </div>
  );
}

export default function ShopContentPage() {
  const [open, setOpen] = useState('games');
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Gamepad2 className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold">Shop</h1>
          <p className="text-gray-500 text-sm">Gère les jeux et les plans affichés sur shop.404tweaks.tech.</p>
        </div>
      </div>

      <ShopAnalytics />

      <div className="space-y-2">
        <Collapsible icon={CreditCard} label="Temp Spoofer — clés & prix" open={open === 'spoofer'} onToggle={() => setOpen(open === 'spoofer' ? null : 'spoofer')}>
          <SpooferStock />
        </Collapsible>
        <Collapsible icon={Gamepad2} label="Jeux" open={open === 'games'} onToggle={() => setOpen(open === 'games' ? null : 'games')}>
          <GamesManager />
        </Collapsible>
        <Collapsible icon={CreditCard} label="Plans & prix" open={open === 'plans'} onToggle={() => setOpen(open === 'plans' ? null : 'plans')}>
          <PlansManager />
        </Collapsible>
        <Collapsible icon={ImageIcon} label="Accueil / Hero" open={open === 'hero'} onToggle={() => setOpen(open === 'hero' ? null : 'hero')}>
          <SettingsManager />
        </Collapsible>
        <Collapsible icon={Star} label="Avis clients" open={open === 'reviews'} onToggle={() => setOpen(open === 'reviews' ? null : 'reviews')}>
          <ReviewsManager />
        </Collapsible>
      </div>
    </div>
  );
}
