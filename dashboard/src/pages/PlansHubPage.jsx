import React, { useState } from 'react';
import { Package } from 'lucide-react';

import Collapsible from '../components/Collapsible';

import PlansPage from './PlansPage';
import NgPlansPage from './NgPlansPage';
import VeltharPlansPage from './VeltharPlansPage';
import MenoriaPlansPage from './MenoriaPlansPage';

// ══════════════════════════════════════════════════════
//  PlansHubPage — regroupe tous les plans en sections repliables
// ══════════════════════════════════════════════════════
export default function PlansHubPage() {
  // une seule section ouverte à la fois ; null = tout fermé
  const [openKey, setOpenKey] = useState(null);
  const toggle = (key) => setOpenKey((cur) => (cur === key ? null : key));

  const sections = [
    { key: 'ftn', label: 'Plans FTN', render: () => <PlansPage /> },
    { key: 'ng', label: 'Plans NG', render: () => <NgPlansPage /> },
    { key: 'velthar', label: 'Plans Velthar', render: () => <VeltharPlansPage /> },
    { key: 'menoria', label: 'Plans Menoria', render: () => <MenoriaPlansPage /> },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Package className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold">Plans</h1>
          <p className="text-gray-500 text-sm">Tous les plans tarifaires, regroupés ici.</p>
        </div>
      </div>

      <div className="space-y-2">
        {sections.map((s) => (
          <Collapsible
            key={s.key}
            label={s.label}
            open={openKey === s.key}
            onToggle={() => toggle(s.key)}
          >
            {s.render()}
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
