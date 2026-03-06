import React, { useRef, useState } from 'react';
import { useTranslation } from '../lib/i18n.jsx';

export default function BeforeAfterSlider() {
  const [pos, setPos] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);
  const { t } = useTranslation();

  const calcPos = (clientX) => {
    const rect = containerRef.current.getBoundingClientRect();
    return Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
  };

  const onMouseDown = (e) => { dragging.current = true; e.preventDefault(); };
  const onMouseMove = (e) => { if (dragging.current) setPos(calcPos(e.clientX)); };
  const onMouseUp = () => { dragging.current = false; };
  const onTouchStart = (e) => { dragging.current = true; e.preventDefault(); };
  const onTouchMove = (e) => { if (dragging.current) setPos(calcPos(e.touches[0].clientX)); };
  const onTouchEnd = () => { dragging.current = false; };

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
      <div className="ba-panel ba-after">
        <div className="ba-hud">
          <div className="ba-label ba-label--after">{t('slider.afterLabel')}</div>
          <div className="ba-stat"><span className="ba-val ba-val--good">240</span><span className="ba-unit"> FPS</span></div>
          <div className="ba-stat"><span className="ba-val ba-val--good">12</span><span className="ba-unit"> ms Input</span></div>
          <div className="ba-badge ba-badge--good">{t('slider.afterBadge')}</div>
        </div>
      </div>

      <div className="ba-panel ba-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <div className="ba-hud">
          <div className="ba-label ba-label--before">{t('slider.beforeLabel')}</div>
          <div className="ba-stat"><span className="ba-val ba-val--bad">144</span><span className="ba-unit"> FPS</span></div>
          <div className="ba-stat"><span className="ba-val ba-val--bad">35</span><span className="ba-unit"> ms Input</span></div>
          <div className="ba-badge ba-badge--bad">{t('slider.beforeBadge')}</div>
        </div>
      </div>

      <div
        className="ba-divider"
        style={{ left: `${pos}%` }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div className="ba-handle">? ?</div>
      </div>
    </div>
  );
}
