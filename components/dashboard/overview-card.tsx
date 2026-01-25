
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OverviewCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    className?: string;
}

export function OverviewCard({ title, value, description, icon: Icon, className }: OverviewCardProps) {
    return (
        <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">{title}</h3>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="p-6 pt-0">
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}
