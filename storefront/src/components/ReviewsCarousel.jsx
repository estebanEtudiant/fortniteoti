import React, { useRef, useEffect } from 'react';

function StarRating({ count }) {
  const n = Math.max(1, Math.min(5, count || 5));
  return (
    <div className="stars">
      {Array.from({ length: n }).map((_, i) => <span key={i}>&#9733;</span>)}
      {Array.from({ length: 5 - n }).map((_, i) => <span key={`e${i}`} style={{ opacity: 0.3 }}>&#9733;</span>)}
    </div>
  );
}

export default function ReviewsCarousel({ reviews }) {
  const trackRef = useRef(null);
  const pausedRef = useRef(false);
  const posRef = useRef(0);
  const rafRef = useRef(null);

  const doubled = [...reviews, ...reviews];

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const SPEED = 0.4;

    const step = () => {
      if (!pausedRef.current) {
        posRef.current += SPEED;
        const halfWidth = track.scrollWidth / 2;
        if (posRef.current >= halfWidth) posRef.current -= halfWidth;
        track.style.transform = `translateX(-${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [reviews]);

  return (
    <div
      className="reviews-carousel-wrapper"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div className="reviews-carousel-track" ref={trackRef}>
        {doubled.map((t, i) => (
          <div className="testimonial-card" key={i}>
            <StarRating count={t.stars} />
            <p className="testimonial-text">"{t.text}"</p>
            <p className="testimonial-author">{t.username}</p>
            <p className="testimonial-role">{t.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
