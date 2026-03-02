import { useState, useEffect } from 'react';
import api from '../lib/api.js';

export function useDownloadUrl() {
  const [url, setUrl] = useState(import.meta.env.VITE_DOWNLOAD_URL || '#');
  useEffect(() => {
    api.getLatestSoftware()
      .then(data => { if (data?.url) setUrl(data.url); })
      .catch(() => {});
  }, []);
  return url;
}
