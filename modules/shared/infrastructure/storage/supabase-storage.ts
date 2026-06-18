import { IFileStorageService } from "../../domain/ports/file-storage";
import { ServiceLocator } from "../registry/service-locator";
import * as fs from "fs";
import * as path from "path";

export class SupabaseStorageService implements IFileStorageService {
    private supabaseUrl = process.env.SUPABASE_URL || "https://ehgmzxsgqwhfhxrcltqv.supabase.co";
    private supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    async uploadFile(file: Buffer, fileName: string, mimeType: string, bucket: string = "sops"): Promise<string> {
        if (this.supabaseKey) {
            // Supabase API upload
            const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${bucket}/${fileName}`;
            try {
                const response = await fetch(uploadUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${this.supabaseKey}`,
                        "Content-Type": mimeType,
                        "x-upsert": "true"
                    },
                    body: new Uint8Array(file)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Supabase upload failed: ${response.statusText} - ${errorText}`);
                }

                // Return the public URL
                return `${this.supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`;
            } catch (error) {
                console.error("Failed to upload to Supabase, falling back to local storage:", error);
            }
        }

        // Fallback: Local Storage
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Ensure safe filename without paths
        const safeFileName = path.basename(fileName);
        const filePath = path.join(uploadDir, safeFileName);
        fs.writeFileSync(filePath, file);

        return `/uploads/${safeFileName}`;
    }

    async deleteFile(filePath: string, bucket: string = "sops"): Promise<void> {
        if (this.supabaseKey && filePath.includes(this.supabaseUrl)) {
            // Extract filename from URL
            const urlParts = filePath.split(`/public/${bucket}/`);
            if (urlParts.length > 1) {
                const fileName = urlParts[1];
                const deleteUrl = `${this.supabaseUrl}/storage/v1/object/${bucket}/${fileName}`;
                try {
                    const response = await fetch(deleteUrl, {
                        method: "DELETE",
                        headers: {
                            "Authorization": `Bearer ${this.supabaseKey}`
                        }
                    });
                    if (!response.ok) {
                        console.error(`Failed to delete from Supabase: ${response.statusText}`);
                    }
                    return;
                } catch (error) {
                    console.error("Failed to delete from Supabase:", error);
                }
            }
        }

        // Fallback: Local delete
        if (filePath.startsWith("/uploads/")) {
            const fileName = path.basename(filePath);
            const localPath = path.join(process.cwd(), "public", "uploads", fileName);
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
            }
        }
    }
}

try {
    ServiceLocator.resolve("IFileStorageService");
} catch {
    ServiceLocator.register("IFileStorageService", new SupabaseStorageService());
}
