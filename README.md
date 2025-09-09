# 📋 App Ordini "San Luigi"

Applicazione web per la gestione ordini del bar **San Luigi**, ottimizzata per utilizzo interno su PC/tablet con stampante termica da 80mm.

---

## ✨ Funzionalità principali

- **Home**
  - Pulsanti prodotti divisi per categorie (colori personalizzati).
  - Carrello con totale, rimozione articoli e pulsante **"Svuota carrello"**.
  - Gestione **stock in tempo reale** con Firebase + transazioni sicure.
  - Pulsante **"Stampa e invia"**: stampa scontrino ottimizzato 80mm, numerato e con dicitura *"NON FISCALE"*.

- **Impostazioni**
  - Creazione/modifica/eliminazione categorie (nome, colore, ordine).
  - Creazione/modifica/eliminazione prodotti (nome, prezzo, stock, attivo).
  - Prodotti attivi/disattivi senza doverli eliminare.
  - Dati sincronizzati con **Firebase Firestore**.

- **Storico ordini**
  - Ricerca vendite per data.
  - Tabella con prodotti venduti e quantità.
  - Calcolo ricavi giornalieri.
  - Esportazione risultati in **CSV, PDF e XLSX** (con data inclusa nel file).

- **Autenticazione**
  - Login con **Firebase Authentication (email/password)**.
  - Logout sempre disponibile nell’header accanto ai pulsanti di navigazione.
  - Avviso visibile nel login:  
    > ⚠️ *Accesso riservato al personale autorizzato. Inserire le credenziali fornite.*

---

## ⚙️ Tecnologia

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Database**: [Firebase Firestore](https://firebase.google.com/)
- **Autenticazione**: Firebase Authentication (Email/Password)
- **Realtime**: listener con `onSnapshot`
- **Transazioni**: `runTransaction` per la gestione sicura dello stock
- **Stampa**: finestra dedicata ottimizzata per stampanti termiche 80mm

---

## 🔑 Login

1. Vai in **Firebase Console → Authentication → Utenti**.
2. Aggiungi un nuovo utente con email e password (es. `admin@sanluigi.it` / `admin123`).
3. Usa queste credenziali nel form di login.
4. Dopo login:
   - il form scompare,
   - compare l’app completa con Home, Impostazioni, Storico,
   - appare il pulsante 🚪 **Logout** nell’header.

---

## 🔒 Sicurezza Firestore

Esempio di regole minime per consentire l’accesso solo a utenti autenticati:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
