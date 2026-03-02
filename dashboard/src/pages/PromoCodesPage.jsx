import React, { useState, useEffect } from 'react';
import { Tag, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';

export default function PromoCodesPage() {
  const [codes, setCodes] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'percent', amount: '', maxUses: '', stripeId: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      const data = await api.getPromoCodes();
      setCodes(data || {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);
    try {
      await api.createPromoCode({
        code: form.code.toUpperCase(),
        type: form.type,
        amount: Number(form.amount),
        maxUses: form.maxUses ? Number(form.maxUses) : 0,
        stripeId: form.stripeId || undefined,
      });
      setSuccess(`Code "${form.code.toUpperCase()}" créé`);
      setForm({ code: '', type: 'percent', amount: '', maxUses: '', stripeId: '' });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (code) => {
    if (!confirm(`Supprimer le code "${code}" ?`)) return;
    try {
      await api.deletePromoCode(code);
      setSuccess(`Code "${code}" supprimé`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleToggle = async (code, active) => {
    try {
      await api.togglePromoCode(code, active);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const codeList = Object.entries(codes).map(([code, v]) => ({ code, ...v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Tag className="w-6 h-6 text-cyan-400" />
        <h1 className="text-xl font-bold">Codes Promo</h1>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-2 rounded-lg text-sm">{success}</div>}

      {/* Create form */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-cyan-400" /> Créer un code
        </h2>
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Code *</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm uppercase"
              placeholder="SUMMER20"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Type *</label>
            <select
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            >
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (centimes €)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              {form.type === 'percent' ? 'Réduction (%)' : 'Montant (centimes)'} *
            </label>
            <input
              type="number"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              placeholder={form.type === 'percent' ? '20' : '500'}
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              required
              min="1"
              max={form.type === 'percent' ? 100 : undefined}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Utilisations max (0 = illimité)</label>
            <input
              type="number"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              placeholder="0"
              value={form.maxUses}
              onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
              min="0"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">ID Coupon Stripe (optionnel)</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              placeholder="promo_xxx... (depuis votre dashboard Stripe)"
              value={form.stripeId}
              onChange={e => setForm(f => ({ ...f, stripeId: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              Créez d'abord un coupon dans Stripe Dashboard → Promotions, puis collez son ID ici.
            </p>
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
              disabled={creating}
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Création...' : 'Créer le code'}
            </button>
          </div>
        </form>
      </div>

      {/* Code list */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold">Codes existants ({codeList.length})</h2>
          <button onClick={load} className="text-gray-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <Loading />
        ) : codeList.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">Aucun code promo créé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Réduction</th>
                  <th className="px-4 py-3 text-left">Utilisations</th>
                  <th className="px-4 py-3 text-left">Stripe ID</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {codeList.map(c => (
                  <tr key={c.code} className="hover:bg-gray-750">
                    <td className="px-4 py-3 font-mono font-bold text-cyan-400">{c.code}</td>
                    <td className="px-4 py-3 text-gray-300">{c.type === 'percent' ? 'Pourcentage' : 'Fixe'}</td>
                    <td className="px-4 py-3 text-green-400 font-semibold">
                      {c.type === 'percent' ? `-${c.amount}%` : `-${(c.amount / 100).toFixed(2)} €`}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {c.uses || 0}{c.maxUses > 0 ? ` / ${c.maxUses}` : ' / ∞'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.stripeId || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.active ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                        {c.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(c.code, !c.active)}
                        className={`text-xs px-2 py-1 rounded ${c.active ? 'bg-yellow-900/40 text-yellow-400 hover:bg-yellow-900/60' : 'bg-green-900/40 text-green-400 hover:bg-green-900/60'}`}
                      >
                        {c.active ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        onClick={() => handleDelete(c.code)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4 text-sm text-blue-300">
        <p className="font-semibold mb-1">Comment ça marche ?</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-400">
          <li>Créez un coupon dans <strong>Stripe Dashboard → Promotions → Coupons</strong></li>
          <li>Copiez l'ID du coupon Stripe (ex: <code className="bg-blue-900/40 px-1 rounded">promo_1AbC...</code>)</li>
          <li>Créez le code ici avec le même ID Stripe pour qu'il soit appliqué au checkout</li>
        </ol>
        <p className="mt-2 text-blue-500 text-xs">Sans ID Stripe, le code sera validé côté serveur mais la réduction ne sera pas appliquée dans Stripe.</p>
      </div>
    </div>
  );
}
