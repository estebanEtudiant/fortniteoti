import React, { useState, useEffect } from 'react';
import {
  Sparkles, Package, Truck, Settings as SettingsIcon, Plus, Pencil, Trash2,
  Save, EyeOff, Star, Upload, Boxes, Euro, ShoppingCart, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../lib/api';
import Collapsible from '../components/Collapsible';

// ── helpers ──
const linesToArr = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const arrToLines = (a) => (a || []).join('\n');
const centsToEuros = (c) => (Number(c) || 0) / 100;
const eurosToCents = (e) => Math.round((Number(e) || 0) * 100);

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

const STATUS_LABELS = {
  PENDING: 'En attente de paiement',
  PAID: 'Payée — à préparer',
  PROCESSING: 'En préparation',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
  REFUNDED: 'Remboursée',
};
const STATUS_COLORS = {
  PENDING: 'bg-gray-800 text-gray-400',
  PAID: 'bg-amber-500/10 text-amber-400',
  PROCESSING: 'bg-blue-500/10 text-blue-400',
  SHIPPED: 'bg-cyan-500/10 text-cyan-400',
  DELIVERED: 'bg-green-500/10 text-green-400',
  CANCELLED: 'bg-red-500/10 text-red-400',
  REFUNDED: 'bg-red-500/10 text-red-400',
};

// ════════════════════════════════ PRODUITS (kits) ════════════════════════════════
const emptyProduct = {
  slug: '', nameFr: '', nameEn: '', descriptionFr: '', descriptionEn: '',
  price: 0, compareAtPrice: '', images: [], includesFr: [], includesEn: [],
  stock: 0, sku: '', featured: false, order: 0, visible: true,
};

function ProductForm({ initial, onSave, onCancel }) {
  const initialEuros = initial ? { ...initial, price: centsToEuros(initial.price), compareAtPrice: initial.compareAtPrice != null ? centsToEuros(initial.compareAtPrice) : '' } : null;
  const [f, setF] = useState({ ...emptyProduct, ...initialEuros });
  const [includesFr, setIncludesFr] = useState(arrToLines(initial?.includesFr));
  const [includesEn, setIncludesEn] = useState(arrToLines(initial?.includesEn));
  const [images, setImages] = useState(initial?.images || []);
  const [imgUploading, setImgUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const uploadImg = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErr(''); setImgUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const { url } = await api.uploadGallery('pokemon', fd);
      setImages((g) => [...g, url]);
    } catch (e2) { setErr(e2.message || "Erreur lors de l'upload de l'image"); }
    finally { setImgUploading(false); }
  };
  const rmImg = (i) => setImages((g) => g.filter((_, idx) => idx !== i));
  const moveImg = (i, dir) => setImages((g) => {
    const j = i + dir; if (j < 0 || j >= g.length) return g;
    const c = [...g]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });

  const submit = async () => {
    setErr('');
    if (!f.slug || !f.nameFr || !f.nameEn) { setErr('slug et noms FR/EN sont requis'); return; }
    setSaving(true);
    try {
      const { id, createdAt, updatedAt, ...rest } = f;
      await onSave({
        ...rest,
        price: eurosToCents(f.price),
        compareAtPrice: f.compareAtPrice === '' ? undefined : eurosToCents(f.compareAtPrice),
        stock: Number(f.stock) || 0,
        order: Number(f.order) || 0,
        images,
        includesFr: linesToArr(includesFr),
        includesEn: linesToArr(includesEn),
      });
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-4 space-y-3">
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded px-3 py-2">{err}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Slug (id, ex: kit-starter)"><input value={f.slug} onChange={set('slug')} className="w-full" placeholder="kit-starter" /></Field>
        <Field label="Nom (FR)"><input value={f.nameFr} onChange={set('nameFr')} className="w-full" placeholder="Kit Starter" /></Field>
        <Field label="Nom (EN)"><input value={f.nameEn} onChange={set('nameEn')} className="w-full" placeholder="Starter Kit" /></Field>
        <Field label="Prix (€)"><input type="number" step="0.01" value={f.price} onChange={set('price')} className="w-full" /></Field>
        <Field label="Prix barré (€, optionnel)"><input type="number" step="0.01" value={f.compareAtPrice} onChange={set('compareAtPrice')} className="w-full" /></Field>
        <Field label="Stock"><input type="number" value={f.stock} onChange={set('stock')} className="w-full" /></Field>
        <Field label="SKU"><input value={f.sku} onChange={set('sku')} className="w-full" placeholder="PKM-KIT-01" /></Field>
        <Field label="Ordre d'affichage"><input type="number" value={f.order} onChange={set('order')} className="w-full" /></Field>
      </div>

      <Field label="Description (FR)"><textarea value={f.descriptionFr} onChange={set('descriptionFr')} className="w-full" rows={3} /></Field>
      <Field label="Description (EN)"><textarea value={f.descriptionEn} onChange={set('descriptionEn')} className="w-full" rows={3} /></Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Contenu du kit (FR) — 1 élément par ligne"><textarea value={includesFr} onChange={(e) => setIncludesFr(e.target.value)} className="w-full font-mono text-sm" rows={5} placeholder={'2 cartes sleeves premium\n1 chiffon microfibre\n1 solution de nettoyage\n...'} /></Field>
        <Field label="Contenu du kit (EN) — 1 par ligne"><textarea value={includesEn} onChange={(e) => setIncludesEn(e.target.value)} className="w-full font-mono text-sm" rows={5} /></Field>
      </div>

      {/* Images produit */}
      <div>
        <span className="block text-xs text-gray-400 mb-1">Photos du kit</span>
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative w-28 h-20 rounded-lg border border-gray-800 bg-gray-900 overflow-hidden group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                <button type="button" onClick={() => moveImg(i, -1)} disabled={i === 0} className="text-white text-xs px-1.5 py-0.5 rounded bg-gray-700/80 disabled:opacity-30">←</button>
                <button type="button" onClick={() => rmImg(i)} className="text-white p-1 rounded bg-red-600/80"><Trash2 className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => moveImg(i, 1)} disabled={i === images.length - 1} className="text-white text-xs px-1.5 py-0.5 rounded bg-gray-700/80 disabled:opacity-30">→</button>
              </div>
              <span className="absolute top-1 left-1 text-[10px] font-mono bg-black/60 text-gray-200 px-1 rounded">{i + 1}</span>
            </div>
          ))}
          <label className="w-28 h-20 rounded-lg border border-dashed border-gray-700 hover:border-amber-500 bg-gray-900/50 flex flex-col items-center justify-center gap-1 cursor-pointer text-gray-500 hover:text-amber-400 text-xs">
            <Upload className="w-4 h-4" /> {imgUploading ? 'Envoi…' : 'Ajouter'}
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={uploadImg} disabled={imgUploading} />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> Mis en avant</label>
        <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={f.visible} onChange={(e) => setF({ ...f, visible: e.target.checked })} /> Visible sur /pokemon</label>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={saving} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 text-black font-medium text-sm px-4 py-2 rounded-lg">
          <Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-200 text-sm px-3 py-2">Annuler</button>
      </div>
    </div>
  );
}

