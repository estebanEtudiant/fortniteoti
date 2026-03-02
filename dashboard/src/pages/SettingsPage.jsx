import React, { useState, useEffect } from 'react';
import { Globe, Shield } from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError('Les mots de passe ne correspondent pas');
      return;
    }
    setPwLoading(true); setPwError(''); setPwSuccess(false);
    try {
      await api.changeAdminPassword(pwForm.currentPassword, pwForm.newPassword);
      setPwSuccess(true);
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { setPwError(err.message); }
    finally { setPwLoading(false); }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Paramètres</h1>

      {/* Site Settings */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-400" /> Paramètres du site
        </h2>
        {settings && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm text-gray-400 mb-1">URL de téléchargement du logiciel</label>
              <input type="url" value={settings.downloadUrl || ''}
                onChange={e => setSettings(s => ({ ...s, downloadUrl: e.target.value }))}
                className="w-full text-sm" placeholder="https://..." />
              <p className="text-xs text-gray-500 mt-1">Lien affiché aux clients après achat et sur leur profil.</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Annonce publique (affiché sur le storefront)</label>
              <textarea value={settings.announcement || ''}
                onChange={e => setSettings(s => ({ ...s, announcement: e.target.value }))}
                className="w-full text-sm h-20 resize-none" placeholder="Ex: Maintenance prévue le 01/01..." />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">URL d'invitation Discord</label>
              <input type="url" value={settings.discordInviteUrl || ''}
                onChange={e => setSettings(s => ({ ...s, discordInviteUrl: e.target.value }))}
                className="w-full text-sm" placeholder="https://discord.gg/..." />
              <p className="text-xs text-gray-500 mt-1">Lien affiché dans le header et footer du storefront.</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">Mode maintenance</p>
                <p className="text-xs text-gray-500">Empêche les nouveaux achats sur le storefront</p>
              </div>
              <div
                onClick={() => setSettings(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${settings.maintenanceMode ? 'bg-orange-500' : 'bg-gray-700'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </div>
            <button onClick={handleSaveSettings} disabled={saving}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-gray-700'}`}>
              {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder les paramètres'}
            </button>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 max-w-xl">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" /> Changer le mot de passe admin
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {pwError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{pwError}</div>}
          {pwSuccess && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">Mot de passe modifié avec succès.</div>}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Mot de passe actuel</label>
            <input type="password" value={pwForm.currentPassword}
              onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
              className="w-full text-sm" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nouveau mot de passe</label>
            <input type="password" value={pwForm.newPassword}
              onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
              className="w-full text-sm" minLength={8} required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirmer le nouveau mot de passe</label>
            <input type="password" value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              className="w-full text-sm" required />
          </div>
          <button type="submit" disabled={pwLoading}
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-gray-700">
            {pwLoading ? 'Modification...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
