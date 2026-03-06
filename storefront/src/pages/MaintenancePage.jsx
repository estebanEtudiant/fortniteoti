import React from 'react';
import { useTranslation } from '../lib/i18n.jsx';

export default function MaintenancePage({ discordUrl }) {
  const { t } = useTranslation();

  return (
    <div className="maintenance-page">
      <div className="maintenance-gear">?</div>
      <h1 className="maintenance-title">{t('maintenance.title')}</h1>
      <p className="maintenance-msg">{t('maintenance.message')}</p>
      {discordUrl && (
        <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="maintenance-discord">
          <i className="fa-brands fa-discord"></i> {t('maintenance.discord')}
        </a>
      )}
    </div>
  );
}
