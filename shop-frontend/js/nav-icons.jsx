/* ====================== 404 — navbar icon sets ====================== */
(function () {
  const discord = (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M20.3 4.5A19 19 0 0 0 15.6 3l-.3.6a14 14 0 0 1 4 2 16 16 0 0 0-13.6 0 14 14 0 0 1 4-2L9.4 3a19 19 0 0 0-4.7 1.5C1.9 8.6 1.2 12.6 1.5 16.6a19 19 0 0 0 5.8 3l.8-1.3a12 12 0 0 1-1.8-.9l.4-.3a13 13 0 0 0 11 0l.4.3a12 12 0 0 1-1.8.9l.8 1.3a19 19 0 0 0 5.8-3c.4-4.7-.6-8.6-3.4-12.1zM8.7 14.4c-1 0-1.9-1-1.9-2.1 0-1.2.8-2.1 1.9-2.1s2 1 1.9 2.1c0 1.2-.8 2.1-1.9 2.1zm6.6 0c-1 0-1.9-1-1.9-2.1 0-1.2.8-2.1 1.9-2.1s2 1 1.9 2.1c0 1.2-.8 2.1-1.9 2.1z" />
    </svg>
  );

  const stroke = (d, sw) => (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw || 2} strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
  );

  const fill = (d) => (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>{d}</svg>
  );

  const msgIcon = stroke(<><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 10h8M8 14h5"/></>);

  const NAV_ICON_SETS = {
    default: {
      store: stroke(<><path d="M3 9l1.5-5h15L21 9M3 9v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18M8 13h8"/></>),
      forum: msgIcon,
      status: stroke(<path d="M3 12h4l2 6 4-14 2 8h6"/>),
      reviews: stroke(<path d="M12 2l2.9 6 6.6.6-5 4.3 1.5 6.5L12 16.8 5.9 19.4 7.4 12.9 2.4 8.6 9 8z"/>),
      account: stroke(<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></>),
      discord,
    },
    filled: {
      store: fill(<path d="M21 9V7l-5-4H8L3 7v2l-1 11h20L21 9zm-9 9a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>),
      forum: fill(<path d="M21 11.5a4.5 4.5 0 0 1-4.5 4.5H9l-5 3V7.5A4.5 4.5 0 0 1 8.5 3H17a4.5 4.5 0 0 1 4.5 4.5z"/>),
      status: fill(<path d="M3 13h2l2-7 4 14 3-9 2 4h8l-3-8H3z"/>),
      reviews: fill(<path d="M12 2l2.4 5.5L20 8.3l-4.2 3.7 1.2 5.5L12 14.8 6.9 17.5 8.1 12 3.9 8.3l5.6-.8L12 2z"/>),
      account: fill(<path d="M12 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm-7 18a7 7 0 0 1 14 0H5z"/>),
      discord,
    },
    gaming: {
      store: stroke(<><path d="M6 11h4v4H6zM14 11h4v4h-4zM2 9a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/></>),
      forum: msgIcon,
      status: stroke(<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></>),
      reviews: stroke(<><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3"/></>),
      account: stroke(<><circle cx="12" cy="12" r="10"/><path d="M16 11a4 4 0 1 0-8 0"/><path d="M3 20a9 9 0 0 1 18 0"/></>),
      discord,
    },
    cheat: {
      store: stroke(<><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></>),
      forum: msgIcon,
      status: stroke(<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/>),
      reviews: stroke(<><path d="M12 2l3 6 6.5.9-4.7 4.3 1.1 6.4L12 16.9 6.1 19.6l1.1-6.4L2.5 8.9 9 8z"/><circle cx="12" cy="12" r="2"/></>),
      account: stroke(<><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>),
      discord,
    },
    minimal: {
      store: stroke(<><path d="M4 10l2-5h12l2 5v9H4z"/><path d="M9 14h6"/></>, 1.5),
      forum: stroke(<><path d="M21 14V7a4 4 0 0 0-4-4H7l-4 3v8a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4z"/></>, 1.5),
      status: stroke(<path d="M4 14l3-8 4 12 3-6 3 6 3-10"/>, 1.5),
      reviews: stroke(<path d="M12 3l2 5 5 .5-3.8 3.2 1.2 5.3L12 14l-4.4 2.5 1.2-5.3L5 8.5 10 8z"/>, 1.5),
      account: stroke(<><circle cx="12" cy="9" r="3"/><path d="M5 20c0-4 3.5-6 7-6s7 2 7 6"/></>, 1.5),
      discord,
    },
    bold: {
      store: stroke(<><path d="M3 10l2-6h14l2 6v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 14h6"/></>, 2.5),
      forum: stroke(<><path d="M21 14V7a4 4 0 0 0-4-4H7l-4 3v8a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4z"/><path d="M8 10h8"/></>, 2.5),
      status: stroke(<path d="M3 13h3l2-7 4 14 3-8 2 5h6"/>, 2.5),
      reviews: stroke(<path d="M12 2l3.2 6.5 7.1 1-5.1 4.7 1.3 7.2L12 17.5 5.5 21.4l1.3-7.2L1.7 9.5l7.1-1L12 2z"/>, 2.5),
      account: stroke(<><circle cx="12" cy="8" r="4.5"/><path d="M3 21c0-5 4-7 9-7s9 2 9 7"/></>, 2.5),
      discord,
    },
  };

  window.getNavIcons = function (set) {
    return NAV_ICON_SETS[set] || NAV_ICON_SETS.default;
  };
  window.NAV_ICON_SET_LABELS = {
    fr: { default: "Classique", filled: "Plein", gaming: "Gaming", cheat: "Cheat", minimal: "Fin", bold: "Épais" },
    en: { default: "Classic", filled: "Filled", gaming: "Gaming", cheat: "Cheat", minimal: "Thin", bold: "Bold" },
  };
})();
