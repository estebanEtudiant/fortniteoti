import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, UserCheck, UserX, Mail, XCircle, Trash2, KeyRound, Link2,
} from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import StatusBadge from '../components/StatusBadge';
import OrderStatusBadge from '../components/OrderStatusBadge';
import InfoCard from '../components/InfoCard';
import { formatPlan, formatDate } from '../lib/utils';

const LICENSE_PLAN_OPTIONS = [
  { value: 'DAYS_1', label: '1 jour' },
  { value: 'DAYS_7', label: '7 jours' },
  { value: 'DAYS_14', label: '14 jours' },
  { value: 'DAYS_30', label: '30 jours' },
  { value: 'DAYS_90', label: '90 jours' },
  { value: 'DAYS_365', label: '1 an' },
  { value: 'LIFETIME', label: 'Lifetime' },
];

export default function CustomerDetailPage({ id, navigate }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [productOptions, setProductOptions] = useState([
    { value: 'FTN_OPTIMIZER', label: 'FTN Optimizer' },
  ]);
  const [licenseForm, setLicenseForm] = useState({
    plan: 'DAYS_30',
    customDays: '',
    maxActivations: '1',
    sendEmail: true,
    product: 'FTN_OPTIMIZER',
  });
  const [attachLicenseForm, setAttachLicenseForm] = useState({
    licenseKey: '',
    sendEmail: true,
  });

  const load = useCallback(() => {
    setLoading(true);
    api.getCustomer(id).then(setCustomer).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.getServers().then(servers => {
      const seen = new Set();
      const opts = [{ value: 'FTN_OPTIMIZER', label: 'FTN Optimizer' }];
      (servers || []).filter(s => s.active && s.product && !seen.has(s.product) && seen.add(s.product))
        .forEach(s => opts.push({ value: s.product, label: s.name }));
      setProductOptions(opts);
    }).catch(() => {});
  }, []);

  const doAction = async (action) => {
    setActionLoading(action);
    setActionMsg('');

    try {
      if (action === 'ban') await api.banCustomer(id);
      if (action === 'unban') await api.unbanCustomer(id);

      if (action === 'reset-email') {
        await api.sendPasswordReset(id);
        setActionMsg('Email de reinitialisation envoye !');
        setTimeout(() => setActionMsg(''), 3000);
        return;
      }

      if (action === 'revoke') {
        if (!confirm('Revoquer toutes les licences actives de ce compte ?')) return;
        const res = await api.revokeCustomerLicenses(id);
        setActionMsg(`${res.revoked} licence(s) revoquee(s)`);
        setTimeout(() => setActionMsg(''), 3000);
        load();
        return;
      }

      if (action === 'delete') {
        if (!confirm('Supprimer definitivement ce compte ?')) return;
        await api.deleteCustomer(id);
        navigate('/customers');
        return;
      }

      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const addLicenseToCustomer = async (e) => {
    e.preventDefault();
    setActionLoading('add-license');
    setActionMsg('');

    try {
      const payload = {
        plan: licenseForm.plan,
        sendEmail: licenseForm.sendEmail,
        product: licenseForm.product,
      };

      const customDays = Number(licenseForm.customDays);
      if (licenseForm.customDays !== '' && Number.isFinite(customDays) && customDays > 0) {
        payload.customDays = customDays;
      }

      const maxActivations = Number(licenseForm.maxActivations);
      if (licenseForm.maxActivations !== '' && Number.isFinite(maxActivations) && maxActivations > 0) {
        payload.maxActivations = maxActivations;
      }

      const res = await api.addCustomerLicense(id, payload);
      const key = res?.license?.licenseKey;
      const emailInfo = res?.emailSent === false ? ' (email non envoye)' : '';

      setActionMsg(key ? `Licence ajoutee: ${key}${emailInfo}` : `Licence ajoutee avec succes${emailInfo}`);
      setLicenseForm(prev => ({ ...prev, customDays: '' }));
      await load();
      setTimeout(() => setActionMsg(''), 5000);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const attachExistingLicenseToCustomer = async (e) => {
    e.preventDefault();
    setActionLoading('attach-license');
    setActionMsg('');

    try {
      const key = String(attachLicenseForm.licenseKey || '').trim().toUpperCase();
      if (!key) {
        alert('Veuillez renseigner une cle de licence');
        return;
      }

      const res = await api.attachExistingCustomerLicense(id, {
        licenseKey: key,
        sendEmail: attachLicenseForm.sendEmail,
      });

      const emailInfo = res?.emailSent === false ? ' (email non envoye)' : '';
      const alreadyInfo = res?.alreadyAssigned ? ' (deja rattachee)' : '';
      setActionMsg(`Licence rattachee: ${key}${alreadyInfo}${emailInfo}`);
      setAttachLicenseForm(prev => ({ ...prev, licenseKey: '' }));
      await load();
      setTimeout(() => setActionMsg(''), 5000);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading('');
    }
  };

  if (loading) return <Loading />;
  if (!customer) return <p className="text-gray-500">Utilisateur introuvable</p>;

  return (
    <div>
      <button onClick={() => navigate('/customers')} className="text-gray-400 hover:text-white text-sm mb-4 flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xl">
          {(customer.displayName || customer.username || '?')[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{customer.displayName || customer.username}</h1>
          <p className="text-gray-400 text-sm">{customer.email}</p>
        </div>
        {customer.banned && <span className="ml-2 text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400">Banni</span>}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <InfoCard label="Username" value={customer.username} />
        <InfoCard label="Discord" value={customer.discordId || '-'} />
        <InfoCard label="Inscrit le" value={formatDate(customer.createdAt)} />
        <InfoCard label="Derniere connexion" value={formatDate(customer.lastLogin)} />
        <InfoCard label="Email verifie" value={customer.emailVerified ? 'Oui' : 'Non'} />
        <InfoCard label="Commandes" value={customer.orders?.length ?? 0} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold mb-3">Actions</h2>
        {actionMsg && (
          <div className="mb-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">
            {actionMsg}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {customer.banned ? (
            <button
              onClick={() => doAction('unban')}
              disabled={!!actionLoading}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" /> {actionLoading === 'unban' ? '...' : 'Debannir'}
            </button>
          ) : (
            <button
              onClick={() => doAction('ban')}
              disabled={!!actionLoading}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
            >
              <UserX className="w-4 h-4" /> {actionLoading === 'ban' ? '...' : 'Bannir'}
            </button>
          )}

          <button
            onClick={() => doAction('reset-email')}
            disabled={!!actionLoading}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Mail className="w-4 h-4" /> {actionLoading === 'reset-email' ? '...' : 'Envoyer reset email'}
          </button>

          <button
            onClick={() => doAction('revoke')}
            disabled={!!actionLoading}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" /> {actionLoading === 'revoke' ? '...' : 'Revoquer licences'}
          </button>

          <button
            onClick={() => doAction('delete')}
            disabled={!!actionLoading}
            className="bg-gray-700 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> {actionLoading === 'delete' ? '...' : 'Supprimer le compte'}
          </button>
        </div>

        <form onSubmit={addLicenseToCustomer} className="mt-5 pt-5 border-t border-gray-800">
          <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-cyan-400" /> Ajouter une licence
          </h3>

          <div className="grid lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Produit</label>
              <select
                value={licenseForm.product}
                onChange={(e) => setLicenseForm(prev => ({ ...prev, product: e.target.value }))}
                className="w-full"
                disabled={!!actionLoading}
              >
                {productOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Plan</label>
              <select
                value={licenseForm.plan}
                onChange={(e) => setLicenseForm(prev => ({ ...prev, plan: e.target.value }))}
                className="w-full"
                disabled={!!actionLoading}
              >
                {LICENSE_PLAN_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Jours custom (optionnel)</label>
              <input
                type="number"
                min="1"
                max="3650"
                value={licenseForm.customDays}
                onChange={(e) => setLicenseForm(prev => ({ ...prev, customDays: e.target.value }))}
                className="w-full"
                placeholder="ex: 45"
                disabled={!!actionLoading}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Activations max</label>
              <input
                type="number"
                min="1"
                max="10"
                value={licenseForm.maxActivations}
                onChange={(e) => setLicenseForm(prev => ({ ...prev, maxActivations: e.target.value }))}
                className="w-full"
                disabled={!!actionLoading}
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={!!actionLoading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {actionLoading === 'add-license' ? 'Ajout...' : 'Ajouter la licence'}
              </button>
            </div>
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-xs text-gray-300">
            <input
              type="checkbox"
              checked={licenseForm.sendEmail}
              onChange={(e) => setLicenseForm(prev => ({ ...prev, sendEmail: e.target.checked }))}
              disabled={!!actionLoading}
            />
            Envoyer la cle de licence par email
          </label>
        </form>

        <form onSubmit={attachExistingLicenseToCustomer} className="mt-5 pt-5 border-t border-gray-800">
          <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-cyan-400" /> Rattacher une licence existante
          </h3>

          <div className="grid lg:grid-cols-4 gap-3">
            <div className="lg:col-span-3">
              <label className="block text-xs text-gray-400 mb-1">Cle de licence</label>
              <input
                type="text"
                value={attachLicenseForm.licenseKey}
                onChange={(e) => setAttachLicenseForm(prev => ({ ...prev, licenseKey: e.target.value }))}
                className="w-full font-mono"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                disabled={!!actionLoading}
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={!!actionLoading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {actionLoading === 'attach-license' ? 'Rattachement...' : 'Rattacher la licence'}
              </button>
            </div>
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-xs text-gray-300">
            <input
              type="checkbox"
              checked={attachLicenseForm.sendEmail}
              onChange={(e) => setAttachLicenseForm(prev => ({ ...prev, sendEmail: e.target.checked }))}
              disabled={!!actionLoading}
            />
            Envoyer la cle de licence par email
          </label>
        </form>
      </div>

      {customer.licenses?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Licences</h2>
          <div className="space-y-2">
            {customer.licenses.map((lic) => (
              <div key={lic.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3">
                <div>
                  <span className="font-mono text-xs text-cyan-400">{lic.licenseKey}</span>
                  <span className="ml-3 text-gray-400 text-xs">{formatPlan(lic.plan)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={lic.status} />
                  <button
                    onClick={() => navigate(`/licenses/${lic.id}`)}
                    className="text-xs text-gray-400 hover:text-white underline"
                  >
                    Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {customer.orders?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Commandes</h2>
          <div className="space-y-2">
            {customer.orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3 text-sm">
                <div>
                  <span>{formatPlan(o.plan)}</span>
                  <span className="text-gray-500 text-xs ml-3">{formatDate(o.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-green-400">{(o.amount / 100).toFixed(2)}EUR</span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
