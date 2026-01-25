"use client";

import { useState } from "react";
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useComponents, ComponentItem } from "@/lib/components-context";
import { useAssets } from "@/lib/assets-context";
import { Asset } from "@/lib/types";
import { Box, GripVertical, Factory, ArrowRight, ArrowLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Draggable Component Card
function DraggableComponent({ component }: { component: ComponentItem }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: component.id,
        data: { component }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="p-3 bg-card border rounded-lg shadow-sm mb-2 cursor-grab active:cursor-grabbing hover:border-primary transition-colors flex items-center gap-3 touch-none group"
        >
            <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
            <div>
                <div className="font-medium text-sm">{component.code}</div>
                <div className="text-xs text-muted-foreground">{component.model}</div>
            </div>
            <div className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {component.warehouse === 'RETINATO' ? 'RET' : 'MAG'}
            </div>
        </div>
    );
}

// Droppable Asset Card
function DroppableAsset({ asset, assignedComponents }: { asset: Asset, assignedComponents: ComponentItem[] }) {
    const { setNodeRef, isOver } = useDroppable({
        id: asset.id,
        data: { asset }
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "p-4 rounded-xl border transition-all duration-200",
                isOver ? "bg-primary/10 border-primary shadow-md scale-[1.02]" : "bg-card shadow-sm"
            )}
        >
            <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-muted/50 rounded-lg text-muted-foreground">
                    <Factory className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm">{asset.name}</h3>
                    <p className="text-xs text-muted-foreground">
                        {asset.line ? <span className="font-medium text-primary block mb-0.5">{asset.line}</span> : null}
                        {asset.model} • {asset.location}
                    </p>
                </div>
            </div>

            <div className="space-y-2 min-h-[60px] bg-muted/20 rounded-lg p-2 border border-dashed border-transparent">
                {assignedComponents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                        Trascina qui viti/cilindri
                    </div>
                ) : (
                    assignedComponents.map(c => (
                        <DraggableComponent key={c.id} component={c} />
                    ))
                )}
            </div>
        </div>
    );
}

export default function AssignmentPage() {
    const { components, assignComponent, moveWarehouse } = useComponents();
    const { assets } = useAssets();
    const [activeId, setActiveId] = useState<string | null>(null);
    const [assetFilter, setAssetFilter] = useState("");

    const filteredAssets = assets.filter(a =>
        a.name.toLowerCase().includes(assetFilter.toLowerCase()) ||
        a.model.toLowerCase().includes(assetFilter.toLowerCase())
    );

    // Only unassigned components or those we want to re-assign
    const unassignedComponents = components.filter(c => !c.assignedAssetId);

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        const componentId = active.id as string;
        const targetId = over.id as string;

        // 1. Drop on Warehouse
        if (targetId === 'RETINATO' || targetId === 'MAGLIATO') {
            const warehouseBox = targetId as 'RETINATO' | 'MAGLIATO';
            // Move to warehouse (which implicitly unassigns from asset if it was on one, 
            // but we need to use moveWarehouse to ensure warehouse field is updated)

            // Logic: Unassign first (if assigned), then set warehouse
            assignComponent(componentId, undefined);
            const comp = components.find(c => c.id === componentId);
            if (comp) {
                moveWarehouse(componentId, warehouseBox, comp.location);
            }
        }
        // 2. Drop on Asset
        else if (targetId !== componentId) {
            // Check if asset already has a component of SAME TYPE
            const draggedComponent = components.find(c => c.id === componentId);
            if (!draggedComponent) return;

            const assetId = targetId;
            const existingComponentsOnAsset = components.filter(c => c.assignedAssetId === assetId);
            const conflictingComponent = existingComponentsOnAsset.find(c => c.type === draggedComponent.type);

            if (conflictingComponent) {
                // SWAP LOGIC: Unassign the conflicting one (send back to its warehouse)
                assignComponent(conflictingComponent.id, undefined);
            }

            // Assign the new one
            assignComponent(componentId, assetId);
        }

        setActiveId(null);
    };

    const activeComponent = activeId ? components.find(c => c.id === activeId) : null;

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
                <div className="flex items-center gap-4 shrink-0">
                    <Link href="/screws" className="p-2 rounded-full hover:bg-muted text-muted-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Assegnazione Componenti</h1>
                        <p className="text-muted-foreground text-sm">Trascina i componenti dal magazzino agli asset.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                    {/* Warehouse (Source/Target) */}
                    <div className="flex flex-col gap-4">
                        {/* RETINATO */}
                        <div className="flex-1 flex flex-col rounded-xl border bg-muted/10 overflow-hidden">
                            <DroppableWarehouse
                                type="RETINATO"
                                components={unassignedComponents.filter(c => c.warehouse === 'RETINATO')}
                            />
                        </div>
                        {/* MAGLIATO */}
                        <div className="flex-1 flex flex-col rounded-xl border bg-muted/10 overflow-hidden">
                            <DroppableWarehouse
                                type="MAGLIATO"
                                components={unassignedComponents.filter(c => c.warehouse === 'MAGLIATO')}
                            />
                        </div>
                    </div>

                    {/* Assets (Target) */}
                    <div className="lg:col-span-2 flex flex-col rounded-xl border bg-muted/10 overflow-hidden">
                        <div className="p-4 border-b bg-muted/40 font-medium text-sm flex justify-between items-center gap-4">
                            <span>Linee di Produzione & Asset</span>
                            <div className="relative w-full max-w-xs">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    className="w-full pl-8 h-8 rounded-md border bg-background px-3 text-xs focus:ring-1 focus:ring-primary outline-none"
                                    placeholder="Cerca asset..."
                                    value={assetFilter}
                                    onChange={(e) => setAssetFilter(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto">
                            {filteredAssets.map(asset => (
                                <DroppableAsset
                                    key={asset.id}
                                    asset={asset}
                                    assignedComponents={components.filter(c => c.assignedAssetId === asset.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <DragOverlay>
                {activeComponent ? (
                    <div className="p-3 bg-card border border-primary rounded-lg shadow-xl cursor-grabbing flex items-center gap-3 w-64 opacity-90">
                        <GripVertical className="h-4 w-4 text-primary" />
                        <div>
                            <div className="font-medium text-sm">{activeComponent.code}</div>
                            <div className="text-xs text-muted-foreground">{activeComponent.model}</div>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

// Droppable Warehouse Area
function DroppableWarehouse({ type, components }: { type: 'RETINATO' | 'MAGLIATO', components: ComponentItem[] }) {
    const { setNodeRef, isOver } = useDroppable({
        id: type,
        data: { type }
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex flex-col h-full transition-colors",
                isOver ? "bg-primary/5" : ""
            )}
        >
            <div className={cn(
                "p-3 border-b font-medium text-sm flex justify-between items-center",
                type === 'RETINATO' ? "bg-amber-50/50 text-amber-900" : "bg-blue-50/50 text-blue-900"
            )}>
                <span>Magazzino {type}</span>
                <span className="text-xs bg-white px-2 py-0.5 rounded-full border shadow-sm">{components.length}</span>
            </div>
            <div className="p-3 flex-1 overflow-y-auto min-h-[200px]">
                {components.map(c => (
                    <DraggableComponent key={c.id} component={c} />
                ))}
                {components.length === 0 && (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic border-2 border-dashed rounded-lg m-2">
                        Trascina qui per spostare in {type}
                    </div>
                )}
            </div>
        </div>
    );
}
