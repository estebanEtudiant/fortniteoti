import React, { useState, useEffect, useRef } from 'react';

export function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return inView;
}

export function useCountUp(target, duration, trigger) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let raf;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, trigger]);
  return count;
}

export function CountUpStat({ value }) {
  const m = String(value).match(/^([+\-]?)(\d+)(.*)$/);
  const prefix = m ? m[1] : '';
  const num    = m ? parseInt(m[2], 10) : 0;
  const suffix = m ? m[3] : '';
  const ref = useRef(null);
  const inView = useInView(ref);
  const count  = useCountUp(num, 1500, inView);
  return <span className="stat-number" ref={ref}>{prefix}{count}{suffix}</span>;
}
