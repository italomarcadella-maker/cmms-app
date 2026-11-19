"use client";

import { useEffect } from "react";

/** Ultima rete di sicurezza: errore nel layout principale. Non usa componenti dell'app perché potrebbero essere la causa. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error("Errore globale:", error);
    }, [error]);

    return (
        <html lang="it">
            <body style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", margin: 0, background: "#F4F5F5", color: "#101214" }}>
                <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
                    <h2 style={{ fontSize: 20, marginBottom: 8 }}>L&apos;applicazione ha avuto un problema</h2>
                    <p style={{ fontSize: 14, color: "#6C6F70", marginBottom: 16 }}>Ricarica la pagina. Se l&apos;errore continua, segnalalo indicando il codice sotto.</p>
                    {error.digest && <code style={{ display: "block", marginBottom: 16, fontSize: 12 }}>{error.digest}</code>}
                    <button onClick={() => reset()} style={{ background: "#0079B0", color: "#fff", border: 0, borderRadius: 8, padding: "10px 18px", fontSize: 14, cursor: "pointer" }}>
                        Riprova
                    </button>
                </div>
            </body>
        </html>
    );
}
