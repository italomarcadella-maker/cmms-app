import { ILlmProvider } from "./llm-provider";
import OpenAI from "openai";

export class OllamaProvider implements ILlmProvider {
    private openai: OpenAI;
    private model: string;

    constructor() {
        const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1/";
        this.model = process.env.OLLAMA_MODEL || "llama3.1";
        this.openai = new OpenAI({
            apiKey: "ollama",
            baseURL: baseUrl,
            dangerouslyAllowBrowser: true
        });
    }

    async generateText(prompt: string, systemInstruction?: string, image?: string): Promise<string> {
        const messages: any[] = [];
        if (systemInstruction) {
            messages.push({
                role: "system",
                content: systemInstruction
            });
        }

        messages.push({
            role: "user",
            content: image
                ? [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: image } }
                  ]
                : prompt
        });

        const completion = await this.openai.chat.completions.create({
            model: this.model,
            messages: messages,
            temperature: 0.1
        });

        return completion.choices[0].message.content || "";
    }
}
