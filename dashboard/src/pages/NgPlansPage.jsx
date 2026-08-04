import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Plus, Save, Search, Sparkles, Star, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';

const LICENSE_OPTIONS = ['DAYS_1', 'DAYS_7', 'DAYS_14', 'DAYS_30', 'DAYS_90', 'DAYS_365', 'LIFETIME'];
const DEFAULT_STOREFRONT_FEATURES = [
  "100+ tweaks d'optimisation",
  'Discord VIP prive',
  'Mises a jour automatiques',
  'Support technique direct',
  '10 macros Fortnite incluses',
];

const DEFAULT_STOREFRONT_TAGS = [
  'Double Edit',
  'Drag Edit',
  'Shotgun Pullout',
  'Auto Build',
  'Pick Up',
  'Single Edit',
  'Instant Build',
  'Item Pullout',
  'Wall Retake',
  'Prefire',
];

const ICON_CHOICES = [
  { className: 'fa-key', label: 'Cle' },
  { className: 'fa-star', label: 'Star' },
  { className: 'fa-crown', label: 'Crown' },
  { className: 'fa-gem', label: 'Gem' },
  { className: 'fa-fire', label: 'Fire' },
  { className: 'fa-bolt', label: 'Boost' },
  { className: 'fa-rocket', label: 'Rocket' },
  { className: 'fa-gauge-high', label: 'Perf' },
  { className: 'fa-infinity', label: 'Lifetime' },
  { className: 'fa-calendar', label: 'Calendar' },
  { className: 'fa-calendar-days', label: 'Calendar Plus' },
  { className: 'fa-clock', label: 'Time' },
  { className: 'fa-gamepad', label: 'Gamepad' },
  { className: 'fa-headset', label: 'Support' },
  { className: 'fa-shield-halved', label: 'Shield' },
  { className: 'fa-trophy', label: 'Elite' },
  { className: 'fa-bullseye', label: 'Aim' },
  { className: 'fa-desktop', label: 'Desktop' },
  { className: 'fa-display', label: 'Display' },
  { className: 'fa-microchip', label: 'CPU' },
  { className: 'fa-gear', label: 'Settings' },
  { className: 'fa-sliders', label: 'Tuning' },
  { className: 'fa-wand-magic-sparkles', label: 'Magic' },
  { className: 'fa-circle-check', label: 'Check' },
  { className: 'fa-terminal', label: 'Terminal' },
  { className: 'fa-code', label: 'Code' },
  { className: 'fa-wifi', label: 'Network' },
  { className: 'fa-hammer', label: 'Build' },
];

const getFilteredIcons = (query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return ICON_CHOICES;
  return ICON_CHOICES.filter(({ className, label }) => `${className} ${label}`.toLowerCase().includes(q));
};
const DEFAULT_PLAN = {
  name: '',
  description: '',
  price: 999,
  originalPrice: 0,
  active: true,
  popular: false,
  stripePrice: '',
  licensePlan: 'DAYS_30',
  customDays: '',
  sortOrder: 100,
  badgeText: '',
  ctaText: '',
  icon: 'fa-key',
  themeColor: '#06b6d4',
  features: [],
  tags: [],
};

const NEW_PLAN_DEFAULT = {
  key: '',
  ...DEFAULT_PLAN,
};

const toInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
};

const normalizeKey = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9_]/g, '_')
  .replace(/_+/g, '_');

const normalizeTextList = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((v) => String(v || '').trim()).filter(Boolean))];
  }
  return String(value || '')
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
};

const hydratePlan = (plan = {}) => ({
  ...DEFAULT_PLAN,
  ...plan,
  customDays: plan.customDays ?? '',
  features: normalizeTextList(plan.features),
  tags: normalizeTextList(plan.tags),
});

