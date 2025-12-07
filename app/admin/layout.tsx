import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export const dynamic = "force-dynamic"; // ensure fresh auth

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth gate (server-side)
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect("/auth/login");

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Sidebar (desktop) & mobile drawer handler lives inside <Sidebar /> */}
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar />
        <main className="flex-1 pt-16 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
