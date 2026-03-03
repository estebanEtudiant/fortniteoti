import React, { useState, useEffect } from 'react';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1');

function ServiceCard({ name, detail, status, latency }) {
  const isOk = status === 'ok';
  const isError = status === 'error';
  const cls = isOk ? 'status-indicator--ok' : isError ? 'status-indicator--error' : 'status-indicator--unknown';
  const icon = isOk ? 'fa-circle-check' : isError ? 'fa-circle-xmark' : 'fa-circle-question';
  const label = isOk ? 'Opérationnel' : isError ? 'Incident' : 'Inconnu';

  return (
    <div className="status-service-card">
      <div>
        <div className="status-service-name">{name}</div>
        {detail && <div className="status-service-detail">{detail}</div>}
      </div>
      <div className={`status-indicator ${cls}`}>
        {latency != null && <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{latency} ms</span>}
        <i className={`fa-solid ${icon}`}></i>
        <span>{label}</span>
      </div>
    </div>
  );
}

export default function StatusPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);

  const fetchStatus = () => {
    setLoading(true);
    fetch(`${BASE_URL}/health/detailed`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLastCheck(new Date());
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const services = data?.services || {};
  const allOk = data && Object.values(services).every(s => s.status === 'ok');
  const hasError = data && Object.values(services).some(s => s.status === 'error');

  const serviceLabels = {
    database: 'Base de données (PostgreSQL)',
    redis: 'Cache Redis',
    stripe: 'Paiements (Stripe)',
  };

  return (
    <div className="status-page">
      <div className="status-container">
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Statut des services</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          État en temps réel de l'infrastructure 404 Tweaks.
        </p>

        {loading && !data && (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem 0' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'block' }}></i>
            Vérification en cours...
          </div>
        )}

        {!loading && !data && (
          <div className="status-global status-global--error">
            <i className="fa-solid fa-circle-xmark"></i>
            Impossible de contacter le serveur
          </div>
        )}

        {data && (
          <>
            <div className={`status-global ${allOk ? 'status-global--ok' : 'status-global--error'}`}>
              <i className={`fa-solid ${allOk ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
              {allOk ? 'Tous les services sont opérationnels' : 'Incident en cours'}
            </div>

            {Object.entries(services).map(([key, svc]) => (
              <ServiceCard
                key={key}
                name={serviceLabels[key] || key}
                detail={svc.message || null}
                status={svc.status}
                latency={svc.latency != null ? svc.latency : null}
              />
            ))}
          </>
        )}

        <p className="status-refresh-info">
          Actualisation automatique toutes les 30 secondes.
          {lastCheck && ` Dernière vérification : ${lastCheck.toLocaleTimeString('fr-FR')}.`}
        </p>
      </div>
    </div>
  );
}
