import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Politique de Confidentialité</h1>
        <span className="legal-date">Dernière mise à jour : mars 2026</span>

        <h2>1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement des données personnelles collectées via ce site est <strong>404 Tweaks</strong>, entreprise individuelle française.
          <br />Contact : <a href="mailto:404tweakscontact@gmail.com">404tweakscontact@gmail.com</a>
        </p>

        <h2>2. Données collectées</h2>
        <p>Dans le cadre de l'utilisation de nos services, nous collectons les données suivantes :</p>
        <ul>
          <li><strong>Adresse e-mail</strong> — nécessaire pour la création du compte et les communications relatives à votre licence.</li>
          <li><strong>HWID (Hardware ID)</strong> — identifiant matériel de votre machine, utilisé pour lier la licence à votre appareil.</li>
          <li><strong>Adresse IP</strong> — collectée lors des connexions pour la sécurité et la prévention de la fraude.</li>
          <li><strong>Données de paiement</strong> — nous n'avons pas accès à vos données bancaires. Tous les paiements sont traités directement par <strong>Stripe</strong>, prestataire certifié PCI-DSS. Seul le statut de la transaction nous est transmis.</li>
        </ul>

        <h2>3. Bases légales du traitement</h2>
        <ul>
          <li><strong>Exécution du contrat</strong> : traitement de votre commande, gestion de votre licence et accès au logiciel.</li>
          <li><strong>Intérêt légitime</strong> : sécurité du service, prévention de la fraude et de l'abus de licence.</li>
          <li><strong>Consentement</strong> : envoi d'e-mails de communication non-essentiels (le cas échéant).</li>
        </ul>

        <h2>4. Durée de conservation</h2>
        <p>
          Vos données sont conservées pendant la durée de votre licence active, augmentée d'une période de <strong>12 mois</strong> après expiration, afin de permettre le traitement d'éventuels litiges ou renouvellements.
          <br />À l'issue de cette période, vos données sont supprimées ou anonymisées.
        </p>

        <h2>5. Partage des données</h2>
        <p>Nous ne vendons ni ne louons vos données personnelles à des tiers. Elles peuvent être partagées uniquement avec :</p>
        <ul>
          <li><strong>Stripe</strong> — traitement des paiements (politique disponible sur stripe.com).</li>
          <li><strong>Fournisseur d'hébergement</strong> — serveur VPS européen, dans le cadre de la fourniture du service.</li>
        </ul>

        <h2>6. Vos droits (RGPD)</h2>
        <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
        <ul>
          <li><strong>Droit d'accès</strong> : obtenir une copie de vos données personnelles.</li>
          <li><strong>Droit de rectification</strong> : corriger des données inexactes.</li>
          <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données (sous conditions légales).</li>
          <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré et lisible.</li>
          <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements basés sur l'intérêt légitime.</li>
        </ul>
        <p>
          Pour exercer ces droits, contactez-nous à : <a href="mailto:404tweakscontact@gmail.com">404tweakscontact@gmail.com</a>.
          Nous nous engageons à répondre dans un délai de 30 jours.
        </p>

        <h2>7. Cookies</h2>
        <p>
          Ce site utilise un <strong>cookie de session technique</strong> (<code>ftn_sid</code>) strictement nécessaire au fonctionnement du service. Il génère un identifiant anonyme de session utilisé uniquement pour les statistiques internes agrégées (aucun tracking tiers, aucune publicité).
          <br />Aucun cookie de tracking, de publicité ou de réseaux sociaux n'est utilisé.
        </p>

        <h2>8. Sécurité</h2>
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte ou divulgation (chiffrement HTTPS, hachage des mots de passe, accès restreint aux données).
        </p>

        <h2>9. Contact et réclamations</h2>
        <p>
          Pour toute question relative à cette politique ou pour exercer vos droits : <a href="mailto:404tweakscontact@gmail.com">404tweakscontact@gmail.com</a>.
          <br />Vous avez également le droit d'introduire une réclamation auprès de la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) sur <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.
        </p>
      </div>
    </div>
  );
}