function ProductsManager() {
  const [products, setProducts] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.getPokemonProducts().then(setProducts).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (data) => {
    if (editing === 'new') await api.createPokemonProduct(data);
    else await api.updatePokemonProduct(editing, data);
    setEditing(null); await load();
  };
  const remove = async (p) => {
    if (!confirm(`Supprimer le produit « ${p.nameFr} » ? Cette action est irréversible.`)) return;
    await api.deletePokemonProduct(p.id); await load();
  };

  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!products) return <div className="text-gray-500 text-sm">Chargement…</div>;

  return (
    <div className="space-y-3">
      {editing !== 'new' && (
        <button onClick={() => setEditing('new')} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-medium text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Ajouter un kit
        </button>
      )}
      {editing === 'new' && <ProductForm onSave={save} onCancel={() => setEditing(null)} />}

      {products.map((p) => (
        <div key={p.id} className="bg-gray-950/40 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-xs font-mono text-gray-500 w-8 text-center">{p.order}</span>
            {p.images?.[0]
              ? <img src={p.images[0]} alt="" className="w-12 h-8 rounded object-cover border border-gray-800 shrink-0" />
              : <span className="w-12 h-8 rounded bg-gray-800 border border-gray-800 shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{p.nameFr}</span>
                <span className="text-amber-400 font-semibold">{centsToEuros(p.price).toFixed(2)}€</span>
                <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${p.stock > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  <Boxes className="w-3 h-3" /> {p.stock} en stock
                </span>
                {p.featured && <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 flex items-center gap-1"><Star className="w-3 h-3" />mis en avant</span>}
                {!p.visible && <span className="text-xs text-amber-400 flex items-center gap-1"><EyeOff className="w-3 h-3" /> caché</span>}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 font-mono">{p.slug}{p.sku ? ` · ${p.sku}` : ''}</div>
            </div>
            <button onClick={() => setEditing(p.id)} className="p-2 text-gray-400 hover:text-amber-400"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => remove(p)} className="p-2 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>
          {editing === p.id && <div className="px-4 pb-4"><ProductForm initial={p} onSave={save} onCancel={() => setEditing(null)} /></div>}
        </div>
      ))}
      {!products.length && <p className="text-sm text-gray-500">Aucun kit pour l'instant — ajoute ta première variante.</p>}
    </div>
  );
}

// ════════════════════════════════ COMMANDES (préparation / expédition) ════════════════════════════════
function OrderRow({ order, onUpdate }) {
  const [status, setStatus] = useState(order.status);
  const [carrier, setCarrier] = useState(order.carrier || '');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const items = Array.isArray(order.items) ? order.items : [];

  const submit = async () => {
    setErr(''); setSaving(true);
    try {
      await onUpdate(order.id, { status, carrier: carrier || undefined, trackingNumber: trackingNumber || undefined, trackingUrl: trackingUrl || undefined });
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-gray-950/40 border border-gray-800 rounded-lg">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${STATUS_COLORS[order.status] || 'bg-gray-800 text-gray-400'}`}>{STATUS_LABELS[order.status] || order.status}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{order.customer?.email || order.customerId}</div>
          <div className="text-xs text-gray-500 truncate">{items.map((it) => `${it.nameFr} x${it.qty}`).join(', ')}</div>
        </div>
        <span className="text-amber-400 font-semibold shrink-0">{centsToEuros(order.amount).toFixed(2)}€</span>
        <span className="text-xs text-gray-500 shrink-0">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-800 pt-3">
          {err && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded px-3 py-2">{err}</div>}
          <div className="text-xs text-gray-400 space-y-0.5">
            <p className="text-gray-300 font-medium">Adresse de livraison</p>
            <p>{order.shippingName}</p>
            <p>{order.shippingLine1}{order.shippingLine2 ? `, ${order.shippingLine2}` : ''}</p>
            <p>{order.shippingPostalCode} {order.shippingCity}, {order.shippingCountry}</p>
            {order.shippingPhone && <p>{order.shippingPhone}</p>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Statut">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
                {Object.keys(STATUS_LABELS).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </Field>
            <Field label="Transporteur"><input value={carrier} onChange={(e) => setCarrier(e.target.value)} className="w-full" placeholder="Colissimo" /></Field>
            <Field label="N° de suivi"><input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="w-full" /></Field>
            <Field label="Lien de suivi (optionnel)"><input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} className="w-full" /></Field>
          </div>
          <button onClick={submit} disabled={saving} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 text-black font-medium text-sm px-4 py-2 rounded-lg">
            <Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : 'Mettre à jour'}
          </button>
          <p className="text-[11px] text-gray-600">Passer en « Expédiée » envoie automatiquement un email avec le numéro de suivi au client (numéro requis).</p>
        </div>
      )}
    </div>
  );
}

function OrdersManager() {
  const [orders, setOrders] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  const load = () => api.getPokemonOrders(statusFilter || undefined).then(setOrders).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = async (id, data) => {
    await api.updatePokemonOrder(id, data);
    await load();
  };

  if (error) return <div className="text-red-400 text-sm">{error}</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Filtrer :</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm">
          <option value="">Toutes les commandes</option>
          {Object.keys(STATUS_LABELS).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>
      {!orders && <div className="text-gray-500 text-sm">Chargement…</div>}
      {orders && !orders.length && <p className="text-sm text-gray-500">Aucune commande pour le moment.</p>}
      {orders?.map((o) => <OrderRow key={o.id} order={o} onUpdate={update} />)}
    </div>
  );
}

// ════════════════════════════════ RÉGLAGES (livraison, hero) ════════════════════════════════
function SettingsManager() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.getPokemonSettings().then((data) => setS({
      heroImage: data.heroImage || '',
      freeShippingThresholdCents: centsToEuros(data.freeShippingThresholdCents),
      flatShippingCents: centsToEuros(data.flatShippingCents),
      allowedCountries: (data.allowedCountries || []).join(', '),
    })).catch((e) => setErr(e.message));
  }, []);

  const upload = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setErr(''); setMsg(''); setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const { url } = await api.uploadGallery('pokemon', fd);
      setS((cur) => ({ ...cur, heroImage: url }));
    } catch (e2) { setErr(e2.message || "Erreur lors de l'upload"); }
    finally { setUploading(false); }
  };

  const save = async () => {
    setErr(''); setMsg(''); setSaving(true);
    try {
      await api.updatePokemonSettings({
        heroImage: s.heroImage,
        freeShippingThresholdCents: eurosToCents(s.freeShippingThresholdCents),
        flatShippingCents: eurosToCents(s.flatShippingCents),
        allowedCountries: s.allowedCountries.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean),
      });
      setMsg('Enregistré ✓');
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  if (!s) return <div className="text-gray-500 text-sm">Chargement…</div>;

  return (
    <div className="space-y-4">
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded px-3 py-2">{err}</div>}
      {msg && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded px-3 py-2">{msg}</div>}

      <div>
        <span className="block text-xs text-gray-400 mb-1">Image du Hero (page /pokemon). Format paysage conseillé (~1600×900).</span>
        <div className="flex items-start gap-4">
          <div className="w-56 h-32 rounded-lg border border-gray-800 bg-gray-900 overflow-hidden flex items-center justify-center shrink-0">
            {s.heroImage ? <img src={s.heroImage} alt="" className="w-full h-full object-cover" /> : <span className="text-gray-600 text-xs">aucune image</span>}
          </div>
          <div className="flex-1 space-y-2">
            <label className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm px-3 py-2 rounded-lg cursor-pointer">
              <Upload className="w-4 h-4" /> {uploading ? 'Envoi…' : 'Uploader une image'}
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={upload} disabled={uploading} />
            </label>
            <input value={s.heroImage} onChange={(e) => setS({ ...s, heroImage: e.target.value })} className="w-full text-xs" placeholder="…ou colle une URL d'image" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Frais de livraison (€)"><input type="number" step="0.01" value={s.flatShippingCents} onChange={(e) => setS({ ...s, flatShippingCents: e.target.value })} className="w-full" /></Field>
        <Field label="Livraison gratuite dès (€, 0 = désactivé)"><input type="number" step="0.01" value={s.freeShippingThresholdCents} onChange={(e) => setS({ ...s, freeShippingThresholdCents: e.target.value })} className="w-full" /></Field>
        <Field label="Pays livrés (codes ISO, séparés par virgule)"><input value={s.allowedCountries} onChange={(e) => setS({ ...s, allowedCountries: e.target.value })} className="w-full" placeholder="FR, BE, CH, LU" /></Field>
      </div>

      <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 text-black font-medium text-sm px-4 py-2 rounded-lg">
        <Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  );
}

const PIE_COLORS = ['#f59e0b', '#06b6d4', '#8b5cf6', '#10b981', '#ef4444', '#6366f1', '#ec4899'];

// ════════════════════════════════ ANALYTICS ════════════════════════════════
function PokemonAnalytics() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.metricsRevenueByProduct().then(setData).catch(() => {});
  }, []);

  if (!data) return null;
  const pkm = data.products.find((p) => p.key === 'POKEMON');
  if (!pkm || (pkm.revenue30d === 0 && pkm.revenuePrev30d === 0)) return null;

  const pct = pkm.deltaPct || 0;
  const DeltaIcon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const byStatus = (data.pokemonByStatus || []).map((s) => ({ name: STATUS_LABELS[s.status] || s.status, value: s.count }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400">Revenu (30j)</span>
            <Euro className="w-4 h-4 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-green-400">{(pkm.revenue30d / 100).toFixed(2)}€</p>
          <span className={`text-xs flex items-center gap-1 mt-1 ${pct > 0 ? 'text-green-400' : pct < 0 ? 'text-red-400' : 'text-gray-500'}`}>
            <DeltaIcon className="w-3 h-3" /> {pct > 0 ? '+' : ''}{pct}% vs 30j préc.
          </span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400">Commandes (30j)</span>
            <ShoppingCart className="w-4 h-4 text-gray-600" />
          </div>
          <p className="text-2xl font-bold">{pkm.orders30d}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400">Panier moyen</span>
            <TrendingUp className="w-4 h-4 text-gray-600" />
          </div>
          <p className="text-2xl font-bold">{pkm.orders30d ? `${((pkm.revenue30d / pkm.orders30d) / 100).toFixed(2)}€` : '—'}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Revenus — 30 derniers jours</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={pkm.trend}>
              <defs>
                <linearGradient id="pkm-rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
              <Area type="monotone" dataKey="amount" stroke="#f59e0b" fill="url(#pkm-rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {byStatus.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Commandes par statut</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} paddingAngle={2}>
                  {byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════ PAGE ════════════════════════════════
export default function PokemonPage() {
  const [open, setOpen] = useState('products');
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold">Pokémon — Kits de rénovation</h1>
          <p className="text-gray-500 text-sm">Gère les kits, le stock, la livraison et les commandes affichées sur 404tweaks.tech/pokemon.</p>
        </div>
      </div>

      <PokemonAnalytics />

      <div className="space-y-2">
        <Collapsible icon={Package} label="Kits & stock" open={open === 'products'} onToggle={() => setOpen(open === 'products' ? null : 'products')}>
          <ProductsManager />
        </Collapsible>
        <Collapsible icon={Truck} label="Commandes & expédition" open={open === 'orders'} onToggle={() => setOpen(open === 'orders' ? null : 'orders')}>
          <OrdersManager />
        </Collapsible>
        <Collapsible icon={SettingsIcon} label="Livraison & Hero" open={open === 'settings'} onToggle={() => setOpen(open === 'settings' ? null : 'settings')}>
          <SettingsManager />
        </Collapsible>
      </div>
    </div>
  );
}
