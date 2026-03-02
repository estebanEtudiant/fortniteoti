import React from 'react';

export default function MaintenancePage({ discordUrl }) {
  return (
    <div className="maintenance-page">
      <div className="maintenance-gear">⚙</div>
      <h1 className="maintenance-title">Maintenance en cours</h1>
      <p className="maintenance-msg">
        Le site est temporairement indisponible. Merci de revenir dans quelques instants.
      </p>
      {discordUrl && (
        <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="maintenance-discord">
          <i className="fa-brands fa-discord"></i> Rejoindre notre Discord
        </a>
      )}
    </div>
  );
}
