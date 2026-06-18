import { ILlmProvider } from "./llm-provider";
import OpenAI from "openai";

export class GeminiProvider implements ILlmProvider {
    private openai: OpenAI;
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || "dummy-key";
        this.openai = new OpenAI({
            apiKey: this.apiKey,
            baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
            dangerouslyAllowBrowser: true
        });
    }

    async generateText(prompt: string, systemInstruction?: string, image?: string): Promise<string> {
        if (this.apiKey === "dummy-key" || !this.apiKey) {
            throw new Error("Missing GEMINI_API_KEY");
        }

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
            model: "gemini-1.5-flash",
            messages: messages,
            temperature: 0.1
        });

        return completion.choices[0].message.content || "";
    }
}
