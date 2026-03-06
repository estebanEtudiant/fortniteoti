import React from 'react';
import { useTranslation } from '../lib/i18n.jsx';

export default function LegalPage() {
  const { lang } = useTranslation();
  const fr = lang === 'fr';

  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>{fr ? 'Mentions Legales' : 'Legal Notice'}</h1>
        <span className="legal-date">{fr ? 'Derniere mise a jour : mars 2026' : 'Last updated: March 2026'}</span>

        <h2>{fr ? '1. Editeur du site' : '1. Website publisher'}</h2>
        <p>
          {fr
            ? 'Le site 404tweaks.tech est edite par 404 Tweaks, entreprise individuelle immatriculee en France.'
            : 'The website 404tweaks.tech is operated by 404 Tweaks, a sole proprietorship registered in France.'}
        </p>
        <p>
          {fr ? 'Email de contact :' : 'Contact email:'} <a href="mailto:404tweakscontact@gmail.com">404tweakscontact@gmail.com</a>
        </p>

        <h2>{fr ? '2. Hebergement' : '2. Hosting'}</h2>
        <p>
          {fr
            ? 'Le site et ses services sont heberges sur un serveur VPS situe en Europe, conformement aux exigences RGPD de localisation des donnees.'
            : 'The website and its services are hosted on a VPS server located in Europe, in line with GDPR data localization requirements.'}
        </p>

        <h2>{fr ? '3. Propriete intellectuelle' : '3. Intellectual property'}</h2>
        <p>
          {fr
            ? 'Tous les contenus du site (textes, images, logiciel 404 Tweaks, code source, graphismes, logos) sont la propriete exclusive de 404 Tweaks et proteges par les lois applicables.'
            : 'All content on this website (texts, images, 404 Tweaks software, source code, graphics, logos) is the exclusive property of 404 Tweaks and protected by applicable laws.'}
        </p>
        <p>
          {fr
            ? 'Toute reproduction, modification ou diffusion sans autorisation ecrite prealable est interdite.'
            : 'Any reproduction, modification, or distribution without prior written authorization is prohibited.'}
        </p>

        <h2>{fr ? '4. Licence du logiciel' : '4. Software license'}</h2>
        <p>
          {fr
            ? 'L achat d un abonnement donne une licence personnelle, non exclusive et non transferable pour la duree du plan choisi.'
            : 'Purchasing a subscription grants a personal, non-exclusive, non-transferable license for the selected plan duration.'}
        </p>

        <h2>{fr ? '5. Limitation de responsabilite' : '5. Limitation of liability'}</h2>
        <p>
          {fr
            ? '404 Tweaks ne peut etre tenu responsable des dommages directs ou indirects lies a l usage du logiciel, y compris performances en jeu, sanctions editeur ou interruption de service.'
            : '404 Tweaks cannot be held liable for direct or indirect damages related to software use, including in-game performance, publisher sanctions, or service interruptions.'}
        </p>

        <h2>{fr ? '6. Loi applicable' : '6. Governing law'}</h2>
        <p>
          {fr
            ? 'Les presentes mentions sont soumises au droit francais. En cas de litige, les tribunaux francais sont competents.'
            : 'These legal terms are governed by French law. In case of dispute, French courts have jurisdiction.'}
        </p>

        <h2>{fr ? '7. Contact' : '7. Contact'}</h2>
        <p>
          <a href="mailto:404tweakscontact@gmail.com">404tweakscontact@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
