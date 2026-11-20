import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ComponentsProvider } from "@/lib/components-context";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationsProvider } from "@/lib/notifications-context";
import { PlantProvider } from "@/lib/plant-context";
import { SWRegister } from "@/components/pwa/sw-register";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LOCALE_INFO } from "@/lib/i18n/config";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return (
    <html lang={LOCALE_INFO[locale].html} suppressHydrationWarning>
      <body className="antialiased">
        <I18nProvider locale={locale} dictionary={dictionary}>
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
        </I18nProvider>
      </body>
    </html>
  );
}
