"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from "sonner";

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    placeholder?: string;
    className?: string;
    isListening?: boolean;
    onListeningChange?: (isListening: boolean) => void;
}

export function VoiceInput({ onTranscript, placeholder = "Parla ora...", className, isListening: externalIsListening, onListeningChange }: VoiceInputProps) {
    const [listening, setListening] = useState(false);
    const [supported, setSupported] = useState(true);
    const recognitionRef = useRef<any>(null);

    // Sync with external state if provided
    useEffect(() => {
        if (typeof externalIsListening !== 'undefined' && externalIsListening !== listening) {
            if (externalIsListening) startListening();
            else stopListening();
        }
    }, [externalIsListening]);

    useEffect(() => {
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false; // Stop after one sentence/pause
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'it-IT'; // Italian by default

            recognitionRef.current.onstart = () => {
                setListening(true);
                onListeningChange?.(true);
            };

            recognitionRef.current.onend = () => {
                setListening(false);
                onListeningChange?.(false);
            };

            recognitionRef.current.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result) => result.transcript)
                    .join('');
                
                if (event.results[0].isFinal) {
                    onTranscript(transcript);
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setListening(false);
                onListeningChange?.(false);
                if (event.error === 'not-allowed') {
                    toast.error("Accesso al microfono negato.");
                }
            };
        } else {
            setSupported(false);
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onTranscript, onListeningChange]);

    const startListening = () => {
        if (recognitionRef.current && !listening) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Start error", e);
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && listening) {
            recognitionRef.current.stop();
        }
    };

    const toggleListening = () => {
        if (listening) stopListening();
        else startListening();
    };

    if (!supported) return null;

    return (
        <Button
            type="button"
            variant={listening ? "destructive" : "secondary"}
            size="icon"
            className={cn("transition-all duration-200", listening && "animate-pulse ring-2 ring-red-500", className)}
            onClick={toggleListening}
            title={listening ? "Interrompi dettatura" : "Avvia dettatura vocale"}
        >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            <span className="sr-only">{listening ? 'Stop' : 'Parla'}</span>
        </Button>
    );
}
