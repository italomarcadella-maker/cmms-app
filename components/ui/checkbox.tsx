"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

// Replicating Radix Checkbox API with native input
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onCheckedChange?.(e.target.checked);
            onChange?.(e);
        };

        return (
            <div className="relative flex items-center justify-center">
                <input
                    type="checkbox"
                    className="peer absolute inset-0 h-4 w-4 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    onChange={handleChange}
                    checked={checked}
                    ref={ref}
                    {...props}
                />
                <div className={cn(
                    "h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
                    checked ? "bg-primary text-primary-foreground" : "bg-transparent",
                    className
                )}>
                    {checked && <Check className="h-3 w-3 mx-auto mt-0.5" />}
                </div>
            </div>
        )
    }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
