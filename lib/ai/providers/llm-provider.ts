export interface ILlmProvider {
    /**
     * Generates a text response from the LLM.
     * @param prompt The main user question or request.
     * @param systemInstruction The system instructions for character/context constraints.
     * @param image Optional base64 or public image URL for multimodal input.
     * @returns The generated string content.
     */
    generateText(prompt: string, systemInstruction?: string, image?: string): Promise<string>;
}
