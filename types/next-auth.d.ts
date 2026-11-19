import { DefaultSession } from "next-auth"
import { AdapterUser } from "next-auth/adapters"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: string
            mustChangePassword?: boolean
            /** Stabilimenti assegnati (per ADMIN la lista e' vuota: vede tutto). */
            plantIds?: string[]
            /** Stabilimento "di casa". */
            homePlantId?: string | null
        } & DefaultSession["user"]
    }

    interface User {
        role: string
        mustChangePassword?: boolean
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: string
        mustChangePassword?: boolean
        plantIds?: string[]
        homePlantId?: string | null
        plantsCheckedAt?: number
    }
}

declare module "@auth/core/adapters" {
    interface AdapterUser {
        role: string;
        mustChangePassword?: boolean;
    }
}
