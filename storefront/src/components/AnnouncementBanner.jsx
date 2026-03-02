import React from 'react';

export default function AnnouncementBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="announcement-banner">
      <span className="announcement-text">
        <i className="fa-solid fa-bullhorn"></i>
        {message}
      </span>
      <button className="announcement-close" onClick={onDismiss} aria-label="Fermer">✕</button>
    </div>
  );
}
