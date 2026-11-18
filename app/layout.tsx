import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ComponentsProvider } from "@/lib/components-context";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationsProvider } from "@/lib/notifications-context";
import { PlantProvider } from "@/lib/plant-context";
import { SWRegister } from "@/components/pwa/sw-register";

export const metadata: Metadata = {
  title: "FITT CMMS",
  description: "Gestione della manutenzione: asset, ordini di lavoro, preventiva, magazzino e KPI.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101214",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="antialiased">
        <AuthProvider>
          <PlantProvider>
            <NotificationsProvider>
              <ComponentsProvider>
                <TooltipProvider>
                  {children}
                  <Toaster />
                  <SWRegister />
                </TooltipProvider>
              </ComponentsProvider>
            </NotificationsProvider>
          </PlantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
