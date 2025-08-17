# 💼 Investment Portfolio Manager - Installazione Windows

## 🚀 Avvio Rapido

1. **Scarica il progetto** sul tuo PC Windows
2. **Doppio click** su `start-webapp.bat`
3. **Apri il browser** su `http://localhost:5173`

## 📋 Prerequisiti

### Node.js (Obbligatorio)
- Scarica da: https://nodejs.org/
- Versione consigliata: LTS (Long Term Support)
- Durante l'installazione, assicurati che sia selezionato "Add to PATH"

## 🔑 Configurazione API

### Chiave Finnhub (Per dati finanziari reali)
1. Vai su https://finnhub.io/
2. Registrati gratuitamente
3. Ottieni la tua API key
4. Modifica il file `.env` e sostituisci `inserisci_qui_la_tua_chiave_api` con la tua chiave

**Esempio file .env:**
```
FINNHUB_API_KEY=tua_chiave_api_qui
```

## 🔧 Risoluzione Problemi

### "Node.js non è installato"
- Scarica e installa Node.js da https://nodejs.org/
- Riavvia il computer dopo l'installazione
- Riprova ad eseguire `start-webapp.bat`

### "Installazione dipendenze fallita"
- Controlla la connessione internet
- Esegui come amministratore il file batch
- Se persiste, apri il prompt dei comandi e digita: `npm cache clean --force`

### "API non funziona"
- Verifica che la chiave API sia corretta nel file `.env`
- Controlla la connessione internet
- La chiave gratuita ha un limite di 60 chiamate al minuto

### "Porta già in uso"
- Chiudi altre applicazioni che potrebbero usare la porta 5173
- Riavvia il computer se necessario

## 📱 Utilizzo

### Accesso
- **Ali** (Visualizzatore): accesso senza password
- **Alle** (Amministratore): richiede password per modifiche

### Funzionalità
- ✅ Visualizzazione portafoglio in tempo reale
- ✅ Aggiunta nuovi investimenti
- ✅ Vendita investimenti esistenti
- ✅ Cronologia transazioni
- ✅ Grafici interattivi
- ✅ Tema scuro/chiaro

## 🛑 Come Chiudere

1. **Nella finestra del prompt**: premi `Ctrl + C`
2. **Oppure**: chiudi semplicemente la finestra del prompt
3. **Il browser**: chiudi la scheda o il browser

## 📞 Supporto

Se riscontri problemi:
1. Verifica i prerequisiti
2. Controlla la sezione "Risoluzione Problemi"
3. Assicurati che la chiave API sia configurata correttamente

---

**Nota**: La prima esecuzione potrebbe richiedere alcuni minuti per scaricare le dipendenze necessarie.