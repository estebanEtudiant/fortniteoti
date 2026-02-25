mainte# Politique de Confidentialité — 404 Tweaks Bot

**Dernière mise à jour : 25 février 2026**

---

## 1. Introduction

La présente Politique de Confidentialité décrit comment le bot Discord **404 Tweaks** (ci-après « le Bot ») collecte, utilise, stocke et protège les données des utilisateurs qui interagissent avec lui sur la plateforme Discord.

En utilisant le Bot, vous acceptez les pratiques décrites dans ce document.

---

## 2. Données collectées

### 2.1 Données collectées automatiquement

Lors de votre interaction avec le Bot, les données suivantes peuvent être collectées :

| Donnée | Raison |
|---|---|
| **Identifiant Discord (ID)** | Identifier l'utilisateur de manière unique |
| **Nom d'utilisateur Discord** | Affichage dans les logs et les embeds |
| **Identifiant du serveur (Guild ID)** | Rattacher les données au bon serveur |
| **Identifiant des salons** | Gestion des tickets et du message de statut |
| **Contenu des messages** | Détection de spam et réponses automatiques (non stocké) |
| **Horodatage des actions** | Journaux de modération et d'audit |

### 2.2 Données collectées via commandes

| Commande | Données stockées |
|---|---|
| `/verify` | Discord ID, clé de licence (masquée), plan, date d'expiration |
| `/warn`, `/mute`, `/ban`, `/kick` | Discord ID de l'utilisateur et du modérateur, raison, date |
| `/ticket` | Discord ID, ID du salon, sujet du ticket, date d'ouverture/fermeture |
| `/poll` | Aucune donnée persistante |
| `/generate` | Aucune donnée personnelle (génération de clés uniquement) |

### 2.3 Données NON collectées

Le Bot **ne collecte pas** :
- Le contenu de vos messages en dehors de la détection de spam/invitations (non stocké)
- Votre adresse email
- Votre adresse IP
- Vos informations de paiement (traitées exclusivement par Stripe)
- Vos données hors de Discord

---

## 3. Utilisation des données

Les données collectées sont utilisées exclusivement pour :

- **Vérification de licence** : associer une clé de licence à votre compte Discord et attribuer les rôles correspondants
- **Modération** : enregistrer les infractions pour assurer la sécurité du serveur
- **Support** : gérer les tickets de support et leur historique
- **Rappels automatiques** : vous notifier avant l'expiration de votre licence
- **Statistiques internes** : compter le nombre de membres vérifiés et de tickets ouverts

---

## 4. Stockage et sécurité des données

### 4.1 Localisation

Les données sont stockées :
- **Localement** : dans une base de données SQLite chiffrée, hébergée sur un serveur privé sécurisé (VPS)
- **Backend** : dans une base de données PostgreSQL accessible uniquement en interne

### 4.2 Durée de conservation

| Données | Durée de conservation |
|---|---|
| Vérifications de licence | Jusqu'à l'expiration de la licence ou demande de suppression |
| Infractions (warn, mute, ban) | 1 an maximum, ou demande de suppression |
| Tickets | 90 jours après fermeture |
| Logs d'activité | 30 jours |

### 4.3 Sécurité

- Accès restreint aux données (staff uniquement via commandes protégées)
- Communication chiffrée entre le Bot et le backend (HTTPS + secret partagé)
- Sauvegardes chiffrées quotidiennes
- Aucun partage avec des tiers, sauf obligations légales

---

## 5. Partage des données

Nous ne vendons, ne louons et ne partageons **jamais** vos données personnelles avec des tiers, à l'exception :
- De **Stripe** pour le traitement sécurisé des paiements (soumis à leur propre politique de confidentialité)
- D'obligations légales imposées par une autorité compétente

---

## 6. Vos droits (RGPD)

Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :

- **Droit d'accès** : obtenir une copie des données vous concernant
- **Droit de rectification** : corriger des données inexactes
- **Droit à l'effacement** : demander la suppression de vos données
- **Droit d'opposition** : vous opposer au traitement de vos données
- **Droit à la portabilité** : recevoir vos données dans un format lisible

Pour exercer ces droits, ouvrez un ticket sur le serveur Discord avec la commande `/ticket` ou contactez-nous via l'adresse email ci-dessous.

---

## 7. Données tierces — Discord

Le Bot opère sur la plateforme **Discord**. Discord collecte et traite ses propres données conformément à sa [Politique de Confidentialité](https://discord.com/privacy). Nous n'avons aucun contrôle sur les données collectées directement par Discord.

---

## 8. Modifications de cette politique

Nous nous réservons le droit de modifier cette Politique de Confidentialité à tout moment. Les modifications seront annoncées sur le serveur Discord officiel. L'utilisation continue du Bot après modification vaut acceptation de la nouvelle version.

---

## 9. Contact

Pour toute question relative à cette politique ou pour exercer vos droits :

- **Serveur Discord** : Ouvrez un ticket via `/ticket`
- **Email** : support@404tweaks.com *(remplacer par votre adresse réelle)*

---

*Ce document est régi par le droit français et les réglementations européennes en matière de protection des données (RGPD — Règlement UE 2016/679).*
