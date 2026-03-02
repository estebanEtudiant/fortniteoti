import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';

const PLAN_COLORS = {
  DAYS_30: '#06b6d4',
  DAYS_90: '#8b5cf6',
  DAYS_365: '#10b981',
  LIFETIME: '#f59e0b',
};

export default function PlansPage() {
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [saved, setSaved] = useState('');
  const [deleting, setDeleting] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newPlan, setNewPlan] = useState({ key: '', name: '', description: '', price: 999, originalPrice: 0, stripePrice: '' });
  const [addError, setAddError] = useState('');

  const load = () => {
    setLoading(true);
    api.getPlans().then(setPlans).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (planKey) => {
    setSaving(planKey);
    try {
      await api.updatePlan(planKey, plans[planKey]);
      setSaved(planKey);
      setTimeout(() => setSaved(''), 2000);
    } catch (err) { alert(err.message); }
    finally { setSaving(''); }
  };

  const handleDelete = async (planKey) => {
    if (!confirm(`Supprimer le plan "${planKey}" ? Cette action est irréversible.`)) return;
    setDeleting(planKey);
    try {
      await api.deletePlan(planKey);
      load();
    } catch (err) { alert(err.message); }
    finally { setDeleting(''); }
  };

  const handleAdd = async () => {
    setAddError('');
    if (!newPlan.key.trim() || !newPlan.name.trim()) { setAddError('Clé et nom requis.'); return; }
    try {
      await api.createPlan(newPlan);
      setShowAdd(false);
      setNewPlan({ key: '', name: '', description: '', price: 999, originalPrice: 0, stripePrice: '' });
      load();
    } catch (err) { setAddError(err.message); }
  };

  // Quand on active "Populaire" sur un plan, on le désactive sur tous les autres
  const setPopular = (planKey) => {
    setPlans(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { next[k] = { ...next[k], popular: k === planKey ? !next[k].popular : false }; });
      return next;
    });
  };

  const update = (planKey, field, value) => {
    setPlans(prev => ({ ...prev, [planKey]: { ...prev[planKey], [field]: value } }));
  };

  if (loading) return <Loading />;
  if (!plans) return <p className="text-gray-500">Erreur de chargement</p>;

  const planKeys = Object.keys(plans);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Gestion des Plans</h1>
        <button onClick={() => setShowAdd(!showAdd)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter un plan
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-6">Configure les plans disponibles à la vente sur le storefront.</p>

      {/* Add Plan Form */}
      {showAdd && (
        <div className="bg-gray-900 border border-cyan-700 rounded-xl p-5 mb-6">
          <h2 className="text-base font-semibold mb-4">Nouveau plan</h2>
          {addError && <p className="text-red-400 text-sm mb-3">{addError}</p>}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Clé interne (enum)</label>
              <select value={newPlan.key} onChange={e => setNewPlan(p => ({ ...p, key: e.target.value }))}
                className="w-full text-sm font-mono">
                <option value="">-- Choisir --</option>
                <option value="DAYS_1">DAYS_1</option>
                <option value="DAYS_7">DAYS_7</option>
                <option value="DAYS_14">DAYS_14</option>
                <option value="DAYS_30">DAYS_30</option>
                <option value="DAYS_90">DAYS_90</option>
                <option value="DAYS_365">DAYS_365</option>
                <option value="LIFETIME">LIFETIME</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nom affiché</label>
              <input type="text" value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))}
                className="w-full text-sm" placeholder="7 Jours" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Description (affichée sur le storefront)</label>
              <textarea
                value={newPlan.description || ''}
                onChange={e => setNewPlan(p => ({ ...p, description: e.target.value }))}
                className="w-full text-sm resize-none h-16"
                placeholder="Ex: Idéal pour booster ses performances sur 30 jours..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Prix réel (centimes)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={newPlan.price} onChange={e => setNewPlan(p => ({ ...p, price: parseInt(e.target.value) || 0 }))}
                  className="flex-1 text-sm" min="0" />
                <span className="text-gray-400 text-sm font-mono">{(newPlan.price / 100).toFixed(2)}€</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Prix barré (0 = aucun)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={newPlan.originalPrice} onChange={e => setNewPlan(p => ({ ...p, originalPrice: parseInt(e.target.value) || 0 }))}
                  className="flex-1 text-sm" min="0" />
                <span className="text-gray-400 text-sm font-mono">{newPlan.originalPrice > 0 ? (newPlan.originalPrice / 100).toFixed(2) + '€' : '—'}</span>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Stripe Price ID (optionnel)</label>
              <input type="text" value={newPlan.stripePrice} onChange={e => setNewPlan(p => ({ ...p, stripePrice: e.target.value }))}
                className="w-full text-sm font-mono" placeholder="price_xxx..." />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">Créer</button>
            <button onClick={() => { setShowAdd(false); setAddError(''); }} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">Annuler</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {planKeys.map(key => {
          const p = plans[key];
          if (!p) return null;
          const planColor = PLAN_COLORS[key] || '#06b6d4';
          return (
            <div key={key} className={`bg-gray-900 border rounded-xl p-5 ${p.active ? 'border-gray-700' : 'border-gray-800 opacity-60'}`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: planColor }} />
                  <span className="font-mono text-sm text-gray-400">{key}</span>
                  {p.popular && <span className="text-xs bg-cyan-600 text-white px-2 py-0.5 rounded-full">Populaire</span>}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-400">{p.active ? 'Actif' : 'Inactif'}</span>
                    <div onClick={() => update(key, 'active', !p.active)}
                      className={`w-10 h-5 rounded-full transition-colors ${p.active ? 'bg-cyan-600' : 'bg-gray-700'} relative cursor-pointer`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${p.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nom affiché</label>
                  <input type="text" value={p.name} onChange={e => update(key, 'name', e.target.value)} className="w-full text-sm" />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Description (affichée sur le storefront)</label>
                  <textarea
                    value={p.description || ''}
                    onChange={e => update(key, 'description', e.target.value)}
                    className="w-full text-sm resize-none h-16"
                    placeholder="Ex: Idéal pour booster ses performances sur 30 jours..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Prix réel (centimes)</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={p.price} onChange={e => update(key, 'price', parseInt(e.target.value) || 0)}
                        className="flex-1 text-sm" min="0" />
                      <span className="text-gray-400 text-xs font-mono">{(p.price / 100).toFixed(2)}€</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Prix barré (0 = aucun)</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={p.originalPrice || 0} onChange={e => update(key, 'originalPrice', parseInt(e.target.value) || 0)}
                        className="flex-1 text-sm" min="0" />
                      <span className="text-gray-400 text-xs font-mono">{(p.originalPrice || 0) > 0 ? (p.originalPrice / 100).toFixed(2) + '€' : '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Preview réduction */}
                {(p.originalPrice || 0) > 0 && (
                  <div className="bg-gray-800 rounded-lg px-3 py-2 text-sm flex items-center gap-3">
                    <span className="text-gray-500 line-through">{(p.originalPrice / 100).toFixed(2)}€</span>
                    <span className="text-white font-bold">{(p.price / 100).toFixed(2)}€</span>
                    <span className="text-green-400 text-xs">-{Math.round((1 - p.price / p.originalPrice) * 100)}%</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Stripe Price ID (optionnel)</label>
                  <input type="text" value={p.stripePrice || ''} onChange={e => update(key, 'stripePrice', e.target.value)}
                    className="w-full text-sm font-mono" placeholder="price_xxx..." />
                </div>

                {/* Populaire toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-400">Badge "Populaire" sur le storefront</span>
                  <div onClick={() => setPopular(key)}
                    className={`w-10 h-5 rounded-full transition-colors ${p.popular ? 'bg-cyan-600' : 'bg-gray-700'} relative cursor-pointer`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${p.popular ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => handleSave(key)} disabled={saving === key}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    saved === key ? 'bg-green-600 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-gray-700'}`}>
                  {saving === key ? 'Sauvegarde...' : saved === key ? '✓ Sauvegardé' : 'Sauvegarder'}
                </button>
                <button onClick={() => handleDelete(key)} disabled={deleting === key}
                  className="px-3 py-2 rounded-lg text-sm bg-red-900 hover:bg-red-800 text-red-300 disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
