'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, UserPlus } from 'lucide-react';
import { createUser } from '@/lib/actions';
import { PlantPicker, type PlantChoice } from './plant-picker';
import { useT } from '@/lib/i18n/client';

export function AddUserDialog({ plants = [] }: { plants?: PlantChoice[] }) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [plantIds, setPlantIds] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'USER'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRoleChange = (val: string) => {
        setFormData(prev => ({ ...prev, role: val }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (formData.password.length < 3) {
            setError(t("La password deve essere di almeno 3 caratteri."));
            setLoading(false);
            return;
        }

        try {
            const result = await createUser({ ...formData, plantIds });
            if (result.success) {
                setSuccess(t("Utente creato con successo!"));
                setFormData({ name: '', email: '', password: '', role: 'USER' });
                setTimeout(() => setOpen(false), 2000);
            } else {
                setError(result.message ? t(result.message) : t("Errore sconosciuto."));
            }
        } catch (err) {
            setError(t("Si è verificato un errore."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
                setError('');
                setSuccess('');
            }
        }}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    {t("Aggiungi Utente")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("Aggiungi Nuovo Utente")}</DialogTitle>
                    <DialogDescription>
                        {t("Crea un nuovo utente per accedere alla piattaforma.")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">{t("Nome")}</label>
                        <Input
                            id="name"
                            name="name"
                            placeholder={t("Mario Rossi")}
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">{t("Email")}</label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder={t("mario@cmms.it")}
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium">{t("Password")}</label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder={t("Password")}
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t("Ruolo")}</label>
                        <Select value={formData.role} onValueChange={handleRoleChange}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("Seleziona Ruolo")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USER">{t("User")}</SelectItem>
                                <SelectItem value="MAINTAINER">{t("Manutentore")}</SelectItem>
                                <SelectItem value="PROCESS_ENGINEER">{t("Ingegnere di Processo")}</SelectItem>
                                <SelectItem value="SUPERVISOR">{t("Supervisor")}</SelectItem>
                                <SelectItem value="PLANT_MANAGER">{t("Responsabile di plant")}</SelectItem>
                                <SelectItem value="ADMIN">{t("Admin")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <PlantPicker plants={plants} value={plantIds} onChange={setPlantIds} isAdminRole={formData.role === 'ADMIN'} />

                    {error && (
                        <div className="text-sm text-red-500 font-medium bg-red-50 p-2 rounded border border-red-200">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="text-sm text-green-500 font-medium bg-green-50 p-2 rounded border border-green-200">
                            {success}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("Crea Utente")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
