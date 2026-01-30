# Guida alla Deployment su Vercel

Questa applicazione è pronta per essere pubblicata su Vercel. Segui questi passaggi per metterla online.

## Prerequisiti

1.  **Account GitHub**: Per ospitare il codice.
2.  **Account Vercel**: Per il deployment.
3.  **Database PostgreSQL Cloud**: Vercel non ospita il database direttamente (a meno che non usi Vercel Postgres). Ti consigliamo [Neon Tech](https://neon.tech) o [Supabase](https://supabase.com) o Vercel Postgres.

## Passo 1: Preparazione Database

1.  Crea un nuovo database su Neon/Supabase/Vercel.
2.  Ottieni la **Connection String** (es. `postgres://user:pass@host:5432/dbname?sslmode=require`).
3.  Dal tuo computer locale, applica lo schema al database cloud:
    ```bash
    # Nel terminale del progetto (assicurati di aver installato le dipendenze con npm install)
    
    # Imposta temporaneamente la URL del DB cloud
    $env:DATABASE_URL="postgres://..." 
    
    # Spingi lo schema
    npx prisma db push
    
    # (Opzionale) Carica i dati iniziali
    npx prisma db seed
    ```

## Passo 2: Pubblica il Codice su GitHub

1.  Crea una nuova repository su GitHub (es. `cmms-app`).
2.  Inizializza git e spingi il codice:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/IL_TUO_USER/cmms-app.git
    git push -u origin main
    ```

## Passo 3: Importa in Vercel

1.  Vai su [vercel.com](https://vercel.com/new).
2.  Collega il tuo account GitHub.
3.  Seleziona la repository `cmms-app`.
4.  Nella configurazione del progetto ("Configure Project"):
    *   **Framework Preset**: Next.js (Dovrebbe essere automatico).
    *   **Root Directory**: `./`
    *   **Build Command**: `npx prisma generate && next build` (Già configurato nel package.json, Vercel userà `npm run build`).
    
5.  **Environment Variables** (Espandi la sezione):
    Aggiungi le seguenti variabili:
    *   `DATABASE_URL`: La connection string del tuo database cloud.
    *   `NEXTAUTH_SECRET`: Una stringa casuale lunga (puoi generarla con `openssl rand -base64 32` o scriverne una a caso).
    *   `NEXTAUTH_URL`: Lascia vuoto o imposta la URL che Vercel ti assegnerà (es. `https://cmms-app.vercel.app`). Vercel solitamente la gestisce in automatico, ma per Auth.js è bene impostarla se hai problemi.
    
6.  Clicca **Deploy**.

## Passo 4: Verifica

1.  Attendi che il build finisca (circa 1-2 minuti).
2.  Visita l'URL fornito da Vercel.
3.  Prova a fare login (usa le credenziali che hai nel seed o registrati se hai abilitato la registrazione).

## Note Importanti

*   **Self-Learning & Immagini**: 
    *   Le immagini caricate (se salvate su disco locale `public/uploads`) **NON funzioneranno** su Vercel perché il filesystem è effimero. Per la produzione, dovresti collegare uno storage S3 (AWS) o Vercel Blob.
    *   Il database `MaintenanceKnowledge` funzionerà correttamente perché è sul DB cloud.
