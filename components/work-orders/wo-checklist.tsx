"use client";

import { useState } from "react";
import { CheckSquare, Square, Save } from "lucide-react";
import { ChecklistItem } from "@/lib/types";

// Interface removed as it's defined inline or not used


export function WorkOrderChecklist({ workOrderId, items, onUpdate }: {
    workOrderId?: string;
    items: ChecklistItem[];
    onUpdate?: (id: string, updates: any) => void;
    // Keeping backward compatibility for initialItems if needed elsewhere, 
    // but based on usage in page.tsx we need specific props
    initialItems?: ChecklistItem[];
}) {
    // If items are passed from parent (controlled mode), use them. 
    // Otherwise fall back to local state (uncontrolled mode) initialized from initialItems
    const [localItems, setLocalItems] = useState(items || []);

    const checklistItems = items || localItems;

    const toggleItem = (itemId: string) => {
        const updatedItems = checklistItems.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );

        if (onUpdate && workOrderId) {
            // Propagate change to parent
            // We need to send the FULL updated checklist array because the parent likely replaces it
            // The parent signature from page.tsx is: updateWorkOrder(id, { checklist: ... })
            // Wait, page.tsx usage: onUpdate={updateWorkOrder}
            // updateWorkOrder usually takes (woId, partialUpdate)
            // So we should call onUpdate(workOrderId, { checklist: updatedItems })
            onUpdate(workOrderId, { checklist: updatedItems });
        } else {
            setLocalItems(updatedItems);
        }
    };

    const progress = checklistItems.length > 0
        ? Math.round((checklistItems.filter(i => i.completed).length / checklistItems.length) * 100)
        : 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    Checklist Esecuzione
                </h3>
                <span className="text-sm text-muted-foreground">{progress}% Completato</span>
            </div>

            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mb-6">
                <div className="bg-primary h-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
            </div>

            <div className="space-y-2">
                {checklistItems.length === 0 && <p className="text-muted-foreground text-sm italic">Nessuna voce nella checklist.</p>}
                {checklistItems.map(item => (
                    <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                        <div className={`flex-shrink-0 ${item.completed ? "text-primary" : "text-muted-foreground"}`}>
                            {item.completed ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                        </div>
                        <span className={`text-sm ${item.completed ? "line-through text-muted-foreground" : "font-medium"}`}>
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
