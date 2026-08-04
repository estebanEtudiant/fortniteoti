import React, { useState } from 'react';
import { Upload, Package, Image, Shield } from 'lucide-react';

import Collapsible from '../components/Collapsible';

import SoftwarePage from './SoftwarePage';
import NgLoaderPage from './NgLoaderPage';
import VeltharPage from './VeltharPage';
import MenoriaPage from './MenoriaPage';
import ImagesPage from './ImagesPage';
import GalleryPage from './GalleryPage';
import CheatFilesPage from './CheatFilesPage';

// ══════════════════════════════════════════════════════
//  UploadPage — regroupe tous les uploads en sections repliables
// ══════════════════════════════════════════════════════
export default function UploadPage({ navigate }) {
  // une seule section ouverte à la fois ; null = tout fermé
  const [openKey, setOpenKey] = useState(null);
  const toggle = (key) => setOpenKey((cur) => (cur === key ? null : key));

  const groups = [
    {
      title: 'Cheat Files',
      icon: Shield,
      sections: [
        { key: 'cheat-files', label: 'Cheat Files', sublabel: 'driver · reader · byovd · bundles', render: () => <CheatFilesPage /> },
      ],
    },
    {
      title: 'Logiciels & Loaders',
      icon: Package,
      sections: [
        { key: 'software', label: 'FTN Optimizer', sublabel: '.exe', render: () => <SoftwarePage /> },
        { key: 'ng-loader', label: 'NG Loader', sublabel: '.jar · launcher · JRE', render: () => <NgLoaderPage /> },
        { key: 'velthar', label: 'Velthar', sublabel: '.jar · launcher', render: () => <VeltharPage /> },
        { key: 'menoria', label: 'Menoria', sublabel: '.jar', render: () => <MenoriaPage /> },
      ],
    },
    {
      title: 'Images & Médias',
      icon: Image,
      sections: [
        { key: 'images', label: 'Images boutique', render: () => <ImagesPage /> },
        { key: 'gallery', label: 'Galerie', render: () => <GalleryPage navigate={navigate} /> },
        { key: 'shop-media', label: 'Boutique 404 GG', sublabel: 'images du shop', render: () => <GalleryPage tabs={[{ id: 'shop', label: '404 GG' }]} title="Médias boutique (404 GG)" /> },
      ],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Upload className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold">Upload</h1>
          <p className="text-gray-500 text-sm">Tout le contenu à mettre en ligne, regroupé ici.</p>
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.title} className="space-y-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm font-semibold uppercase tracking-wide">
            <group.icon className="w-4 h-4" />
            {group.title}
          </div>
          <div className="space-y-2">
            {group.sections.map((s) => (
              <Collapsible
                key={s.key}
                label={s.label}
                sublabel={s.sublabel}
                open={openKey === s.key}
                onToggle={() => toggle(s.key)}
              >
                {s.render()}
              </Collapsible>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
