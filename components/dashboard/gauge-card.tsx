import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Tone } from "@/components/ui/status-badge";

const TONE_STROKE: Record<Tone, string> = {
    success: "var(--success)",
    info: "var(--info)",
    warning: "var(--warning)",
    critical: "var(--critical)",
    neutral: "var(--muted-foreground)",
    progress: "var(--primary)",
};

interface GaugeCardProps {
    label: string;
    /** Numero grande al centro del quadrante. */
    display: string;
    /** Riempimento dell'arco, da 0 a 100. */
    percent: number;
    hint?: string;
    tone?: Tone;
    href?: string;
}

/** Mezzo quadrante con arco colorato per stato: sostituisce la scheda con il solo numero. */
export function GaugeCard({ label, display, percent, hint, tone = "info", href }: GaugeCardProps) {
    const pct = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
    const body = (
        <div
            className={cn(
                "flex h-full flex-col items-center rounded-xl border bg-card px-3 pb-3 pt-2 text-center text-card-foreground shadow-sm transition-colors",
                href && "hover:border-primary/40"
            )}
        >
            <svg viewBox="0 0 180 112" className="w-full max-w-[210px]" role="img" aria-label={`${label}: ${display}`}>
                <path d="M20 94 A70 70 0 0 1 160 94" pathLength={100} fill="none" stroke="var(--border)" strokeWidth={9} strokeLinecap="round" />
                {pct > 0 && (
                    <path
                        className="gauge-arc"
                        d="M20 94 A70 70 0 0 1 160 94"
                        pathLength={100}
                        fill="none"
                        stroke={TONE_STROKE[tone]}
                        strokeWidth={9}
                        strokeLinecap="round"
                        strokeDasharray={`${pct} 100`}
                    />
                )}
                <text x="90" y="86" textAnchor="middle" fontSize="26" fontWeight="500" fill="var(--foreground)" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {display}
                </text>
            </svg>
            <p className="-mt-1 text-sm font-medium text-foreground">{label}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
    return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}
