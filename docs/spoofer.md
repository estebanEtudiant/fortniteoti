# Temp Spoofer

Le produit utilise le slug `spoofer` et les licences `SHOP_SPOOFER`.

- **Shop → Temp Spoofer — clés & prix** : importer une clé fournisseur par ligne, sélectionner 1, 7, 14 ou 30 jours, gérer les prix en centimes EUR et activer les offres. L'inventaire paginé affiche chaque clé, son statut (disponible, réservée, livrée), le client, la commande et les dates. Filtres par durée/statut et recherche par clé, email, pseudo ou ID commande.
- **Upload → Temp Spoofer** : publier un `.exe` ou `.zip` (200 Mo maximum). Le fichier est téléchargé depuis le profil client après un achat validé.
- Les clés sont conservées dans PostgreSQL, réservées avant le paiement et attribuées dans la même transaction que la commande. Les doublons sont ignorés, même après vente. Une rupture de stock bloque le paiement.
- Stripe : livraison uniquement après paiement, libération lors de `checkout.session.expired` ou `checkout.session.async_payment_failed`. Une vérification toutes les dix minutes réconcilie également les réservations Stripe de plus de 24 heures.
- Crypto : livraison sur IPN signé `confirmed`/`finished`, libération sur `failed`/`expired`. Une erreur réseau ambiguë conserve la réservation pour éviter de vendre une clé dont le paiement pourrait aboutir.
- Une clé livrée n'est jamais recyclée. Un remboursement Stripe intégral suspend l'accès au téléchargement.
- L'activation et l'expiration réelles dépendent du fournisseur : aucune fausse date d'expiration ou mention « à vie » n'est affichée.
- Les nouveaux achats du spoofer sont facturés en EUR (7 jours : 8,99 €, 14 jours : 16,99 €, 30 jours : 29,99 €). Les paniers mixtes sont autorisés. Les anciennes commandes conservent leur devise d'origine.
- Le stock disponible est affiché par durée sur le produit et dans le panier, avec actualisation toutes les 30 secondes et au retour sur la fenêtre. Les achats sont bloqués en cas de rupture, de quantité excessive ou d'échec de vérification du stock. Les autres licences, générées à la demande, affichent « Disponible » sans compteur fictif.

Import initial depuis un fichier JSON privé contenant les propriétés `1d`, `1w`, `14d`, `1m`, chacune contenant un tableau de clés :

```sh
npx ts-node scripts/import-spoofer-keys.ts /private/keys.json
```

Tests : `npm test -- --runInBand test/spoofer.spec.ts`. Avec `SPOOFER_INTEGRATION=1`, les tests créent et suppriment un schéma PostgreSQL temporaire ; aucune clé commerciale n'est utilisée.
