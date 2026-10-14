import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

// Cache partagé pour éviter N appels API
let _cache = null;
let _pending = null;

function getServers() {
  if (_cache) return Promise.resolve(_cache);
  if (_pending) return _pending;
  _pending = api.getServers().then(s => { _cache = s || []; _pending = null; return _cache; }).catch(() => { _cache = []; _pending = null; return []; });
  return _pending;
}

const FALLBACKS = {
  FTN_OPTIMIZER:  { label: 'FTN',      bg: 'bg-orange-500/20', text: 'text-orange-400' },
  NG_LOADER:      { label: 'NG',       bg: 'bg-violet-500/20', text: 'text-violet-400' },
  NG_LAUNCHER:    { label: 'Launcher', bg: 'bg-blue-500/20',   text: 'text-blue-400'   },
  MENORIA:        { label: 'Menoria',  bg: 'bg-amber-500/20',  text: 'text-amber-400'  },
  LOADER:         { label: 'Loader',   bg: 'bg-gray-500/20',   text: 'text-gray-400'   },
  FORTNITE_CLIENT: { label: 'FN Client',bg: 'bg-red-500/20',    text: 'text-red-400'    },
  MARVEL_RIVALS_CLIENT: { label: 'MR Client', bg: 'bg-pink-500/20', text: 'text-pink-400' },
  NG_RECUBE_CLIENT:     { label: 'NG Recube', bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  RUST_CLIENT:          { label: 'Rust',      bg: 'bg-yellow-700/20', text: 'text-yellow-500' },
};

function hexToClasses(hex) {
  // Convert server hex color to inline style
  return hex || '#6366f1';
}

export default function ProductBadge({ product }) {
  const [label, setLabel] = useState(FALLBACKS[product]?.label || product || '—');
  const [style, setStyle] = useState(null);
  const fallback = FALLBACKS[product];

  useEffect(() => {
    if (!product || fallback) return;
    getServers().then(servers => {
      const srv = servers.find(s => s.product === product);
      if (srv) {
        setLabel(srv.name);
        setStyle({ background: srv.color + '33', color: srv.color });
      }
    });
  }, [product]);

  if (fallback && !style) {
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${fallback.bg} ${fallback.text}`}>
        {label}
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 rounded text-xs font-semibold" style={style || { background: '#6366f133', color: '#6366f1' }}>
      {label}
    </span>
  );
}
