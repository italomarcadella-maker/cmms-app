"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Catturato da Next.js Error Boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="max-w-xl w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center">
        <AlertCircle className="h-16 w-16 mx-auto mb-6 text-red-500" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Ops! Si è verificato un errore inaspettato.</h2>
        <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm font-mono mt-4 text-left overflow-auto border border-red-200">
            <p className="font-bold border-b border-red-200 pb-2 mb-2">Dettagli Tecnici (invia questi a chi ti fa assistenza):</p>
            <p className="whitespace-pre-wrap">{error.message || "Nessun messaggio di errore disponibile"}</p>
            {error.stack && (
                <p className="mt-4 text-xs opacity-70 whitespace-pre-wrap">{error.stack}</p>
            )}
        </div>
        <button
          onClick={() => reset()}
          className="mt-6 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-sm"
        >
          Riprova a caricare
        </button>
      </div>
    </div>
  );
}
