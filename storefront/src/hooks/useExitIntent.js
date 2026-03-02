import { useEffect } from 'react';

export function useExitIntent(callback) {
  useEffect(() => {
    if (sessionStorage.getItem('exitIntentShown')) return;
    const handler = (e) => {
      // relatedTarget est null quand la souris quitte le viewport (vers le chrome du navigateur)
      if (!e.relatedTarget && e.clientY <= 5) {
        sessionStorage.setItem('exitIntentShown', '1');
        callback();
      }
    };
    document.addEventListener('mouseout', handler);
    return () => document.removeEventListener('mouseout', handler);
  }, []);
}
