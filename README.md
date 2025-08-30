# 📋 App Ordini "San Luigi"

Applicazione web per la gestione ordini del bar **San Luigi**, ottimizzata per utilizzo interno su PC/tablet con stampante termica da 80mm.

---

## ✨ Funzionalità principali

- **Home**
  - Pulsanti prodotti divisi per categorie (colori personalizzati).
  - Carrello con totale e possibilità di rimuovere articoli.
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
  - Esportazione risultati in **CSV, PDF e XSLX**.

---

## ⚙️ Tecnologia

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Database**: [Firebase Firestore](https://firebase.google.com/)
- **Realtime**: listener con `onSnapshot`
- **Transazioni**: `runTransaction` per la gestione sicura dello stock
- **Stampa**: finestra dedicata ottimizzata per stampanti termiche 80mm

---

## 🚀 Avvio

1. Clona il repository su GitHub Pages o un hosting statico.
2. Modifica il file `script.js` se devi aggiornare le credenziali Firebase.
3. Apri `index.html` in un browser moderno (consigliato: Chrome).

---

## 🖨️ Stampa Scontrini

- Stampante termica **80mm**.
- Contiene: logo, nome bar, numero ordine progressivo, data/ora, lista prodotti, totale, dicitura **"NON FISCALE"**.
- Caratteri grandi per la leggibilità.

---

## 🔐 Note di sicurezza

- L’app è pensata per **uso interno**.
- Non è previsto un sistema di login pubblico.
- L’URL non deve essere diffuso.

---

## 📂 Struttura file

- `index.html` → struttura pagine (Home, Impostazioni, Storico).
- `style.css` → grafica base e ottimizzazione pulsanti/carrello.
- `script.js` → logica app, Firebase, transazioni, stampa, storico.
- `README.md` → questo file.

---

## 👨‍💻 Manutenzione

- Aggiungere nuovi prodotti/categorie da **Impostazioni**.
- Lo **stock** si aggiorna automaticamente quando si vende/rimuove un prodotto.
- Gli **ordini** vengono salvati in Firestore e sono visibili nello storico.

---

✍️ **Autore:** progetto interno per la gestione del Bar *San Luigi*.
