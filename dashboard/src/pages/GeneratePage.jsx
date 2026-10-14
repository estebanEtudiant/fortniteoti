import React, { useState, useEffect } from 'react';
import { ChevronRight, Copy, Check } from 'lucide-react';
import { api } from '../lib/api';

const PLAN_ICON_MAP = {
  DAYS_1:   { emoji: '⚡', label: '1 jour' },
  DAYS_7:   { emoji: '📅', label: '7 jours' },
  DAYS_14:  { emoji: '📅', label: '14 jours' },
  DAYS_30:  { emoji: '🗓️', label: '30 jours' },
  DAYS_90:  { emoji: '🗓️', label: '90 jours' },
  DAYS_365: { emoji: '⭐', label: '1 an' },
  LIFETIME: { emoji: '♾️', label: 'Illimité' },
};

function planEmoji(key) { return PLAN_ICON_MAP[key]?.emoji || '🔑'; }
function planLabel(key) { return PLAN_ICON_MAP[key]?.label || key; }

function PlanDropdown({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.key === value) || options[0];
  if (!selected) return null;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 bg-gray-800 border border-gray-700 hover:border-cyan-600 rounded-lg px-3 py-2.5 text-left transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xl leading-none">{selected.emoji}</span>
          <div>
            <div className="text-sm font-medium text-white">{selected.name}</div>
            <div className="text-xs text-gray-500">{selected.sub}</div>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
          {options.map(opt => (
            <button key={opt.key} type="button"
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left ${value === opt.key ? 'bg-gray-800' : ''}`}>
              <span className="text-xl leading-none">{opt.emoji}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{opt.name}</div>
                <div className="text-xs text-gray-500">{opt.sub}</div>
              </div>
              {value === opt.key && <div className="w-2 h-2 rounded-full bg-cyan-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const GENERATE_PLANS = [
  { key: 'DAYS_1',   name: '1 Jour',    emoji: planEmoji('DAYS_1'),   sub: planLabel('DAYS_1') },
  { key: 'DAYS_7',   name: '7 Jours',   emoji: planEmoji('DAYS_7'),   sub: planLabel('DAYS_7') },
  { key: 'DAYS_14',  name: '14 Jours',  emoji: planEmoji('DAYS_14'),  sub: planLabel('DAYS_14') },
  { key: 'DAYS_30',  name: '30 Jours',  emoji: planEmoji('DAYS_30'),  sub: planLabel('DAYS_30') },
  { key: 'DAYS_90',  name: '90 Jours',  emoji: planEmoji('DAYS_90'),  sub: planLabel('DAYS_90') },
  { key: 'DAYS_365', name: '1 An',      emoji: planEmoji('DAYS_365'), sub: planLabel('DAYS_365') },
  { key: 'LIFETIME', name: 'Lifetime',  emoji: planEmoji('LIFETIME'), sub: planLabel('LIFETIME') },
];

const STATIC_PRODUCTS = [
  { key: 'FTN_OPTIMIZER', label: 'FTN Optimizer', emoji: '⚡', sub: 'Logiciel FortniteOpti' },
  { key: 'FORTNITE_CLIENT', label: 'Fortnite Client', emoji: '🎯', sub: 'Cheat loader (driver/reader/byovd)' },
  { key: 'MARVEL_RIVALS_CLIENT', label: 'Marvel Rivals Client', emoji: '🦸', sub: 'Cheat loader Marvel Rivals' },
  { key: 'NG_RECUBE_CLIENT', label: 'NG Recube Client', emoji: '🧊', sub: 'NG Recube cheat loader (driver/reader/byovd)' },
  { key: 'RUST_CLIENT', label: 'Rust Client', emoji: '🦀', sub: 'Cheat loader Rust (Facepunch)' },
];

export default function GeneratePage() {
  const [plan, setPlan] = useState('DAYS_30');
  const [product, setProduct] = useState('FTN_OPTIMIZER');
  const [products, setProducts] = useState(STATIC_PRODUCTS);

  useEffect(() => {
    api.getServers().then(servers => {
      const seen = new Set();
      const serverProducts = (servers || [])
        .filter(s => s.active && s.product && !seen.has(s.product) && seen.add(s.product))
        .map(s => ({ key: s.product, label: s.name, emoji: '🎮', sub: s.description || s.product }));
      setProducts([...STATIC_PRODUCTS, ...serverProducts]);
    }).catch(() => {});
  }, []);
  const [count, setCount] = useState(1);
  const [email, setEmail] = useState('');
  const [startOnActivation, setStartOnActivation] = useState(true);   // durée démarrée au 1er lancement du loader
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('single');
  const [copiedAll, setCopiedAll] = useState(false);

  const handleGenerate = async () => {
    setLoading(true); setKeys([]);
    try {
      if (mode === 'batch') {
        const data = await api.generateBatch({ plan, count: parseInt(count) || 1, product, startOnActivation: plan !== 'LIFETIME' && startOnActivation });
        setKeys(data.keys);
      } else {
        const data = await api.createLicense({ plan, email: email || undefined, product, startOnActivation: plan !== 'LIFETIME' && startOnActivation });
        setKeys([data.licenseKey]);
      }
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(keys.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Générer des Clés</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 max-w-lg mb-6">
        <div className="flex gap-2 mb-5">
          <button onClick={() => setMode('single')}
            className={`px-4 py-2 rounded-lg text-sm ${mode === 'single' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
            Clé unique
          </button>
          <button onClick={() => setMode('batch')}
            className={`px-4 py-2 rounded-lg text-sm ${mode === 'batch' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
            Lot (batch)
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Produit</label>
            <div className="grid grid-cols-2 gap-2">
              {products.map(p => (
                <button key={p.key} type="button" onClick={() => setProduct(p.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${product === p.key ? 'bg-cyan-600/20 border-cyan-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                  <span className="text-lg">{p.emoji}</span>
                  <div>
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="text-xs opacity-60">{p.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Plan</label>
            <PlanDropdown options={GENERATE_PLANS} value={plan} onChange={setPlan} />
          </div>

          {mode === 'batch' ? (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre de clés</label>
              <input type="number" value={count} onChange={e => setCount(e.target.value)} min="1" max="500" className="w-full" />
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email (optionnel)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full" placeholder="client@email.com" />
            </div>
          )}

          {plan !== 'LIFETIME' && (
            <label className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/60 border border-gray-700 cursor-pointer">
              <input type="checkbox" checked={startOnActivation} onChange={e => setStartOnActivation(e.target.checked)} className="mt-0.5 w-4 h-4 accent-cyan-500" />
              <span>
                <span className="block text-sm text-gray-200 font-medium">Démarrer la durée à la 1ʳᵉ activation</span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  {startOnActivation
                    ? "Le compte à rebours commence quand la clé est lancée pour la première fois dans le loader (idéal pour des clés vendues plus tard)."
                    : "Le compte à rebours commence dès maintenant, à la génération."}
                </span>
              </span>
            </label>
          )}

          <button onClick={handleGenerate} disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white py-2.5 rounded-lg font-medium">
            {loading ? 'Génération...' : `Générer ${mode === 'batch' ? (count + ' clé(s)') : 'la clé'}`}
          </button>
        </div>
      </div>

      {keys.length > 0 && (
        <div className="bg-gray-900 border border-green-800/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-green-400">{keys.length} clé(s) générée(s)</h2>
            <button onClick={handleCopyAll}
              className={`text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${copiedAll ? 'bg-green-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}>
              {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedAll ? 'Copié !' : 'Copier tout'}
            </button>
          </div>
          <div className="bg-gray-950 rounded-lg p-3 font-mono text-sm max-h-80 overflow-auto space-y-1">
            {keys.map((k, i) => (
              <div key={i} className="text-cyan-400 hover:bg-gray-800 px-2 py-1 rounded cursor-pointer flex items-center justify-between group"
                onClick={() => navigator.clipboard.writeText(k)}>
                <span>{k}</span>
                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
