'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { updateUser } from '@/lib/actions';
import { PlantPicker, type PlantChoice } from './plant-picker';
import { Pencil } from 'lucide-react';
import { toast } from '@/lib/i18n/toast';
import { useT } from '@/lib/i18n/client';

interface EditUserDialogProps {
    user: {
        id: string;
        name: string | null;
        email: string | null;
        department?: string;
        image?: string;
        role: string;
        plantIds?: string[];
    };
    plants?: PlantChoice[];
}

export function EditUserDialog({ user, plants = [] }: EditUserDialogProps) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [name, setName] = useState(user.name || '');
    const [email, setEmail] = useState(user.email || '');
    const [department, setDepartment] = useState(user.department || '');
    const [image, setImage] = useState(user.image || '');
    const [role, setRole] = useState(user.role);
    const [plantIds, setPlantIds] = useState<string[]>(user.plantIds ?? []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await updateUser(user.id, {
                name,
                email,
                department,
                image,
                role,
                plantIds
            });

            if (result.success) {
                toast.success(result.message);
                setOpen(false);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("Si è verificato un errore imprevisto.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title={t("Modifica Utente")} aria-label={t("Modifica Utente")}>
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("Modifica Profilo Utente")}</DialogTitle>
                    <DialogDescription>
                        {t("Aggiorna i dati anagrafici e il reparto dell'utente.")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            {t("Nome")}
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                            {t("Email")}
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="department" className="text-right">
                            {t("Reparto")}
                        </Label>
                        <Select value={department} onValueChange={setDepartment}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder={t("Seleziona Reparto")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Manutenzione Meccanica">{t("Manutenzione Meccanica")}</SelectItem>
                                <SelectItem value="Manutenzione Elettrica">{t("Manutenzione Elettrica")}</SelectItem>
                                <SelectItem value="Produzione">{t("Produzione")}</SelectItem>
                                <SelectItem value="Ufficio Tecnico">{t("Ufficio Tecnico")}</SelectItem>
                                <SelectItem value="Amministrazione">{t("Amministrazione")}</SelectItem>
                                <SelectItem value="Altro">{t("Altro")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">
                            {t("Ruolo")}
                        </Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder={t("Seleziona Ruolo")} />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="USER">{t("User")}</SelectItem>
                                <SelectItem value="MAINTAINER">{t("Manutentore")}</SelectItem>
                                <SelectItem value="PROCESS_ENGINEER">{t("Ingegnere di Processo")}</SelectItem>
                                <SelectItem value="SUPERVISOR">{t("Supervisor")}</SelectItem>
                                <SelectItem value="PLANT_MANAGER">{t("Responsabile di plant")}</SelectItem>
                                <SelectItem value="ADMIN">{t("Admin")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="image" className="text-right">
                            {t("Foto URL")}
                        </Label>
                        <Input
                            id="image"
                            value={image}
                            onChange={(e) => setImage(e.target.value)}
                            className="col-span-3"
                            placeholder="https://..."
                        />
                    </div>
                    <PlantPicker plants={plants} value={plantIds} onChange={setPlantIds} isAdminRole={role === 'ADMIN'} />
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? t("Salvataggio...") : t("Salva Modifiche")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
