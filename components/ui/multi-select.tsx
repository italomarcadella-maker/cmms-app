"use client";

import { useState, useEffect, useRef } from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
    id: string;
    label: string;
}

interface MultiSelectProps {
    label: string;
    options: Option[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    onCreate?: (label: string) => void;
}

export function MultiSelect({ label, options, value, onChange, placeholder, onCreate }: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (optionId: string) => {
        if (value.includes(optionId)) {
            onChange(value.filter(id => id !== optionId));
        } else {
            onChange([...value, optionId]);
        }
    };

    const handleCreate = () => {
        if (inputValue.trim() && onCreate) {
            onCreate(inputValue.trim());
            setInputValue("");
            // logic to auto-select the new item can happen in parent or here if we had the new ID
        }
    };

    const selectedLabels = value.map(id => options.find(o => o.id === id)?.label).filter(Boolean);

    return (
        <div className="space-y-2" ref={containerRef}>
            <label className="text-sm font-medium">{label}</label>
            <div className="relative">
                <div
                    className="min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-primary cursor-pointer flex flex-wrap gap-2"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {selectedLabels.length === 0 && <span className="text-muted-foreground">{placeholder || "Select..."}</span>}
                    {selectedLabels.map((label, idx) => (
                        <span key={idx} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            {label}
                            <span
                                role="button"
                                onClick={(e) => { e.stopPropagation(); onChange(value.filter(v => options.find(o => o.id === v)?.label !== label)); }}
                                className="hover:text-primary/70"
                            >
                                <X className="h-3 w-3" />
                            </span>
                        </span>
                    ))}
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 rounded-md border bg-background text-foreground shadow-lg max-h-60 overflow-y-auto p-1 ring-1 ring-black/5">
                        {onCreate && (
                            <div className="flex gap-2 p-2 border-b mb-1">
                                <input
                                    className="flex-1 bg-transparent text-sm outline-none"
                                    placeholder="Create new..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
                                />
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleCreate(); }}
                                    className="text-xs font-medium text-primary"
                                >
                                    Add
                                </button>
                            </div>
                        )}
                        {options.map(option => (
                            <div
                                key={option.id}
                                className={cn(
                                    "flex items-center justify-between px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                                    value.includes(option.id) && "bg-accent/50"
                                )}
                                onClick={() => handleSelect(option.id)}
                            >
                                {option.label}
                                {value.includes(option.id) && <Check className="h-4 w-4 text-primary" />}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
