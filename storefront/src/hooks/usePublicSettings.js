import { useState, useEffect } from 'react';
import api from '../lib/api.js';

export function usePublicSettings() {
  const [settings, setSettings] = useState({});
  useEffect(() => {
    api.getPublicSettings().then(setSettings).catch(() => {});
  }, []);
  return settings;
}
