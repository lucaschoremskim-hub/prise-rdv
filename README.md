# Prise de rendez-vous en ligne (salon de coiffure)

Démo portfolio : réservation en ligne pensée pour le téléphone, avec un espace commerçant.
Vite + React, sans backend : les données sont enregistrées dans le navigateur (localStorage).

## Lancer sur Windows

Dans PowerShell, depuis ce dossier :

```
npm.cmd install
npm.cmd run dev
```

Puis ouvrir http://localhost:5173 (l'adresse exacte s'affiche dans la console).

Autres commandes : `npm.cmd test` (règles de créneaux), `npm.cmd run build` (version de production dans `dist`).

## Mode d'emploi

### Côté commerçant (bouton « Pro », code de démo 1234)

1. **Prestations** → « Ajouter » : nom, durée en minutes, prix, et coiffeurs qui la réalisent.
2. **Équipe** → « Ajouter » : prénom et prestations réalisées.
3. **Horaires** : un interrupteur par jour, une à trois plages horaires, puis « Enregistrer les horaires ».
4. **Réglages** : nom du salon, réservation possible jusqu'à 7 à 90 jours (30 par défaut),
   battement entre deux rendez-vous (0 par défaut), changement du code, réinitialisation de la démo.
5. **Planning** : vue Jour ou Semaine, filtre par coiffeur, nombre de rendez-vous, chiffre prévu,
   appel ou e-mail au client en un clic, annulation.

Le cadenas en haut à droite reverrouille l'espace commerçant.

### Côté client

Prestation → coiffeur (ou « Peu importe ») → jour et heure → nom, téléphone, e-mail → confirmation.
Depuis la confirmation : ajouter à son agenda (.ics) ou annuler. « Mes RDV » liste les rendez-vous pris sur l'appareil.

### Règles de créneaux

- Horaires communs au salon ; chaque coiffeur ne propose que les prestations cochées.
- Les heures proposées s'enchaînent selon la durée de la prestation (45 min → 9h00, 9h45, 10h30…).
- Un créneau disparaît quand aucun coiffeur compétent n'est libre ; « Peu importe » confie le rendez-vous au coiffeur le moins chargé du jour.
- Réservation au plus tard 2 heures avant ; une annulation libère immédiatement le créneau.

### Limite importante

Tout est stocké **dans le navigateur de l'appareil**. Client et commerçant ne partagent les données que s'ils utilisent le même navigateur
(deux onglets ouverts restent synchronisés). C'est voulu pour la démo, sans compte ni serveur.

## E-mail de confirmation (facultatif, gratuit via EmailJS)

1. Créer un compte sur https://www.emailjs.com (offre gratuite).
2. **Email Services** → « Add New Service » → Gmail → connecter la boîte d'envoi. Noter le *Service ID*.
3. **Email Templates** → « Create New Template ». Champ *To Email* : `{{to_email}}`. Exemple de contenu :
   `Bonjour {{to_name}}, votre rendez-vous « {{service_name}} » avec {{staff_name}} est confirmé le {{date}} à {{time}} ({{duration}}, {{price}}). À bientôt, {{salon_name}}.`
   Noter le *Template ID*.
4. **Account** → *Public Key*.
5. Copier `.env.example` en `.env.local` et coller les trois valeurs, puis relancer `npm.cmd run dev`.
6. Sur Vercel : Project → Settings → Environment Variables, ajouter les trois mêmes variables, puis redéployer.

Sans ces valeurs, l'application fonctionne normalement : confirmation à l'écran et fichier agenda.

## Déployer sur Vercel

Importer le dépôt dans Vercel : le fichier `vercel.json` indique déjà `npm run build` et le dossier `dist`.
