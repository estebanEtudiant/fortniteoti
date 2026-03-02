import { useEffect } from 'react';

export function useScrollAnimations(route) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0, rootMargin: '0px 0px -40px 0px' }
    );

    const attach = () => {
      document.querySelectorAll('.animate-on-scroll:not(.visible)').forEach(el => observer.observe(el));
    };

    const t1 = setTimeout(attach, 60);
    const t2 = setTimeout(attach, 500);
    const t3 = setTimeout(attach, 1400);
    const t4 = setTimeout(() => {
      document.querySelectorAll('.animate-on-scroll:not(.visible)').forEach(el => el.classList.add('visible'));
    }, 2500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); observer.disconnect(); };
  }, [route]);
}
