import React, { useEffect } from 'react';
import { PokemonNav, PokemonFooter } from './pokemon/Shell.jsx';
import './pokemon.css';

export default function PokemonLegalPage({ customer, onLogout }) {
  useEffect(() => { document.title = 'Mentions légales & CGV — CardRevive'; }, []);

  return (
    <div className="pkm">
      <PokemonNav customer={customer} onLogout={onLogout} />
      <div className="pkm-legal">
        <h1>Mentions légales & Conditions Générales de Vente</h1>

        <div className="pkm-error" style={{ marginBottom: '2rem' }}>
          Contenu à finaliser : les informations d'identification de l'entreprise ci-dessous sont des
          placeholders et doivent être complétées avant mise en ligne publique (obligation légale).
        </div>

        <h2>1. Éditeur du site</h2>
        <p>
          CardRevive est édité par <strong>[Raison sociale / nom de l'entité — à compléter]</strong>,
          [forme juridique — à compléter], immatriculée sous le numéro SIRET <strong>[à compléter]</strong>,
          dont le siège social est situé <strong>[adresse — à compléter]</strong>.<br />
          Directeur de la publication : <strong>[nom — à compléter]</strong>.<br />
          Contact : <a href="mailto:404tweakscontact@gmail.com">404tweakscontact@gmail.com</a>
        </p>

        <h2>2. Objet</h2>
        <p>
          Les présentes conditions régissent la vente de kits de rénovation et de protection de cartes à
          collectionner (« les Produits ») commercialisés sur ce site. Il s'agit de produits physiques, expédiés
          par voie postale — ces conditions sont distinctes de celles applicables aux licences logicielles vendues
          par ailleurs par notre société.
        </p>

        <h2>3. Prix et paiement</h2>
        <p>
          Les prix sont indiqués en euros, toutes taxes comprises. Les frais de livraison sont précisés avant
          validation de la commande. Le paiement s'effectue en ligne par carte bancaire via notre prestataire
          de paiement sécurisé (Stripe). La commande n'est confirmée qu'après réception effective du paiement.
        </p>

        <h2>4. Livraison</h2>
        <p>
          Les commandes sont préparées sous 24 à 48h ouvrées puis remises au transporteur. Un email contenant le
          numéro de suivi est envoyé dès l'expédition. Les délais de livraison indiqués sont donnés à titre
          indicatif et dépendent du transporteur.
        </p>

        <h2>5. Droit de rétractation</h2>
        <p>
          Conformément aux articles L221-18 et suivants du Code de la consommation, tu disposes d'un délai de
          <strong> 14 jours francs</strong> à compter de la réception de ta commande pour exercer ton droit de
          rétractation, sans avoir à justifier de motif ni à payer de pénalité.
        </p>
        <p>Pour exercer ce droit :</p>
        <ul>
          <li>Le produit doit être retourné non descellé et non utilisé, dans son emballage d'origine.</li>
          <li>Contacte-nous à <a href="mailto:404tweakscontact@gmail.com">404tweakscontact@gmail.com</a> en indiquant ton numéro de commande.</li>
          <li>Les frais de retour restent à ta charge, sauf erreur de notre part.</li>
          <li>Le remboursement intervient sous 14 jours après réception et vérification du retour.</li>
        </ul>

        <h2>6. Garantie</h2>
        <p>
          Les Produits bénéficient de la garantie légale de conformité et de la garantie contre les vices cachés,
          conformément aux articles L217-3 et suivants et 1641 et suivants du Code civil.
        </p>

        <h2>7. Responsabilité</h2>
        <p>
          Les kits sont formulés pour un usage sur cartes à collectionner standard. Nous ne pouvons être tenus
          responsables d'une mauvaise utilisation contraire au guide fourni. Le vendeur ne saurait être tenu
          responsable de la valeur marchande des cartes traitées.
        </p>

        <h2>8. Données personnelles</h2>
        <p>
          Les données collectées (identité, adresse de livraison, email) sont utilisées uniquement pour le
          traitement de la commande et son suivi, conformément au RGPD. Elles ne sont pas cédées à des tiers en
          dehors des prestataires nécessaires à l'exécution de la commande (paiement, transporteur). Tu peux
          exercer tes droits d'accès, de rectification et de suppression en écrivant à
          {' '}<a href="mailto:404tweakscontact@gmail.com">404tweakscontact@gmail.com</a>.
        </p>

        <h2>9. Litiges</h2>
        <p>
          En cas de litige, tu peux recourir gratuitement à un médiateur de la consommation. Les présentes
          conditions sont soumises au droit français.
        </p>
      </div>
      <PokemonFooter />
    </div>
  );
}
