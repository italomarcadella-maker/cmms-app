"use client";

import { useState } from "react";
import { useReference } from "@/lib/reference-context";
import { Plus, Trash2, ListChecks } from "lucide-react";

export default function ActivitiesPage() {
    const { activities, addActivity, removeActivity } = useReference();
    const [newActivity, setNewActivity] = useState("");

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newActivity.trim()) {
            addActivity(newActivity.trim());
            setNewActivity("");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <ListChecks className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Maintenance Activities</h1>
                    <p className="text-muted-foreground text-sm">Manage the list of standard maintenance tasks.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* List */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-muted/40 font-medium text-sm">
                        Defined Activities ({activities.length})
                    </div>
                    <div className="divide-y max-h-[500px] overflow-y-auto">
                        {activities.map(act => (
                            <div key={act.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors group">
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">{act.label}</span>
                                    <span className="text-xs font-mono text-muted-foreground">{act.id}</span>
                                </div>
                                <button
                                    onClick={() => removeActivity(act.id)}
                                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-2"
                                    title="Remove Activity"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        {activities.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground text-sm italic">
                                No activities defined. Add one to get started.
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Form */}
                <div className="h-fit rounded-xl border bg-card shadow-sm p-6">
                    <h3 className="font-semibold mb-4">Add New Activity</h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="label" className="text-sm font-medium">Activity Name</label>
                            <input
                                id="label"
                                required
                                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                placeholder="e.g. Safety Inspection"
                                value={newActivity}
                                onChange={(e) => setNewActivity(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            <Plus className="h-4 w-4" /> Add Activity
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
