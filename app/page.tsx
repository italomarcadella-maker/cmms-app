import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    // Redirect based on role or default to work-orders
    // Adjust this logic if you want different landing pages for different roles
    // For now, consistent dashboard landing seems best.
    console.log("Root page redirecting to /work-orders");
    redirect("/work-orders");
}
