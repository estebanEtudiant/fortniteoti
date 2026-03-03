import React from 'react';

const COLOR_PRESETS = {
  orange: { '--ann-bg-start': 'rgba(255,140,0,0.18)', '--ann-bg-mid': 'rgba(255,200,0,0.10)', '--ann-bg-end': 'rgba(255,140,0,0.18)', '--ann-border': 'rgba(255,160,0,0.45)', '--ann-border-light': 'rgba(255,160,0,0.20)', '--ann-shadow': 'rgba(255,140,0,0.12)', '--ann-tag': 'rgba(255,140,0,0.85)', '--ann-accent': '#ff8c00' },
  blue:   { '--ann-bg-start': 'rgba(59,130,246,0.18)', '--ann-bg-mid': 'rgba(100,160,255,0.10)', '--ann-bg-end': 'rgba(59,130,246,0.18)', '--ann-border': 'rgba(59,130,246,0.45)', '--ann-border-light': 'rgba(59,130,246,0.20)', '--ann-shadow': 'rgba(59,130,246,0.12)', '--ann-tag': 'rgba(59,130,246,0.85)', '--ann-accent': '#3b82f6' },
  green:  { '--ann-bg-start': 'rgba(34,197,94,0.18)', '--ann-bg-mid': 'rgba(74,222,128,0.10)', '--ann-bg-end': 'rgba(34,197,94,0.18)', '--ann-border': 'rgba(34,197,94,0.45)', '--ann-border-light': 'rgba(34,197,94,0.20)', '--ann-shadow': 'rgba(34,197,94,0.12)', '--ann-tag': 'rgba(34,197,94,0.85)', '--ann-accent': '#22c55e' },
  red:    { '--ann-bg-start': 'rgba(239,68,68,0.18)', '--ann-bg-mid': 'rgba(255,100,100,0.10)', '--ann-bg-end': 'rgba(239,68,68,0.18)', '--ann-border': 'rgba(239,68,68,0.45)', '--ann-border-light': 'rgba(239,68,68,0.20)', '--ann-shadow': 'rgba(239,68,68,0.12)', '--ann-tag': 'rgba(239,68,68,0.85)', '--ann-accent': '#ef4444' },
  purple: { '--ann-bg-start': 'rgba(168,85,247,0.18)', '--ann-bg-mid': 'rgba(196,120,255,0.10)', '--ann-bg-end': 'rgba(168,85,247,0.18)', '--ann-border': 'rgba(168,85,247,0.45)', '--ann-border-light': 'rgba(168,85,247,0.20)', '--ann-shadow': 'rgba(168,85,247,0.12)', '--ann-tag': 'rgba(168,85,247,0.85)', '--ann-accent': '#a855f7' },
  cyan:   { '--ann-bg-start': 'rgba(6,182,212,0.18)', '--ann-bg-mid': 'rgba(34,211,238,0.10)', '--ann-bg-end': 'rgba(6,182,212,0.18)', '--ann-border': 'rgba(6,182,212,0.45)', '--ann-border-light': 'rgba(6,182,212,0.20)', '--ann-shadow': 'rgba(6,182,212,0.12)', '--ann-tag': 'rgba(6,182,212,0.85)', '--ann-accent': '#06b6d4' },
  pink:   { '--ann-bg-start': 'rgba(236,72,153,0.18)', '--ann-bg-mid': 'rgba(255,120,180,0.10)', '--ann-bg-end': 'rgba(236,72,153,0.18)', '--ann-border': 'rgba(236,72,153,0.45)', '--ann-border-light': 'rgba(236,72,153,0.20)', '--ann-shadow': 'rgba(236,72,153,0.12)', '--ann-tag': 'rgba(236,72,153,0.85)', '--ann-accent': '#ec4899' },
  yellow: { '--ann-bg-start': 'rgba(234,179,8,0.18)', '--ann-bg-mid': 'rgba(250,204,21,0.10)', '--ann-bg-end': 'rgba(234,179,8,0.18)', '--ann-border': 'rgba(234,179,8,0.45)', '--ann-border-light': 'rgba(234,179,8,0.20)', '--ann-shadow': 'rgba(234,179,8,0.12)', '--ann-tag': 'rgba(234,179,8,0.85)', '--ann-accent': '#eab308' },
};

export default function AnnouncementBanner({ message, color = 'orange', icon = 'fa-fire', label = 'Annonce', dismissible = true, link = '', linkText = 'En savoir plus', onDismiss }) {
  if (!message) return null;
  const vars = COLOR_PRESETS[color] || COLOR_PRESETS.orange;
  return (
    <div className="announcement-banner" style={vars}>
      {label && <span className="announcement-tag">{label}</span>}
      <i className={`fa-solid ${icon} announcement-icon--pulse`}></i>
      <span className="announcement-text">{message}</span>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="announcement-link">
          {linkText} →
        </a>
      )}
      {dismissible !== false && (
        <button className="announcement-close" onClick={onDismiss} aria-label="Fermer">✕</button>
      )}
    </div>
  );
}
