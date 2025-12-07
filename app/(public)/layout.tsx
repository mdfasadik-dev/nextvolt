import { PublicNav } from "@/components/public/public-nav";
import { Footer } from "@/components/public/footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <div className="print:hidden">
                <PublicNav />
            </div>
            <main className="min-h-screen flex-1 flex flex-col items-center w-full">{children}</main>
            <div className="print:hidden">
                <Footer />
            </div>
        </>
    );
}

