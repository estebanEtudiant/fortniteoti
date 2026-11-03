/* ====================== 404 — legal / info pages ====================== */

const LEGAL = {
  info: {
    title: { fr: "Informations", en: "Information" },
    subtitle: {
      fr: "Documents légaux, conditions d'utilisation et informations sur nos services.",
      en: "Legal documents, terms of use and information about our services.",
    },
    cards: [
      { id: "about", title: { fr: "À propos de 404", en: "About 404" }, desc: { fr: "Qui nous sommes, notre mission et comment fonctionne la boutique.", en: "Who we are, our mission and how the store works." } },
      { id: "terms", title: { fr: "Conditions d'utilisation", en: "Terms of Service" }, desc: { fr: "Règles d'utilisation du site, du loader et des logiciels.", en: "Rules for using the website, loader and software." } },
      { id: "terms-sale", title: { fr: "Conditions de vente", en: "Terms of Sale" }, desc: { fr: "Achats, licences, livraison des clés et obligations.", en: "Purchases, licenses, key delivery and obligations." } },
      { id: "refund", title: { fr: "Politique de remboursement", en: "Refund Policy" }, desc: { fr: "Conditions de remboursement pour les produits numériques.", en: "Refund conditions for digital products." } },
    ],
    contact: {
      fr: "Pour toute question : support@404tweaks.tech · Discord officiel (lien dans le header).",
      en: "For any question: support@404tweaks.tech · Official Discord (link in the header).",
    },
  },
  about: {
    title: { fr: "À propos de 404", en: "About 404" },
    updated: { fr: "Dernière mise à jour : 23 juin 2026", en: "Last updated: June 23, 2026" },
    sections: [
      { h: { fr: "Notre mission", en: "Our mission" }, p: { fr: "404 (404 Tweaks) développe et maintient des logiciels premium pour les jeux compétitifs et survival. Notre objectif : fournir des cheats stables, mis à jour rapidement après chaque patch, avec un loader sécurisé et un support réactif.", en: "404 (404 Tweaks) develops and maintains premium software for competitive and survival games. Our goal: deliver stable cheats, fast updates after every patch, a secure loader and responsive support." } },
      { h: { fr: "Ce que nous proposons", en: "What we offer" }, ul: { fr: ["Licences par jeu (3 jours, 1 mois, à vie)", "Loader NG Loader pour injection sécurisée", "Modules : aimbot, ESP, radar, no recoil, etc.", "Mises à jour anti-détection et correctifs", "Support Discord 24/7"], en: ["Per-game licenses (3 days, 1 month, lifetime)", "NG Loader for secure injection", "Modules: aimbot, ESP, radar, no recoil, etc.", "Anti-detection updates and fixes", "24/7 Discord support"] } },
      { h: { fr: "Indépendance", en: "Independence" }, p: { fr: "404 est un service indépendant. Nous ne sommes ni approuvés, ni affiliés, ni associés à Epic Games, EA, Facepunch, Bohemia Interactive, Embark Studios ou tout autre éditeur. Toutes les marques et logos appartiennent à leurs propriétaires respectifs.", en: "404 is an independent service. We are not approved, affiliated with or associated with Epic Games, EA, Facepunch, Bohemia Interactive, Embark Studios or any other publisher. All trademarks and logos belong to their respective owners." } },
      { h: { fr: "Depuis 2022", en: "Since 2022" }, p: { fr: "Fondé en 2022, 404 accompagne ses joueurs avec des produits testés en conditions réelles. Stay hidden. Stay 404.", en: "Founded in 2022, 404 supports its players with products tested in real conditions. Stay hidden. Stay 404." } },
    ],
  },
  terms: {
    title: { fr: "Conditions d'utilisation", en: "Terms of Service" },
    updated: { fr: "Dernière mise à jour : 23 juin 2026", en: "Last updated: June 23, 2026" },
    sections: [
      { h: { fr: "1. Acceptation", en: "1. Acceptance" }, p: { fr: "En accédant à shop.404tweaks.tech, au loader ou à nos logiciels, tu acceptes ces conditions. Si tu n'acceptes pas, n'utilise pas nos services.", en: "By accessing shop.404tweaks.tech, the loader or our software, you accept these terms. If you do not agree, do not use our services." } },
      { h: { fr: "2. Éligibilité", en: "2. Eligibility" }, p: { fr: "Tu dois avoir au moins 18 ans (ou l'âge légal dans ton pays) pour utiliser nos services. Tu es responsable du respect des lois locales concernant l'utilisation de logiciels tiers dans les jeux vidéo.", en: "You must be at least 18 years old (or the legal age in your country) to use our services. You are responsible for complying with local laws regarding third-party software in video games." } },
      { h: { fr: "3. Compte utilisateur", en: "3. User account" }, ul: { fr: ["Une adresse e-mail valide est requise pour l'inscription", "Tu es responsable de la confidentialité de ton mot de passe", "Un compte par personne ; le partage de compte peut entraîner une suspension", "La vérification e-mail est obligatoire avant tout achat"], en: ["A valid email address is required to register", "You are responsible for keeping your password confidential", "One account per person; account sharing may result in suspension", "Email verification is required before any purchase"] } },
      { h: { fr: "4. Utilisation du logiciel", en: "4. Software use" }, ul: { fr: ["Usage personnel et non commercial uniquement", "Interdiction de reverse-engineering, redistribution ou revente du loader/cheat", "Interdiction de partager ta clé de licence ou ton accès HWID", "Tu utilises le logiciel à tes propres risques (bannissement possible par les éditeurs)", "404 ne garantit pas un fonctionnement indétectable à 100 % en permanence"], en: ["Personal, non-commercial use only", "Reverse engineering, redistribution or resale of the loader/cheat is prohibited", "Sharing your license key or HWID access is prohibited", "You use the software at your own risk (publisher bans are possible)", "404 does not guarantee 100% undetected operation at all times"] } },
      { h: { fr: "5. HWID & sécurité", en: "5. HWID & security" }, p: { fr: "Chaque licence est liée à un identifiant matériel (HWID). Les réinitialisations HWID sont limitées et soumises à validation support. Toute tentative de contournement (spoofers, partage de clés) entraîne la révocation sans remboursement.", en: "Each license is tied to a hardware ID (HWID). HWID resets are limited and subject to support approval. Any attempt to bypass ( spoofers, key sharing) results in revocation without refund." } },
      { h: { fr: "6. Propriété intellectuelle", en: "6. Intellectual property" }, p: { fr: "Le loader, les cheats, le site et tous les contenus associés restent la propriété exclusive de 404. Aucune licence de propriété intellectuelle ne t'est accordée au-delà d'un droit d'utilisation limité pendant la durée de ta licence.", en: "The loader, cheats, website and all related content remain the exclusive property of 404. No intellectual property license is granted beyond a limited right of use for the duration of your license." } },
      { h: { fr: "7. Suspension & résiliation", en: "7. Suspension & termination" }, p: { fr: "Nous pouvons suspendre ou résilier ton accès en cas de violation de ces conditions, fraude de paiement, chargeback abusif ou comportement nuisible envers le staff ou la communauté.", en: "We may suspend or terminate your access in case of violation of these terms, payment fraud, abusive chargeback or harmful behavior toward staff or the community." } },
      { h: { fr: "8. Limitation de responsabilité", en: "8. Limitation of liability" }, p: { fr: "404 est fourni « en l'état ». Nous ne sommes pas responsables des dommages indirects, pertes de compte de jeu, bans, pertes de données ou interruption de service, dans les limites autorisées par la loi.", en: "404 is provided « as is ». We are not liable for indirect damages, game account losses, bans, data loss or service interruption, to the extent permitted by law." } },
      { h: { fr: "9. Modifications", en: "9. Changes" }, p: { fr: "Nous pouvons modifier ces conditions à tout moment. La date de mise à jour en tête de page fait foi. L'utilisation continue après modification vaut acceptation.", en: "We may modify these terms at any time. The update date at the top of the page applies. Continued use after changes constitutes acceptance." } },
      { h: { fr: "10. Contact", en: "10. Contact" }, p: { fr: "support@404tweaks.tech", en: "support@404tweaks.tech" } },
    ],
  },
  "terms-sale": {
    title: { fr: "Conditions de vente", en: "Terms of Sale" },
    updated: { fr: "Dernière mise à jour : 23 juin 2026", en: "Last updated: June 23, 2026" },
    sections: [
      { h: { fr: "1. Produits", en: "1. Products" }, p: { fr: "404 vend des licences d'accès numériques à des logiciels de triche pour des jeux spécifiques. Chaque licence donne accès au loader et aux modules du jeu choisi pour la durée du plan sélectionné (3 jours, 1 mois ou à vie).", en: "404 sells digital access licenses to cheat software for specific games. Each license grants access to the loader and modules for the chosen game for the selected plan duration (3 days, 1 month or lifetime)." } },
      { h: { fr: "2. Prix & paiement", en: "2. Pricing & payment" }, ul: { fr: ["Les prix sont affichés en euros (€) TTC sur la boutique", "Paiement par carte via Stripe ou crypto via NOWPayments (si activé)", "Remises volume : −5 % (2+ articles), −10 % (3–4), −15 % (5+)", "Le paiement doit être confirmé avant livraison de la clé"], en: ["Prices are shown in euros (€) incl. tax on the store", "Card payment via Stripe or crypto via NOWPayments (if enabled)", "Volume discounts: −5% (2+ items), −10% (3–4), −15% (5+)", "Payment must be confirmed before key delivery"] } },
      { h: { fr: "3. Commande & livraison", en: "3. Order & delivery" }, ul: { fr: ["Crée un compte et vérifie ton e-mail avant d'acheter", "Après paiement réussi, la clé de licence est générée automatiquement", "La clé apparaît sur la page de confirmation et dans ton profil (#profile)", "Un e-mail de confirmation est envoyé (si le service mail est opérationnel)", "Délai habituel : immédiat après confirmation du paiement"], en: ["Create an account and verify your email before purchasing", "After successful payment, the license key is generated automatically", "The key appears on the confirmation page and in your profile (#profile)", "A confirmation email is sent (if mail service is operational)", "Typical delivery: immediate after payment confirmation"] } },
      { h: { fr: "4. Activation", en: "4. Activation" }, p: { fr: "La clé s'active au premier lancement du loader sur la machine concernée (liaison HWID). Une licence = un HWID actif, sauf réinitialisation approuvée par le support.", en: "The key activates on first launch of the loader on the relevant machine (HWID binding). One license = one active HWID, except support-approved reset." } },
      { h: { fr: "5. Durée & renouvellement", en: "5. Duration & renewal" }, ul: { fr: ["3 jours : accès pendant 72 h à partir de l'activation ou de l'achat (selon le produit)", "1 mois : 30 jours calendaires", "À vie : accès tant que le jeu est maintenu par 404", "Les abonnements ne se renouvellent pas automatiquement (achat unique par période)"], en: ["3 days: access for 72 h from activation or purchase (per product)", "1 month: 30 calendar days", "Lifetime: access as long as the game is maintained by 404", "Subscriptions do not auto-renew (one-time purchase per period)"] } },
      { h: { fr: "6. Codes promo", en: "6. Promo codes" }, p: { fr: "Les codes promotionnels sont soumis à leurs propres conditions (validité, jeux éligibles, usage unique). 404 se réserve le droit de refuser ou retirer un code en cas d'abus.", en: "Promotional codes are subject to their own conditions (validity, eligible games, single use). 404 reserves the right to refuse or revoke a code in case of abuse." } },
      { h: { fr: "7. Chargebacks & fraude", en: "7. Chargebacks & fraud" }, p: { fr: "Tout chargeback ou contestation de paiement frauduleuse entraîne la révocation immédiate de toutes les licences associées au compte et un bannissement permanent.", en: "Any chargeback or fraudulent payment dispute results in immediate revocation of all licenses linked to the account and a permanent ban." } },
      { h: { fr: "8. Droit de rétractation (UE)", en: "8. Right of withdrawal (EU)" }, p: { fr: "En tant que produit numérique livré immédiatement après achat et dont l'exécution a commencé avec ton accord, le droit de rétractation de 14 jours ne s'applique pas conformément à l'article L221-28 du Code de la consommation (contenu numérique non fourni sur support). Voir la Politique de remboursement.", en: "As a digital product delivered immediately after purchase and whose performance has begun with your consent, the 14-day withdrawal right does not apply under applicable EU consumer law for digital content not supplied on a tangible medium. See the Refund Policy." } },
      { h: { fr: "9. Contact ventes", en: "9. Sales contact" }, p: { fr: "support@404tweaks.tech — indique ton e-mail de commande et l'ID de transaction Stripe si applicable.", en: "support@404tweaks.tech — include your order email and Stripe transaction ID if applicable." } },
    ],
  },
  refund: {
    title: { fr: "Politique de remboursement", en: "Refund Policy" },
    updated: { fr: "Dernière mise à jour : 8 juillet 2026", en: "Last updated: July 8, 2026" },
    sections: [
      { h: { fr: "Principe général", en: "General principle" }, p: { fr: "Les licences 404 sont des produits numériques à livraison instantanée. En raison de la nature du produit (clé activable immédiatement, contenu téléchargeable), les remboursements sont exceptionnels et évalués au cas par cas.", en: "404 licenses are digital products with instant delivery. Due to the nature of the product (immediately activatable key, downloadable content), refunds are exceptional and evaluated case by case." } },
      { h: { fr: "Licence activée = aucun remboursement", en: "Activated license = no refund" }, p: { fr: "Dès qu'une licence a été activée (liaison HWID effectuée via le loader), aucun remboursement n'est possible, quel que soit le motif. L'activation est considérée comme l'utilisation définitive du produit numérique. Si tu souhaites demander un remboursement, ne lance pas le loader et n'active pas ta clé.", en: "Once a license has been activated (HWID binding via the loader), no refund is possible, regardless of the reason. Activation is considered definitive use of the digital product. If you wish to request a refund, do not launch the loader and do not activate your key." } },
      { h: { fr: "Cas non remboursables", en: "Non-refundable cases" }, ul: { fr: ["Changement d'avis après achat ou activation de la clé", "Ban ou sanction sur ton compte de jeu (responsabilité de l'utilisateur)", "Incompatibilité matérielle non signalée avant achat sans ticket support préalable", "Partage de compte, revente ou violation des conditions", "Demande après expiration de la période de licence", "Chargeback : la licence est révoquée et le compte banni"], en: ["Change of mind after purchase or key activation", "Ban or sanction on your game account (user responsibility)", "Hardware incompatibility not reported before purchase without prior support ticket", "Account sharing, resale or terms violation", "Request after license period expiration", "Chargeback: license revoked and account banned"] } },
      { h: { fr: "Cas où un remboursement peut être envisagé", en: "Cases where a refund may be considered" }, ul: { fr: ["Double facturation ou erreur de paiement avérée", "Clé non livrée après paiement confirmé (ticket sous 48 h)", "Produit indisponible de façon permanente et non remplacé par 404", "Bug bloquant non résolu sous 7 jours ouvrés après signalement (à la discrétion du support)"], en: ["Double billing or proven payment error", "Key not delivered after confirmed payment (ticket within 48 h)", "Product permanently unavailable and not replaced by 404", "Blocking bug unresolved within 7 business days after report (at support discretion)"] } },
      { h: { fr: "Procédure", en: "Procedure" }, ol: { fr: ["Contacte support@404tweaks.tech avec l'e-mail du compte, la date d'achat et la preuve de paiement", "Explique le motif de façon précise", "N'active pas la clé si tu demandes un remboursement pour non-livraison", "Délai de réponse : 1 à 5 jours ouvrés"], en: ["Contact support@404tweaks.tech with account email, purchase date and proof of payment", "Explain the reason clearly", "Do not activate the key if requesting a refund for non-delivery", "Response time: 1 to 5 business days"] } },
      { h: { fr: "Modalités", en: "Terms" }, p: { fr: "Les remboursements approuvés sont effectués via le mode de paiement d'origine (Stripe / crypto selon le cas). Aucun remboursement partiel pour une période de licence déjà entamée, sauf décision exceptionnelle du support.", en: "Approved refunds are processed via the original payment method (Stripe / crypto as applicable). No partial refund for a license period already started, except at support's exceptional discretion." } },
      { h: { fr: "Contact", en: "Contact" }, p: { fr: "support@404tweaks.tech", en: "support@404tweaks.tech" } },
    ],
  },
};

