'use client';

import { useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { updateUserRole } from '@/lib/actions';
import { useT } from '@/lib/i18n/client';

interface RoleSelectorProps {
    userId: string;
    currentRole: string;
}

export function RoleSelector({ userId, currentRole }: RoleSelectorProps) {
    const t = useT();
    const [role, setRole] = useState(currentRole);
    const [loading, setLoading] = useState(false);

    const handleRoleChange = async (newRole: string) => {
        setLoading(true);
        try {
            const result = await updateUserRole(userId, newRole);
            if (result.success) {
                setRole(newRole);
            } else {
                console.error(result.message);
            }
        } catch (error) {
            console.error('Failed to change role', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Select value={role} onValueChange={handleRoleChange} disabled={loading}>
            <SelectTrigger className="w-[140px] bg-white">
                <SelectValue placeholder={t("Seleziona Ruolo")} />
            </SelectTrigger>
            <SelectContent className="bg-white">
                <SelectItem value="USER">{t("User")}</SelectItem>
                <SelectItem value="MAINTAINER">{t("Maintainer")}</SelectItem>
                <SelectItem value="PROCESS_ENGINEER">{t("Ingegnere di Processo")}</SelectItem>
                <SelectItem value="SUPERVISOR">{t("Supervisor")}</SelectItem>
                <SelectItem value="PLANT_MANAGER">{t("Responsabile di plant")}</SelectItem>
                <SelectItem value="ADMIN">{t("Admin")}</SelectItem>
            </SelectContent>
        </Select>
    );
}
