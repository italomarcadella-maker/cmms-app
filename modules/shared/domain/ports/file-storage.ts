export interface IFileStorageService {
    /**
     * Uploads a file buffer to storage.
     * @param file The file content as a Buffer.
     * @param fileName The target name of the file.
     * @param mimeType The MIME type of the file.
     * @param bucket Optional bucket name (defaults to system setting).
     * @returns The public URL of the uploaded file.
     */
    uploadFile(file: Buffer, fileName: string, mimeType: string, bucket?: string): Promise<string>;

    /**
     * Deletes a file from storage.
     * @param filePath The public URL or path of the file to delete.
     * @param bucket Optional bucket name.
     */
    deleteFile(filePath: string, bucket?: string): Promise<void>;
}
