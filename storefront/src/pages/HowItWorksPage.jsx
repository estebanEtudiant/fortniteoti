import React from 'react';
import { navigate } from '../lib/router.js';
import { useTranslation } from '../lib/i18n.jsx';

export default function HowItWorksPage() {
  const { t } = useTranslation();

  const steps = [
    {
      icon: 'fa-cart-shopping',
      color: '#00D4FF',
      step: '01',
      title: t('how.step1.title'),
      desc: t('how.step1.desc'),
      details: [
        t('how.step1.detail1'),
        t('how.step1.detail2'),
        t('how.step1.detail3')
      ],
    },
    {
      icon: 'fa-download',
      color: '#8F66FF',
      step: '02',
      title: t('how.step2.title'),
      desc: t('how.step2.desc'),
      details: [
        t('how.step2.detail1'),
        t('how.step2.detail2'),
        t('how.step2.detail3')
      ],
    },
    {
      icon: 'fa-rocket',
      color: '#33C76B',
      step: '03',
      title: t('how.step3.title'),
      desc: t('how.step3.desc'),
      details: [
        t('how.step3.detail1'),
        t('how.step3.detail2'),
        t('how.step3.detail3')
      ],
    },
  ];

  return (
      <div style={{ minHeight: '80vh', padding: '7rem 1rem 6rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div
                className="hero-badge"
                style={{
                  marginBottom: '1.25rem',
                  background: 'rgba(222,255,154,0.12)',
                  border: '1px solid rgba(222,255,154,0.5)'
                }}
            >
              {t('how.badge')}
            </div>

            <h1 className="section-title" style={{ marginBottom: '1rem' }}>
              {t('how.title')} <span className="highlight">{t('how.titleHighlight')}</span> ?
            </h1>

            <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '1.1rem',
                  maxWidth: 500,
                  margin: '0 auto'
                }}
            >
              {t('how.subtitle')}
            </p>
          </div>

          {/* Steps */}
          <div className="how-steps">
            {steps.map((s, i) => (
                <div
                    className="how-step animate-on-scroll"
                    key={i}
                    style={{ animationDelay: `${i * 0.15}s` }}
                >
                  {i < steps.length - 1 && (
                      <div className="how-connector" aria-hidden="true" />
                  )}

                  <div className="how-step-icon-wrap" style={{ '--step-color': s.color }}>
                    <span className="how-step-num">{s.step}</span>
                    <div className="how-step-icon">
                      <i className={`fa-solid ${s.icon}`} style={{ color: s.color }} />
                    </div>
                  </div>

                  <div className="how-step-content">
                    <h3 className="how-step-title" style={{ color: s.color }}>
                      {s.title}
                    </h3>

                    <p className="how-step-desc">{s.desc}</p>

                    <ul className="how-step-details">
                      {s.details.map((d, j) => (
                          <li key={j}>
                            <i
                                className="fa-solid fa-check"
                                style={{ color: s.color, marginRight: 8 }}
                            />
                            {d}
                          </li>
                      ))}
                    </ul>
                  </div>
                </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <div
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 16,
                  padding: '2.5rem 2rem',
                  display: 'inline-block',
                  maxWidth: 480
                }}
            >
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1.4rem' }}>
                {t('how.cta.title')} <span className="highlight">{t('how.cta.titleHighlight')}</span> ?
              </h3>

              <p
                  style={{
                    color: 'var(--text-secondary)',
                    marginBottom: '1.5rem',
                    lineHeight: 1.7
                  }}
              >
                {t('how.cta.desc')}
              </p>

              <button
                  className="cta-primary"
                  style={{ padding: '0.9rem 2.5rem', fontSize: '1rem' }}
                  onClick={() => navigate('/')}
              >
                <i className="fa-solid fa-cart-shopping" style={{ marginRight: 8 }}></i>
                {t('how.cta.button')}
              </button>
            </div>
          </div>

        </div>
      </div>
  );
}