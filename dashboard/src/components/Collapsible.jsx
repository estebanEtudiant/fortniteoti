import React from 'react';
import { ChevronDown } from 'lucide-react';

// ══════════════════════════════════════════════════════
//  Collapsible — section repliable (accordéon)
//  L'enfant n'est monté qu'à la première ouverture (lazy),
//  puis gardé monté pour préserver son état.
// ══════════════════════════════════════════════════════
export default function Collapsible({ icon: Icon, label, sublabel, open, onToggle, children }) {
  const [hasOpened, setHasOpened] = React.useState(open);

  React.useEffect(() => { if (open) setHasOpened(true); }, [open]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors
          ${open ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-200 hover:bg-gray-800/60'}`}
      >
        {Icon && <Icon className="w-5 h-5 shrink-0" />}
        <span className="font-medium">{label}</span>
        {sublabel && <span className="text-xs text-gray-500 hidden sm:inline">{sublabel}</span>}
        <ChevronDown
          className={`w-5 h-5 ml-auto shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {hasOpened && (
        <div className={`border-t border-gray-800 p-4 ${open ? 'block' : 'hidden'}`}>
          {children}
        </div>
      )}
    </div>
  );
}
