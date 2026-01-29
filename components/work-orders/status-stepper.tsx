"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusStepperProps {
    status: string;
}

const STEPS = [
    { id: 'OPEN', label: 'Aperto' },
    { id: 'IN_PROGRESS', label: 'In Corso' },
    { id: 'COMPLETED', label: 'Completato' },
    { id: 'CLOSED', label: 'Chiuso' }
];

export function StatusStepper({ status }: StatusStepperProps) {
    // Map status to step index
    let currentStepIndex = 0;
    if (status === 'IN_PROGRESS') currentStepIndex = 1;
    if (status === 'COMPLETED' || status === 'PENDING_APPROVAL') currentStepIndex = 2; // Treat pending approval as completed work waiting review
    if (status === 'CLOSED') currentStepIndex = 3;
    if (status === 'CANCELED' || status === 'REJECTED') return null; // Don't show stepper for cancelled

    return (
        <div className="w-full py-4">
            <div className="relative flex items-center justify-between w-full">
                {/* Connecting Line */}
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-muted -z-10 rounded-full" />

                {/* Active Line (Progress) */}
                <div
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-500"
                    style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
                />

                {STEPS.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;

                    return (
                        <div key={step.id} className="flex flex-col items-center bg-background px-2">
                            <div className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
                                isCompleted ? "bg-primary border-primary text-primary-foreground" : "bg-background border-muted text-muted-foreground",
                                isCurrent && "ring-4 ring-primary/20 scale-110"
                            )}>
                                {index < currentStepIndex ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <span className="text-xs font-bold">{index + 1}</span>
                                )}
                            </div>
                            <span className={cn(
                                "mt-2 text-xs font-medium transition-colors",
                                isCompleted ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
