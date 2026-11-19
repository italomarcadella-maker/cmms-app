import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
            <h2 className="text-xl font-semibold">Pagina non trovata</h2>
            <p className="max-w-md text-sm text-muted-foreground">L&apos;indirizzo non esiste oppure non hai i permessi per vederlo.</p>
            <Link href="/" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Torna alla dashboard
            </Link>
        </div>
    );
}
