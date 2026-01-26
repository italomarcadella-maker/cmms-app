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

interface RoleSelectorProps {
    userId: string;
    currentRole: string;
}

export function RoleSelector({ userId, currentRole }: RoleSelectorProps) {
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
                <SelectValue placeholder="Seleziona Ruolo" />
            </SelectTrigger>
            <SelectContent className="bg-white">
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="MAINTAINER">Maintainer</SelectItem>
                <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
        </Select>
    );
}
