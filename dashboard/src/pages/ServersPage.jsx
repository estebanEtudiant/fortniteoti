import React, { useState, useEffect } from 'react';
import { Server, Plus, RefreshCw, Trash2, Edit2, Check, X } from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';

const PRODUCTS = ['NG_LOADER', 'MENORIA', 'NG_LAUNCHER', 'LOADER', 'FTN_OPTIMIZER', 'VELTHAR_LOADER', 'VELTHAR_LAUNCHER'];

const DEFAULT_FORM = { id: '', name: '', description: '', color: '#3b82f6', product: 'NG_LOADER' };

export default function ServersPage() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const load = async () => {
    try {
      const data = await api.getServers();
      setServers(Array.isArray(data) ? data : []);
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
      await api.createServer({
        id: form.id.toLowerCase().trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color,
        product: form.product,
      });
      setSuccess(`Serveur "${form.name}" créé`);
      setForm(DEFAULT_FORM);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (srv) => {
    try {
      await api.updateServer(srv.id, { active: !srv.active });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (srv) => {
    if (!confirm(`Supprimer le serveur "${srv.name}" ?`)) return;
    try {
      await api.deleteServer(srv.id);
      setSuccess(`Serveur "${srv.name}" supprimé`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const startEdit = (srv) => {
    setEditingId(srv.id);
    setEditForm({ name: srv.name, description: srv.description, color: srv.color, product: srv.product });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async (id) => {
    setError('');
    try {
      await api.updateServer(id, editForm);
      setSuccess('Serveur mis à jour');
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Server className="w-6 h-6 text-cyan-400" />
        <h1 className="text-xl font-bold">Serveurs</h1>
      </div>

      {error   && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-2 rounded-lg text-sm">{success}</div>}

      {/* Server list */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold">Serveurs existants ({servers.length})</h2>
          <button onClick={load} className="text-gray-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <Loading />
        ) : servers.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">Aucun serveur configuré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Couleur</th>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Nom</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Produit</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {servers.map(srv => (
                  <tr key={srv.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3">
                      {editingId === srv.id ? (
                        <input
                          type="color"
                          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                          value={editForm.color}
                          onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))}
                        />
                      ) : (
                        <span
                          className="inline-block w-5 h-5 rounded-full border border-gray-600"
                          style={{ background: srv.color }}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-cyan-400 text-xs">{srv.id}</td>
                    <td className="px-4 py-3 font-semibold">
                      {editingId === srv.id ? (
                        <input
                          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm w-full"
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        />
                      ) : srv.name}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px]">
                      {editingId === srv.id ? (
                        <input
                          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm w-full"
                          value={editForm.description}
                          onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        />
                      ) : srv.description}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-300">
                      {editingId === srv.id ? (
                        <select
                          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
                          value={editForm.product}
                          onChange={e => setEditForm(f => ({ ...f, product: e.target.value }))}
                        >
                          {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      ) : srv.product}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${srv.active ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                        {srv.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {editingId === srv.id ? (
                          <>
                            <button
                              onClick={() => saveEdit(srv.id)}
                              className="text-green-400 hover:text-green-300"
                              title="Sauvegarder"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-gray-400 hover:text-gray-200"
                              title="Annuler"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleToggle(srv)}
                              className={`text-xs px-2 py-1 rounded ${srv.active ? 'bg-yellow-900/40 text-yellow-400 hover:bg-yellow-900/60' : 'bg-green-900/40 text-green-400 hover:bg-green-900/60'}`}
                            >
                              {srv.active ? 'Désactiver' : 'Activer'}
                            </button>
                            <button
                              onClick={() => startEdit(srv)}
                              className="text-blue-400 hover:text-blue-300"
                              title="Éditer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(srv)}
                              className="text-red-400 hover:text-red-300"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create form */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-cyan-400" /> Ajouter un serveur
        </h2>
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">ID (slug) *</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm lowercase"
              placeholder="ex: ng, menoria, ftn"
              value={form.id}
              onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
              required
              pattern="[a-z0-9_-]+"
              title="Lettres minuscules, chiffres, tirets ou underscores"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nom *</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              placeholder="ex: NationsGlory"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Description *</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              placeholder="ex: 1.8 PvP — modules combat, mobilité, visuel"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Couleur *</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="w-10 h-10 rounded cursor-pointer border border-gray-700 bg-gray-900"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              />
              <input
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder="#3b82f6"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                pattern="#[0-9a-fA-F]{6}"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Produit *</label>
            <select
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              value={form.product}
              onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
            >
              {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
              disabled={creating}
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Création...' : 'Ajouter le serveur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
