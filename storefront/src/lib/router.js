import { useState, useEffect } from 'react';

export function parsePath() {
  return window.location.pathname || '/';
}

export function getSearchParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function navigate(path) {
  history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

export function useRoute() {
  const [route, setRoute] = useState(parsePath);
  useEffect(() => {
    const handler = () => {
      setRoute(parsePath());
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  return route;
}
