import { ThemeSwitcher } from "@/components/theme-switcher";
import { AuthButton } from "@/components/auth-button";
import Link from "next/link";
import { StoreService } from "@/lib/services/storeService";
import Image from "next/image";

export async function Topbar() {
    const store = await StoreService.getFirst();
    return (
        <div className="hidden md:flex h-16 items-center gap-4 border-b bg-background/70 backdrop-blur px-6">
            <Link href="/" className="flex items-center gap-3 font-semibold">
                {store?.logo_light_mode || store?.logo_dark_mode ? (
                    <>
                        {store.logo_light_mode && <Image src={store.logo_light_mode} alt={store.name} width={120} height={32} className="h-6 w-auto dark:hidden" />}
                        {store.logo_dark_mode && <Image src={store.logo_dark_mode} alt={store.name} width={120} height={32} className="h-6 w-auto hidden dark:block" />}
                        {!store.logo_light_mode && !store.logo_dark_mode && <span>{store.name}</span>}
                    </>
                ) : <span>{store?.name || 'Store'}</span>}
            </Link>
            <div className="ms-auto flex gap-4 items-center">
                <ThemeSwitcher />
                <AuthButton />
            </div>
        </div>
    );
}
