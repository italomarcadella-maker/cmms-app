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
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface EditUserDialogProps {
    user: {
        id: string;
        name: string | null;
        email: string | null;
        department?: string;
        image?: string;
    };
}

export function EditUserDialog({ user }: EditUserDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [name, setName] = useState(user.name || '');
    const [email, setEmail] = useState(user.email || '');
    const [department, setDepartment] = useState(user.department || '');
    const [image, setImage] = useState(user.image || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await updateUser(user.id, {
                name,
                email,
                department,
                image
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
                <Button variant="ghost" size="icon" title="Modifica Utente">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Modifica Profilo Utente</DialogTitle>
                    <DialogDescription>
                        Aggiorna i dati anagrafici e il reparto dell'utente.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Nome
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
                            Email
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
                            Reparto
                        </Label>
                        <Select value={department} onValueChange={setDepartment}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleziona Reparto" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Manutenzione Meccanica">Manutenzione Meccanica</SelectItem>
                                <SelectItem value="Manutenzione Elettrica">Manutenzione Elettrica</SelectItem>
                                <SelectItem value="Produzione">Produzione</SelectItem>
                                <SelectItem value="Ufficio Tecnico">Ufficio Tecnico</SelectItem>
                                <SelectItem value="Amministrazione">Amministrazione</SelectItem>
                                <SelectItem value="Altro">Altro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="image" className="text-right">
                            Foto URL
                        </Label>
                        <Input
                            id="image"
                            value={image}
                            onChange={(e) => setImage(e.target.value)}
                            className="col-span-3"
                            placeholder="https://..."
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvataggio..." : "Salva Modifiche"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
