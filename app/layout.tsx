import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ComponentsProvider } from "@/lib/components-context";
import { ChatProvider } from "@/lib/chat-context";
import { ChatWidget } from "@/components/chat/chat-widget";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CMMS Pro - Maintenance System",
  description: "Next Gen Maintenance Management",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ComponentsProvider>
            <ChatProvider>
              <TooltipProvider>
                {children}
                <ChatWidget />
                <Toaster />
              </TooltipProvider>
            </ChatProvider>
          </ComponentsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