const buildPayload = (plan) => {
  const customDays = Number(plan.customDays);
  return {
    ...plan,
    name: String(plan.name || '').trim(),
    description: String(plan.description || '').trim(),
    price: toInt(plan.price),
    originalPrice: toInt(plan.originalPrice),
    stripePrice: String(plan.stripePrice || '').trim(),
    licensePlan: LICENSE_OPTIONS.includes(plan.licensePlan) ? plan.licensePlan : 'DAYS_30',
    customDays: Number.isFinite(customDays) && customDays > 0 ? Math.floor(customDays) : null,
    sortOrder: toInt(plan.sortOrder, 100),
    badgeText: String(plan.badgeText || '').trim(),
    ctaText: String(plan.ctaText || '').trim(),
    icon: String(plan.icon || '').trim() || 'fa-key',
    themeColor: String(plan.themeColor || '').trim() || '#06b6d4',
    features: normalizeTextList(plan.features),
    tags: normalizeTextList(plan.tags),
  };
};

const formatMoney = (cents) => `${(toInt(cents) / 100).toFixed(2)} EUR`;

const discountPercent = (price, originalPrice) => {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round((1 - price / originalPrice) * 100);
};

const resolveIcon = (icon) => {
  const raw = String(icon || '').trim();
  if (!raw) return 'fa-key';
  if (raw.includes('fa-')) {
    const token = raw.split(/\s+/).filter((part) => part.startsWith('fa-')).pop();
    return token || 'fa-key';
  }
  return raw;
};

const planMatches = (key, plan, query) => {
  if (!query) return true;
  const q = query.toLowerCase();
  return [key, plan.name, plan.description, plan.badgeText, plan.ctaText]
    .map((v) => String(v || '').toLowerCase())
    .some((v) => v.includes(q));
};

const sectionTitleClass = 'text-xs font-semibold uppercase tracking-[0.08em] text-cyan-300';

