# Guida Installazione su Windows

Questa guida ti aiuterà a far funzionare l'applicazione Investment Portfolio Manager sul tuo PC Windows, anche senza connessione internet.

## Prerequisiti

### 1. Installare Node.js
- Vai su [nodejs.org](https://nodejs.org)
- Scarica la versione LTS (Long Term Support)
- Esegui l'installer e segui le istruzioni
- Dopo l'installazione, apri il Prompt dei Comandi e verifica:
  ```
  node --version
  npm --version
  ```

### 2. Scaricare il Progetto
- Su Replit, clicca sui tre puntini (⋯) accanto al nome del progetto
- Seleziona "Download as zip"
- Estrai il file zip in una cartella sul tuo PC (es. `C:\investment-app`)

## Installazione

### 1. Aprire il Terminale
- Apri il **Prompt dei Comandi** o **PowerShell**
- Naviga nella cartella del progetto:
  ```
  cd C:\investment-app
  ```
  (Sostituisci con il percorso effettivo dove hai estratto i file)

### 2. Installare le Dipendenze
```
npm install
```

Questo comando installerà tutte le librerie necessarie. Potrebbe richiedere alcuni minuti.

### 3. Avviare l'Applicazione
```
npm run dev
```

L'applicazione si avvierà e vedrai un messaggio simile a:
```
[express] serving on port 5000
```

### 4. Aprire nel Browser
Apri il tuo browser web e vai su:
```
http://localhost:5000
```

## Modalità Offline

L'applicazione è progettata per funzionare anche **senza connessione internet**. Quando non c'è connessione:

- ✅ **Funziona tutto**: Acquisti, vendite, tracking del portfolio
- ✅ **Dati realistici**: Prezzi simulati per azioni popolari (Apple, Microsoft, Tesla, etc.)
- ✅ **Mercati europei**: Include anche azioni italiane (ENI, Enel, Intesa Sanpaolo)
- ✅ **Aggiornamenti**: I prezzi simulati cambiano leggermente per realismo
- ⚠️ **Indicatore visivo**: Vedrai "Offline" nella barra di stato

### Azioni Disponibili Offline
L'applicazione include dati simulati per:

**Azioni USA:**
- AAPL (Apple), MSFT (Microsoft), GOOGL (Alphabet)
- TSLA (Tesla), AMZN (Amazon), META (Meta)
- NVDA (NVIDIA)

**Azioni Europee:**
- ASML.AS (ASML), SAP.DE (SAP), NESN.SW (Nestlé)

**Azioni Italiane:**
- ENI.MI (Eni), ENEL.MI (Enel)
- ISP.MI (Intesa Sanpaolo), UCG.MI (UniCredit)

**Criptovalute:**
- BTC (Bitcoin), ETH (Ethereum)

**ETF:**
- SPY, QQQ, VTI

## Risoluzione Problemi

### Errore "Node.js non riconosciuto"
- Riavvia il Prompt dei Comandi dopo aver installato Node.js
- Assicurati di aver installato la versione LTS

### Errore durante npm install
- Prova a eseguire come amministratore
- Controlla la connessione internet (necessaria solo per l'installazione iniziale)

### L'applicazione non si apre
- Controlla che la porta 5000 non sia già in uso
- Se necessario, chiudi altri programmi che potrebbero usare la stessa porta

### Problemi con i prezzi
- In modalità offline, i prezzi sono simulati ma realistici
- Quando torni online, l'app userà automaticamente i dati reali

## Caratteristiche Principali

- 👥 **Due utenti**: Ali (visualizzazione) e Alle (admin con password)
- 📊 **Dashboard completo**: Grafico portfolio, lista investimenti, transazioni
- 💰 **Operazioni**: Acquisto e vendita con calcolo automatico
- 🎨 **Temi**: Modalità chiara e scura
- 📱 **Responsive**: Funziona su desktop e mobile
- 🔒 **Sicuro**: Dati salvati localmente, nessun invio verso internet

## Uso Quotidiano

1. **Avvia l'app**: `npm run dev`
2. **Apri il browser**: `http://localhost:5000`
3. **Accedi come Ali** per visualizzare
4. **Accedi come Alle** (con password) per gestire investimenti
5. **Chiudi l'app**: Premi `Ctrl+C` nel terminale

L'applicazione è ora pronta per l'uso completamente offline sul tuo PC Windows!