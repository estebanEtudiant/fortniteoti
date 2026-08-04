import React, { useState, useEffect } from 'react';
import { Globe, Shield, ShieldCheck, ShieldOff, KeyRound, Copy, Check, Smartphone } from 'lucide-react';
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
            {/* ── Annonce ── */}
            <div className="border border-gray-700 rounded-xl p-4 space-y-4">
              <p className="text-sm font-semibold text-gray-200">Bannière d'annonce</p>

              {/* Message */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Message affiché</label>
                <textarea value={settings.announcement || ''}
                  onChange={e => setSettings(s => ({ ...s, announcement: e.target.value }))}
                  className="w-full text-sm h-16 resize-none" placeholder="Laissez vide pour masquer la bannière…" />
              </div>

              {/* Label du badge + Icône */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Badge (texte)</label>
                  <input type="text" value={settings.announcementLabel || 'Annonce'}
                    onChange={e => setSettings(s => ({ ...s, announcementLabel: e.target.value }))}
                    className="w-full text-sm" placeholder="Annonce" maxLength={16} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Icône FontAwesome</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {['fa-fire','fa-bolt','fa-bell','fa-star','fa-gift','fa-megaphone','fa-tag','fa-circle-info'].map(ic => (
                      <button key={ic} title={ic}
                        onClick={() => setSettings(s => ({ ...s, announcementIcon: ic }))}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${settings.announcementIcon === ic ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                        <i className={`fa-solid ${ic}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Couleur */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'orange', hex: '#f97316' }, { key: 'blue',   hex: '#3b82f6' },
                    { key: 'green',  hex: '#22c55e' }, { key: 'red',    hex: '#ef4444' },
                    { key: 'purple', hex: '#a855f7' }, { key: 'cyan',   hex: '#06b6d4' },
                    { key: 'pink',   hex: '#ec4899' }, { key: 'yellow', hex: '#eab308' },
                  ].map(({ key, hex }) => (
                    <button key={key} title={key}
                      onClick={() => setSettings(s => ({ ...s, announcementColor: key }))}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{
                        backgroundColor: hex,
                        outline: settings.announcementColor === key ? `3px solid ${hex}` : '3px solid transparent',
                        outlineOffset: '2px',
                      }} />
                  ))}
                </div>
              </div>

              {/* Lien CTA */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Lien CTA (optionnel)</label>
                  <input type="url" value={settings.announcementLink || ''}
                    onChange={e => setSettings(s => ({ ...s, announcementLink: e.target.value }))}
                    className="w-full text-sm" placeholder="https://..." />
                </div>
                <div className="w-40">
                  <label className="block text-xs text-gray-400 mb-1">Texte du lien</label>
                  <input type="text" value={settings.announcementLinkText || 'En savoir plus'}
                    onChange={e => setSettings(s => ({ ...s, announcementLinkText: e.target.value }))}
                    className="w-full text-sm" placeholder="En savoir plus" maxLength={24} />
                </div>
              </div>

              {/* Fermable */}
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Bannière fermable</p>
                  <p className="text-xs text-gray-500">L'utilisateur peut masquer la bannière</p>
                </div>
                <div
                  onClick={() => setSettings(s => ({ ...s, announcementDismissible: !s.announcementDismissible }))}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${settings.announcementDismissible !== false ? 'bg-cyan-600' : 'bg-gray-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.announcementDismissible !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </div>
            </div>
            {/* ── Screenshots carousel ── */}
            <div className="border border-gray-700 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-200">Screenshots du logiciel</p>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Image principale (section produit)</label>
                <input type="url" value={settings.screenshotUrl || ''}
                  onChange={e => setSettings(s => ({ ...s, screenshotUrl: e.target.value }))}
                  className="w-full text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Images carousel — une URL par ligne</label>
                <textarea value={settings.screenshotUrls || ''}
                  onChange={e => setSettings(s => ({ ...s, screenshotUrls: e.target.value }))}
                  className="w-full text-sm h-24 resize-none font-mono"
                  placeholder={"https://exemple.com/img1.png\nhttps://exemple.com/img2.png\nhttps://exemple.com/img3.png"} />
                <p className="text-xs text-gray-500 mt-1">Si renseigné, remplace l'image principale par un carousel défilant. Laissez vide pour utiliser l'image principale seule.</p>
              </div>
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

      {/* Two-Factor Authentication */}
      <TwoFactorSection />
    </div>
  );
}

// ── Two-Factor Authentication (TOTP) ──
function TwoFactorSection() {
  const [enabled, setEnabled] = useState(null);   // null = loading
  const [mode, setMode] = useState('idle');       // 'idle' | 'setup' | 'disable'
  const [setupData, setSetupData] = useState(null); // { secret, qr }
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get2faStatus().then(r => setEnabled(r.enabled)).catch(() => setEnabled(false));
  }, []);

  const reset = () => { setMode('idle'); setSetupData(null); setCode(''); setPassword(''); setError(''); };

  const startSetup = async () => {
    setBusy(true); setError('');
    try {
      const data = await api.setup2fa();
      setSetupData(data);
      setMode('setup');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const confirmEnable = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.enable2fa(code);
      setEnabled(true);
      reset();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const confirmDisable = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.disable2fa(password, code);
      setEnabled(false);
      reset();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const copySecret = () => {
    if (!setupData?.secret) return;
    navigator.clipboard?.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 max-w-xl mt-6">
      <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-cyan-400" /> Double authentification (2FA)
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Ajoute un code à usage unique généré par une app (Google Authenticator, Authy…) en plus du mot de passe.
      </p>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

      {enabled === null ? (
        <p className="text-gray-500 text-sm">Chargement…</p>
      ) : enabled ? (
        <>
          <div className="flex items-center gap-2 text-green-400 text-sm mb-4">
            <ShieldCheck className="w-5 h-5" /> La 2FA est <span className="font-semibold">activée</span> sur ce compte.
          </div>
          {mode !== 'disable' ? (
            <button onClick={() => { setMode('disable'); setError(''); }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 text-red-400 flex items-center gap-2">
              <ShieldOff className="w-4 h-4" /> Désactiver la 2FA
            </button>
          ) : (
            <form onSubmit={confirmDisable} className="space-y-3 border-t border-gray-800 pt-4">
              <p className="text-sm text-gray-400">Confirme avec ton mot de passe et un code actuel pour désactiver.</p>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full text-sm" placeholder="Mot de passe" required />
              <input type="text" inputMode="numeric" maxLength={6} value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-sm tracking-[0.4em] text-center font-mono" placeholder="Code 2FA" required />
              <div className="flex gap-2">
                <button type="submit" disabled={busy}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white disabled:bg-gray-700">
                  {busy ? '…' : 'Confirmer la désactivation'}
                </button>
                <button type="button" onClick={reset} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-800">
                  Annuler
                </button>
              </div>
            </form>
          )}
        </>
      ) : mode !== 'setup' ? (
        <>
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
            <ShieldOff className="w-5 h-5 text-amber-400" /> La 2FA est <span className="font-semibold text-amber-400">désactivée</span>.
          </div>
          <button onClick={startSetup} disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-gray-700 flex items-center gap-2">
            <Smartphone className="w-4 h-4" /> {busy ? '…' : 'Activer la 2FA'}
          </button>
        </>
      ) : (
        <form onSubmit={confirmEnable} className="space-y-4 border-t border-gray-800 pt-4">
          <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
            <li>Scanne ce QR code avec ton app d'authentification.</li>
            <li>Saisis le code à 6 chiffres affiché pour confirmer.</li>
          </ol>
          {setupData?.qr && (
            <div className="flex justify-center">
              <img src={setupData.qr} alt="QR 2FA" className="w-48 h-48 rounded-lg bg-white p-2" />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ou saisis cette clé manuellement :</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-gray-950 border border-gray-800 rounded px-2 py-1.5 break-all">{setupData?.secret}</code>
              <button type="button" onClick={copySecret} className="text-gray-400 hover:text-white p-1.5 bg-gray-800 rounded">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <input type="text" inputMode="numeric" maxLength={6} value={code} autoFocus
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full text-lg tracking-[0.5em] text-center font-mono" placeholder="••••••" required />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || code.length !== 6}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-gray-700">
              {busy ? '…' : 'Activer'}
            </button>
            <button type="button" onClick={reset} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-800">
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
