import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AssetsProvider } from "@/lib/assets-context";
import { WorkOrdersProvider } from "@/lib/work-orders-context";
import { ReferenceProvider } from "@/lib/reference-context";
import { PMProvider } from '@/lib/pm-context';
import { InventoryProvider } from "@/lib/inventory-context";
import { ChatProvider } from "@/lib/chat-context";
import { ChatWidget } from "@/components/chat/chat-widget";

import { getWorkOrders, getAssets } from "@/lib/actions";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const workOrders = await getWorkOrders();
    const assets = await getAssets();

    return (
        <AssetsProvider initialAssets={assets}>
            <WorkOrdersProvider initialWorkOrders={workOrders}>
                <InventoryProvider>
                    <ReferenceProvider>
                        <PMProvider>
                            <ChatProvider>
                                <div className="flex min-h-screen flex-col md:flex-row">
                                    <Sidebar />
                                    <div className="flex-1 flex flex-col min-h-screen">
                                        <Header />
                                        <main className="flex-1 bg-muted/40 p-4 md:p-8 overflow-y-auto">
                                            {children}
                                        </main>
                                    </div>
                                    <ChatWidget />

                                </div>
                            </ChatProvider>
                        </PMProvider>
                    </ReferenceProvider>
                </InventoryProvider>
            </WorkOrdersProvider>
        </AssetsProvider>
    );
}