function LegalSection({ sec, lang }) {
  return (
    <section className="legal-sec">
      {sec.h && <h2>{sec.h[lang] || sec.h.en}</h2>}
      {sec.p && <p>{sec.p[lang] || sec.p.en}</p>}
      {sec.ul && (
        <ul>{(sec.ul[lang] || sec.ul.en).map((item, i) => <li key={i}>{item}</li>)}</ul>
      )}
      {sec.ol && (
        <ol>{(sec.ol[lang] || sec.ol.en).map((item, i) => <li key={i}>{item}</li>)}</ol>
      )}
    </section>
  );
}

function InfoHubPage({ lang, go }) {
  const doc = LEGAL.info;
  return (
    <div className="page-enter">
      <Crumbs trail={[{ label: t("home", lang), route: "home" }, doc.title[lang]]} lang={lang} go={go} />
      <div className="wrap section legal-wrap">
        <div className="legal-head">
          <h1>{doc.title[lang]}</h1>
          <p className="legal-sub">{doc.subtitle[lang]}</p>
        </div>
        <div className="legal-cards">
          {doc.cards.map((c) => (
            <article key={c.id} className="legal-card panel" onClick={() => go(c.id)} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && go(c.id)}>
              <h2>{c.title[lang]}</h2>
              <p>{c.desc[lang]}</p>
              <span className="legal-card-link">{lang === "fr" ? "Lire →" : "Read →"}</span>
            </article>
          ))}
        </div>
        <div className="legal-contact panel">
          <Icon.headset style={{ width: 22, height: 22, color: "var(--acc)" }} />
          <p>{doc.contact[lang]}</p>
        </div>
      </div>
    </div>
  );
}

function LegalDocPage({ id, lang, go }) {
  const doc = LEGAL[id];
  if (!doc) return null;
  const hub = { label: LEGAL.info.title[lang], route: "info" };
  return (
    <div className="page-enter">
      <Crumbs trail={[{ label: t("home", lang), route: "home" }, hub, doc.title[lang]]} lang={lang} go={go} />
      <div className="wrap section legal-wrap">
        <div className="legal-head">
          <h1>{doc.title[lang]}</h1>
          <p className="legal-updated">{doc.updated[lang]}</p>
        </div>
        <div className="legal-prose panel">
          {doc.sections.map((sec, i) => <LegalSection key={i} sec={sec} lang={lang} />)}
        </div>
        <div className="legal-nav">
          <Btn kind="ghost" onClick={() => go("info")}>{lang === "fr" ? "← Toutes les informations" : "← All information"}</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { InfoHubPage, LegalDocPage, LEGAL });