export default function NgPlansPage() {
  const [plans, setPlans] = useState(null);
  const [selectedKey, setSelectedKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [saved, setSaved] = useState('');
  const [deleting, setDeleting] = useState('');
  const [query, setQuery] = useState('');
  const [iconQuery, setIconQuery] = useState('');
  const [newIconQuery, setNewIconQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newPlan, setNewPlan] = useState(NEW_PLAN_DEFAULT);
  const [addError, setAddError] = useState('');

  const load = () => {
    setLoading(true);
    api.getNgPlans()
      .then((data) => {
        const mapped = Object.fromEntries(
          Object.entries(data || {})
            .map(([key, plan]) => [key, hydratePlan(plan)])
            .sort((a, b) => (a[1].sortOrder || 0) - (b[1].sortOrder || 0)),
        );
        setPlans(mapped);
        const keys = Object.keys(mapped);
        setSelectedKey((prev) => (prev && mapped[prev] ? prev : (keys[0] || '')));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { setIconQuery(''); }, [selectedKey]);

  const entries = useMemo(() => {
    const arr = Object.entries(plans || {});
    arr.sort((a, b) => (a[1].sortOrder || 0) - (b[1].sortOrder || 0));
    return arr;
  }, [plans]);

  const filteredEntries = useMemo(() => {
    return entries.filter(([key, plan]) => {
      if (statusFilter === 'active' && !plan.active) return false;
      if (statusFilter === 'inactive' && plan.active) return false;
      return planMatches(key, plan, query);
    });
  }, [entries, query, statusFilter]);
  const filteredIconChoices = useMemo(() => getFilteredIcons(iconQuery), [iconQuery]);
  const filteredNewIconChoices = useMemo(() => getFilteredIcons(newIconQuery), [newIconQuery]);

  const selectedPlan = selectedKey && plans ? plans[selectedKey] : null;
  const previewIcon = resolveIcon(selectedPlan?.icon);
  const previewFeatures = normalizeTextList(selectedPlan?.features);
  const previewTags = normalizeTextList(selectedPlan?.tags);
  const previewFeaturesResolved = previewFeatures.length > 0 ? previewFeatures : DEFAULT_STOREFRONT_FEATURES;
  const previewTagsResolved = previewTags.length > 0 ? previewTags : DEFAULT_STOREFRONT_TAGS;

  const totalPlans = entries.length;
  const activePlans = entries.filter(([, p]) => p.active).length;
  const popularPlans = entries.filter(([, p]) => p.popular).length;

  const updatePlan = (planKey, field, value) => {
    setPlans((prev) => ({ ...prev, [planKey]: { ...prev[planKey], [field]: value } }));
  };

  const updateSelected = (field, value) => {
    if (!selectedKey) return;
    updatePlan(selectedKey, field, value);
  };

  const togglePopular = (planKey) => {
    setPlans((prev) => {
      const next = { ...prev };
      const nextValue = !next[planKey].popular;
      Object.keys(next).forEach((k) => {
        next[k] = { ...next[k], popular: k === planKey ? nextValue : false };
      });
      return next;
    });
  };

  const handleSave = async (planKey) => {
    setSaving(planKey);
    try {
      await api.updateNgPlan(planKey, buildPayload(plans[planKey]));
      setSaved(planKey);
      setTimeout(() => setSaved(''), 1800);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving('');
    }
  };

  const handleDelete = async (planKey) => {
    if (!confirm(`Supprimer le pack "${planKey}" ? Action irreversible.`)) return;
    setDeleting(planKey);
    try {
      await api.deleteNgPlan(planKey);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting('');
    }
  };

  const handleAdd = async () => {
    setAddError('');
    const key = normalizeKey(newPlan.key);
    const name = String(newPlan.name || '').trim();
    if (!key || !name) {
      setAddError('Cle et nom requis.');
      return;
    }

    try {
      await api.createNgPlan({ key, ...buildPayload({ ...newPlan, key, name }) });
      setShowAdd(false);
      setNewPlan(NEW_PLAN_DEFAULT);
      setNewIconQuery('');
      load();
    } catch (err) {
      setAddError(err.message);
    }
  };

  if (loading) return <Loading />;
  if (!plans) return <p className="text-gray-500">Erreur de chargement</p>;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-cyan-950/30 border border-gray-800 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Plans 404 Client (NG Loader)</h1>
            <p className="text-gray-400 text-sm mt-1">Interface pro pour creer, organiser et personnaliser chaque pack vendu.</p>
          </div>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> {showAdd ? 'Fermer creation' : 'Nouveau pack'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total packs</p>
            <p className="text-2xl font-semibold mt-1">{totalPlans}</p>
          </div>
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Packs actifs</p>
            <p className="text-2xl font-semibold mt-1 text-emerald-400">{activePlans}</p>
          </div>
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Packs populaires</p>
            <p className="text-2xl font-semibold mt-1 text-amber-300">{popularPlans}</p>
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="bg-gray-900 border border-cyan-700/60 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <h2 className="text-base font-semibold">Creation d'un nouveau pack</h2>
          </div>
          {addError && <p className="text-red-400 text-sm">{addError}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cle interne</label>
              <input
                type="text"
                value={newPlan.key}
                onChange={(e) => setNewPlan((p) => ({ ...p, key: normalizeKey(e.target.value) }))}
                className="w-full font-mono text-sm"
                placeholder="PACK_OPTI_OS_CUSTOM"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nom affiche</label>
              <input
                type="text"
                value={newPlan.name}
                onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))}
                className="w-full text-sm"
                placeholder="Pack Opti + OS Custom"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Prix (centimes)</label>
              <input
                type="number"
                min="0"
                value={newPlan.price}
                onChange={(e) => setNewPlan((p) => ({ ...p, price: toInt(e.target.value) }))}
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Prix barre (centimes)</label>
              <input
                type="number"
                min="0"
                value={newPlan.originalPrice}
                onChange={(e) => setNewPlan((p) => ({ ...p, originalPrice: toInt(e.target.value) }))}
                className="w-full text-sm"
              />
            </div>
                      <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <textarea
                value={newPlan.description}
                onChange={(e) => setNewPlan((p) => ({ ...p, description: e.target.value }))}
                className="w-full text-sm resize-none h-20"
                placeholder="Description du pack"
              />
            </div>
                      <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Icone du pack</label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newIconQuery}
                    onChange={(e) => setNewIconQuery(e.target.value)}
                    className="w-full pl-9 text-sm"
                    placeholder="Rechercher une icone (star, key, crown...)"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-auto pr-1">
                  {filteredNewIconChoices.map((choice) => {
                    const isActive = resolveIcon(newPlan.icon) === choice.className;
                    return (
                      <button
                        key={`new-icon-${choice.className}`}
                        type="button"
                        onClick={() => setNewPlan((p) => ({ ...p, icon: choice.className }))}
                        className={`border rounded-lg px-2 py-2 text-left transition-colors ${isActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700 hover:border-gray-500'}`}
                      >
                        <div className="flex items-center gap-2">
                          <i className={`fa-solid ${choice.className} text-sm text-cyan-300`} />
                          <span className="text-xs text-gray-200">{choice.label}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono mt-1">{choice.className}</p>
                      </button>
                    );
                  })}
                </div>
                {filteredNewIconChoices.length === 0 && (
                  <p className="text-xs text-gray-500">Aucune icone trouvee.</p>
                )}
                <input
                  type="text"
                  value={newPlan.icon || ''}
                  onChange={(e) => setNewPlan((p) => ({ ...p, icon: e.target.value }))}
                  className="w-full text-sm font-mono"
                  placeholder="fa-star"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleAdd} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Creer le pack</button>
            <button onClick={() => setShowAdd(false)} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm">Annuler</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[360px,1fr] gap-6">
        <aside className="bg-gray-900 border border-gray-800 rounded-2xl p-4 h-fit">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 text-sm"
              placeholder="Rechercher un pack"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'active', label: 'Actifs' },
              { id: 'inactive', label: 'Inactifs' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`text-xs py-1.5 rounded-lg border ${statusFilter === f.id ? 'bg-cyan-600/20 border-cyan-600 text-cyan-200' : 'border-gray-700 text-gray-400 hover:text-white'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[68vh] overflow-auto pr-1">
            {filteredEntries.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">Aucun pack trouve.</p>
            )}

            {filteredEntries.map(([key, plan]) => {
              const isSelected = key === selectedKey;
              const discount = discountPercent(plan.price, plan.originalPrice);
              const planIcon = resolveIcon(plan.icon);
              return (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={`w-full text-left border rounded-xl p-3 transition-all ${isSelected ? 'border-cyan-600 bg-cyan-950/30' : 'border-gray-800 bg-gray-950/50 hover:border-gray-700'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-gray-700 bg-gray-900 text-cyan-300 mt-0.5">
                        <i className={`fa-solid ${planIcon} text-xs`} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{plan.name || key}</p>
                        <p className="text-[11px] text-gray-500 font-mono mt-0.5">{key}</p>
                      </div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full mt-1" style={{ background: plan.themeColor || '#06b6d4' }} />
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-[11px]">
                    <span className={`px-2 py-0.5 rounded-full ${plan.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-700 text-gray-300'}`}>
                      {plan.active ? 'Actif' : 'Inactif'}
                    </span>
                    {plan.popular && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">Populaire</span>
                    )}
                    {discount && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">-{discount}%</span>
                    )}
                  </div>

                  <p className="text-sm text-gray-300 font-medium mt-2">{formatMoney(plan.price)}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5">
          {!selectedPlan ? (
            <div className="text-center py-16 text-gray-500">
              Selectionne un pack pour commencer.
            </div>
          ) : (
            <div className="grid grid-cols-1 2xl:grid-cols-[1fr,320px] gap-6">
              <div className="space-y-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 pb-4 border-b border-gray-800">
                  <div>
                    <p className="text-xs text-gray-500 font-mono">{selectedKey}</p>
                    <h2 className="text-xl font-semibold mt-1">Edition du pack</h2>
                    <p className="text-sm text-gray-400 mt-1">Modifie le contenu, la licence et le style visuel.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateSelected('active', !selectedPlan.active)}
                      className={`text-xs px-3 py-1.5 rounded-lg border ${selectedPlan.active ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'border-gray-700 text-gray-300'}`}
                    >
                      {selectedPlan.active ? 'Actif' : 'Inactif'}
                    </button>
                    <button
                      onClick={() => togglePopular(selectedKey)}
                      className={`text-xs px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 ${selectedPlan.popular ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'border-gray-700 text-gray-300'}`}
                    >
                      <Star className="w-3.5 h-3.5" /> Populaire
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className={sectionTitleClass}>Offre commerciale</p>
                    <div className="grid md:grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Nom affiche</label>
                        <input type="text" value={selectedPlan.name} onChange={(e) => updateSelected('name', e.target.value)} className="w-full text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Badge texte</label>
                        <input type="text" value={selectedPlan.badgeText || ''} onChange={(e) => updateSelected('badgeText', e.target.value)} className="w-full text-sm" placeholder="Populaire" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Prix (centimes)</label>
                        <input type="number" min="0" value={selectedPlan.price} onChange={(e) => updateSelected('price', toInt(e.target.value))} className="w-full text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Prix barre (centimes)</label>
                        <input type="number" min="0" value={selectedPlan.originalPrice || 0} onChange={(e) => updateSelected('originalPrice', toInt(e.target.value))} className="w-full text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">CTA texte</label>
                        <input type="text" value={selectedPlan.ctaText || ''} onChange={(e) => updateSelected('ctaText', e.target.value)} className="w-full text-sm" placeholder="Acheter" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Stripe Price ID</label>
                        <input type="text" value={selectedPlan.stripePrice || ''} onChange={(e) => updateSelected('stripePrice', e.target.value)} className="w-full text-sm font-mono" placeholder="price_xxx" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">Description</label>
                        <textarea value={selectedPlan.description || ''} onChange={(e) => updateSelected('description', e.target.value)} className="w-full text-sm resize-none h-20" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className={sectionTitleClass}>Licence et affichage</p>
                    <div className="grid md:grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Plan de licence</label>
                        <select value={selectedPlan.licensePlan || 'DAYS_30'} onChange={(e) => updateSelected('licensePlan', e.target.value)} className="w-full text-sm font-mono">
                          {LICENSE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Duree custom (jours)</label>
                        <input type="number" min="1" max="3650" value={selectedPlan.customDays ?? ''} onChange={(e) => updateSelected('customDays', e.target.value)} className="w-full text-sm" placeholder="optionnel" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Ordre d'affichage</label>
                        <input type="number" min="0" value={selectedPlan.sortOrder ?? 100} onChange={(e) => updateSelected('sortOrder', toInt(e.target.value, 100))} className="w-full text-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">Icone Font Awesome</label>
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={iconQuery}
                              onChange={(e) => setIconQuery(e.target.value)}
                              className="w-full pl-9 text-sm"
                              placeholder="Rechercher une icone (star, key, crown...)"
                            />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 max-h-48 overflow-auto pr-1">
                            {filteredIconChoices.map((choice) => {
                              const isActive = resolveIcon(selectedPlan.icon) === choice.className;
                              return (
                                <button
                                  key={`edit-icon-${choice.className}`}
                                  type="button"
                                  onClick={() => updateSelected('icon', choice.className)}
                                  className={`border rounded-lg px-2 py-2 text-left transition-colors ${isActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700 hover:border-gray-500'}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <i className={`fa-solid ${choice.className} text-sm text-cyan-300`} />
                                    <span className="text-xs text-gray-200">{choice.label}</span>
                                  </div>
                                  <p className="text-[10px] text-gray-500 font-mono mt-1">{choice.className}</p>
                                </button>
                              );
                            })}
                          </div>
                          {filteredIconChoices.length === 0 && (
                            <p className="text-xs text-gray-500">Aucune icone trouvee.</p>
                          )}
                          <input
                            type="text"
                            value={selectedPlan.icon || ''}
                            onChange={(e) => updateSelected('icon', e.target.value)}
                            className="w-full text-sm font-mono"
                            placeholder="fa-star"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className={sectionTitleClass}>Contenu et style</p>
                    <div className="grid md:grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Couleur theme</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={selectedPlan.themeColor || '#06b6d4'} onChange={(e) => updateSelected('themeColor', e.target.value)} className="w-10 h-10 p-1 rounded-md bg-gray-800 border border-gray-700" />
                          <input type="text" value={selectedPlan.themeColor || ''} onChange={(e) => updateSelected('themeColor', e.target.value)} className="flex-1 text-sm font-mono" placeholder="#06b6d4" />
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 self-end pb-1">La couleur est utilisee pour la carte storefront.</div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Features (1 par ligne)</label>
                        <textarea value={(selectedPlan.features || []).join('\n')} onChange={(e) => updateSelected('features', normalizeTextList(e.target.value))} className="w-full text-sm resize-none h-24" placeholder="Boost FPS" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Tags (1 par ligne)</label>
                        <textarea value={(selectedPlan.tags || []).join('\n')} onChange={(e) => updateSelected('tags', normalizeTextList(e.target.value))} className="w-full text-sm resize-none h-24" placeholder="Windows 11" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleSave(selectedKey)}
                    disabled={saving === selectedKey}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${saved === selectedKey ? 'bg-emerald-600 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'} disabled:bg-gray-700`}
                  >
                    <Save className="w-4 h-4" />
                    {saving === selectedKey ? 'Sauvegarde...' : saved === selectedKey ? 'Sauvegarde' : 'Sauvegarder'}
                  </button>
                  <button
                    onClick={() => handleDelete(selectedKey)}
                    disabled={deleting === selectedKey}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-red-900 hover:bg-red-800 text-red-200 disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 sticky top-20">
                  <div className="flex items-center gap-2 mb-3 text-sm text-gray-300">
                    <Eye className="w-4 h-4 text-cyan-300" /> Apercu de la carte
                  </div>

                  <div className="border rounded-2xl p-4 bg-gradient-to-br from-gray-900 to-gray-950" style={{ borderColor: `${selectedPlan.themeColor || '#06b6d4'}66` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-gray-500 font-mono">{selectedKey}</p>
                        <p className="text-lg font-semibold mt-1 leading-tight">{selectedPlan.name || 'Nom du pack'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg border bg-gray-900/80 text-base" style={{ borderColor: `${selectedPlan.themeColor || '#06b6d4'}66`, color: selectedPlan.themeColor || '#06b6d4' }}>
                          <i className={`fa-solid ${previewIcon}`} />
                        </span>
                        <span className="w-3 h-3 rounded-full mt-0.5" style={{ background: selectedPlan.themeColor || '#06b6d4' }} />
                      </div>
                    </div>

                    {selectedPlan.description && (
                      <p className="text-sm text-gray-400 mt-2 leading-relaxed">{selectedPlan.description}</p>
                    )}

                    <div className="mt-3 flex items-end gap-2">
                      <p className="text-2xl font-bold" style={{ color: selectedPlan.themeColor || '#06b6d4' }}>{formatMoney(selectedPlan.price)}</p>
                      {selectedPlan.originalPrice > 0 && (
                        <p className="text-xs text-gray-500 line-through mb-1">{formatMoney(selectedPlan.originalPrice)}</p>
                      )}
                    </div>

                    {(selectedPlan.popular || selectedPlan.badgeText) && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-amber-500/15 text-amber-300">
                        <Star className="w-3 h-3" /> {selectedPlan.badgeText || 'Populaire'}
                      </div>
                    )}

                    <ul className="mt-3 space-y-1.5 text-xs text-gray-300">
                      {previewFeaturesResolved.slice(0, 4).map((feature, idx) => (
                        <li key={`${selectedKey}-preview-feature-${idx}`}>- {feature}</li>
                      ))}
                    </ul>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {previewTagsResolved.slice(0, 6).map((tag, idx) => (
                        <span key={`${selectedKey}-preview-tag-${idx}`} className="px-2 py-0.5 rounded-md text-[10px] bg-gray-800 text-gray-300">{tag}</span>
                      ))}
                    </div>

                    <button className="w-full mt-4 text-sm font-medium rounded-lg py-2" style={{ background: `${selectedPlan.themeColor || '#06b6d4'}22`, color: selectedPlan.themeColor || '#06b6d4', border: `1px solid ${(selectedPlan.themeColor || '#06b6d4')}55` }}>
                      {selectedPlan.ctaText || 'Acheter maintenant'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
