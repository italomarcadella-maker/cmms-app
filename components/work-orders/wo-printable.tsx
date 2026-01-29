"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
// Basic print implementation using window.print
// I should use standard browser print method with CSS.

export function PrintButton({ contentRef }: { contentRef: React.RefObject<HTMLDivElement | null> }) {
    const handlePrint = () => {
        const content = contentRef.current;
        if (!content) return;

        const printWindow = window.open('', '', 'height=600,width=800');
        if (!printWindow) return;

        printWindow.document.write('<html><head><title>Stampa Ordine di Lavoro</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #111; }
            .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: end; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
            .title { font-size: 32px; font-weight: bold; margin: 0 0 10px 0; }
            .meta { font-size: 14px; color: #555; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 16px; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .label { font-size: 12px; color: #666; font-weight: 600; text-transform: uppercase; }
            .value { font-size: 15px; margin-bottom: 10px; }
            .table { width: 100%; border-collapse: collapse; font-size: 14px; }
            .table th { text-align: left; border-bottom: 1px solid #000; padding: 8px 0; }
            .table td { border-bottom: 1px solid #eee; padding: 8px 0; }
            .footer { margin-top: 50px; border-top: 1px solid #000; padding-top: 20px; font-size: 12px; color: #666; display: flex; justify-content: space-between; }
            .signature-box { border: 1px dashed #ccc; height: 80px; margin-top: 10px; width: 200px; }
        `);
        printWindow.document.write('</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(content.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 hidden sm:flex">
            <Printer className="h-4 w-4" /> Stampa Report
        </Button>
    );
}

// Ensure the printable content is structurally sound for the CSS above
export function PrintableWO({ wo, hidden }: { wo: any, hidden?: boolean }) {
    if (!wo) return null;

    return (
        <div className={hidden ? "hidden" : ""} id="printable-content">
            <div className="header">
                <div>
                    <div className="logo">CMMS Pro</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Rapporto Tecnico di Intervento</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold' }}>ID: {wo.id}</div>
                    <div>Data: {new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <div className="section">
                <h1 className="title">{wo.title}</h1>
                <div className="meta">
                    <div>
                        <div className="label">Asset</div>
                        <div className="value">{wo.assetName}</div>
                    </div>
                    <div>
                        <div className="label">Stato Attuale</div>
                        <div className="value">{wo.status}</div>
                    </div>
                    <div>
                        <div className="label">Priorità</div>
                        <div className="value">{wo.priority}</div>
                    </div>
                    <div>
                        <div className="label">Tecnico Assegnato</div>
                        <div className="value">{wo.assignedTo || 'N/A'}</div>
                    </div>
                </div>
                <div>
                    <div className="label">Descrizione Problema</div>
                    <div className="value" style={{ lineHeight: '1.5' }}>{wo.description}</div>
                </div>
            </div>

            <div className="grid">
                <div className="section">
                    <div className="section-title">Materiali Utilizzati</div>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Ricambio</th>
                                <th>Qtà</th>
                                <th style={{ textAlign: 'right' }}>Costo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {wo.partsUsed?.length ? wo.partsUsed.map((p: any, i: number) => (
                                <tr key={i}>
                                    <td>{p.partName}</td>
                                    <td>{p.quantity}</td>
                                    <td style={{ textAlign: 'right' }}>€{(p.unitCost * p.quantity).toFixed(2)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={3} style={{ fontStyle: 'italic', color: '#999' }}>Nessun materiale consumato</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="section">
                    <div className="section-title">Manodopera</div>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Tecnico</th>
                                <th>Ore</th>
                                <th style={{ textAlign: 'right' }}>Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {wo.laborLogs?.length ? wo.laborLogs.map((l: any, i: number) => (
                                <tr key={i}>
                                    <td>{l.technicianName}</td>
                                    <td>{l.hours}h</td>
                                    <td style={{ textAlign: 'right' }}>{new Date(l.date).toLocaleDateString()}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={3} style={{ fontStyle: 'italic', color: '#999' }}>Nessuna attività registrata</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="section">
                <div className="section-title">Checklist Controlli</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {wo.checklist?.map((item: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '16px', height: '16px',
                                border: '1px solid #333',
                                background: item.completed ? '#333' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '12px'
                            }}>
                                {item.completed ? '✓' : ''}
                            </div>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="footer">
                <div>
                    <div className="label">Firma Tecnico</div>
                    <div className="signature-box"></div>
                </div>
                <div>
                    <div className="label">Firma Supervisore</div>
                    <div className="signature-box"></div>
                </div>
            </div>
        </div>
    );
}
