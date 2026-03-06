import React from 'react';
import { useTranslation } from '../lib/i18n.jsx';

export default function PrivacyPage() {
  const { lang } = useTranslation();
  const fr = lang === 'fr';

  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>{fr ? 'Politique de Confidentialite' : 'Privacy Policy'}</h1>
        <span className="legal-date">{fr ? 'Derniere mise a jour : mars 2026' : 'Last updated: March 2026'}</span>

        <h2>{fr ? '1. Responsable du traitement' : '1. Data controller'}</h2>
        <p>
          {fr
            ? 'Le responsable du traitement des donnees personnelles est 404 Tweaks.'
            : 'The data controller for personal data is 404 Tweaks.'}
          <br />
          Contact: <a href="mailto:404tweakscontact@gmail.com">404tweakscontact@gmail.com</a>
        </p>

        <h2>{fr ? '2. Donnees collectees' : '2. Collected data'}</h2>
        <ul>
          <li>{fr ? 'Adresse email' : 'Email address'}</li>
          <li>{fr ? 'HWID (identifiant materiel)' : 'HWID (hardware identifier)'}</li>
          <li>{fr ? 'Adresse IP pour securite et anti-fraude' : 'IP address for security and anti-fraud'}</li>
          <li>{fr ? 'Statut de paiement (Stripe)' : 'Payment status (Stripe)'}</li>
        </ul>

        <h2>{fr ? '3. Finalites et bases legales' : '3. Purposes and legal basis'}</h2>
        <ul>
          <li>{fr ? 'Execution du contrat' : 'Contract performance'}</li>
          <li>{fr ? 'Interet legitime (securite, anti-abus)' : 'Legitimate interest (security, abuse prevention)'}</li>
          <li>{fr ? 'Consentement pour communications non essentielles' : 'Consent for non-essential communications'}</li>
        </ul>

        <h2>{fr ? '4. Duree de conservation' : '4. Retention period'}</h2>
        <p>
          {fr
            ? 'Les donnees sont conservees pendant la duree de la licence active puis jusqu a 12 mois apres expiration.'
            : 'Data is kept for the duration of the active license and up to 12 months after expiration.'}
        </p>

        <h2>{fr ? '5. Partage des donnees' : '5. Data sharing'}</h2>
        <p>
          {fr
            ? 'Les donnees ne sont ni vendues ni louees. Elles peuvent etre partagees avec Stripe et le fournisseur d hebergement pour fournir le service.'
            : 'Data is neither sold nor rented. It may be shared with Stripe and hosting providers to deliver the service.'}
        </p>

        <h2>{fr ? '6. Vos droits' : '6. Your rights'}</h2>
        <p>
          {fr
            ? 'Vous disposez des droits d acces, rectification, effacement, portabilite et opposition, selon le RGPD.'
            : 'You have rights of access, rectification, deletion, portability, and objection under GDPR.'}
        </p>

        <h2>{fr ? '7. Cookies' : '7. Cookies'}</h2>
        <p>
          {fr
            ? 'Seul un cookie de session technique (ftn_sid) est utilise pour le fonctionnement du service.'
            : 'Only a technical session cookie (ftn_sid) is used to operate the service.'}
        </p>

        <h2>{fr ? '8. Securite' : '8. Security'}</h2>
        <p>
          {fr
            ? 'Des mesures techniques et organisationnelles sont appliquees (HTTPS, hashage des mots de passe, acces restreint).'
            : 'Technical and organizational measures are applied (HTTPS, password hashing, restricted access).'}
        </p>

        <h2>{fr ? '9. Contact et reclamations' : '9. Contact and complaints'}</h2>
        <p>
          <a href="mailto:404tweakscontact@gmail.com">404tweakscontact@gmail.com</a>
          <br />
          {fr
            ? 'Vous pouvez aussi deposer une reclamation aupres de la CNIL : www.cnil.fr'
            : 'You can also file a complaint with CNIL: www.cnil.fr'}
        </p>
      </div>
    </div>
  );
}
