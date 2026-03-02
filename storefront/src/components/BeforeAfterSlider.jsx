import React, { useState, useRef } from 'react';

export default function BeforeAfterSlider() {
  const [pos, setPos] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const calcPos = (clientX) => {
    const rect = containerRef.current.getBoundingClientRect();
    return Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
  };

  const onMouseDown  = (e) => { dragging.current = true; e.preventDefault(); };
  const onMouseMove  = (e) => { if (dragging.current) setPos(calcPos(e.clientX)); };
  const onMouseUp    = ()  => { dragging.current = false; };
  const onTouchStart = (e) => { dragging.current = true; e.preventDefault(); };
  const onTouchMove  = (e) => { if (dragging.current) setPos(calcPos(e.touches[0].clientX)); };
  const onTouchEnd   = ()  => { dragging.current = false; };

  return (
    <div
      className="ba-slider"
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* APRÈS — full-width background */}
      <div className="ba-panel ba-after">
        <div className="ba-hud">
          <div className="ba-label ba-label--after">APRÈS</div>
          <div className="ba-stat"><span className="ba-val ba-val--good">240</span><span className="ba-unit"> FPS</span></div>
          <div className="ba-stat"><span className="ba-val ba-val--good">12</span><span className="ba-unit"> ms Input</span></div>
          <div className="ba-badge ba-badge--good">✓ Zéro stutter</div>
        </div>
      </div>
      {/* AVANT — clipped to left side */}
      <div className="ba-panel ba-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <div className="ba-hud">
          <div className="ba-label ba-label--before">AVANT</div>
          <div className="ba-stat"><span className="ba-val ba-val--bad">144</span><span className="ba-unit"> FPS</span></div>
          <div className="ba-stat"><span className="ba-val ba-val--bad">35</span><span className="ba-unit"> ms Input</span></div>
          <div className="ba-badge ba-badge--bad">⚠ Stutter fréquent</div>
        </div>
      </div>
      {/* Divider handle */}
      <div
        className="ba-divider"
        style={{ left: `${pos}%` }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div className="ba-handle">◀ ▶</div>
      </div>
    </div>
  );
}
