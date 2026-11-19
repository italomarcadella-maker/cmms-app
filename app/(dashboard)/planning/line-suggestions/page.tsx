import { PageHeader } from "@/components/ui/page-header";
import { LineSuggestions } from "@/components/planning/line-suggestions";

export const metadata = { title: "Linee senza calendario di produzione" };

export default function LineSuggestionsPage() {
    return (
        <div className="mx-auto max-w-6xl">
            <PageHeader
                title="Linee senza calendario di produzione"
                description="Senza un calendario di produzione la linea non ha vincoli: ecco cosa si può fare ora."
                breadcrumb={[{ label: "Planning e calendario", href: "/planning/calendar" }, { label: "Suggerimenti per linea" }]}
            />
            <LineSuggestions />
        </div>
    );
}
