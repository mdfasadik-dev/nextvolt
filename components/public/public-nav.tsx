import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Image from "next/image";
import { StoreService } from "@/lib/services/storeService";
import { CategoryMenu } from "./category-menu";
import { CategoryTopBar } from "./category-top-bar";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { ProductSearchBar } from "@/components/search/product-search-bar";

export async function PublicNav() {
    const store = await StoreService.getFirst();
    return (
        <div className="sticky top-0 z-50 w-full">
            <nav className="relative z-20 w-full flex justify-center border-b border-b-foreground/10 h-16 backdrop-blur supports-[backdrop-filter]:bg-background/70">
                <div className="w-full max-w-6xl flex items-center gap-4 px-4 text-sm">
                    <div className="flex items-center gap-4 font-semibold shrink-0">
                        <CategoryMenu />
                        <Link href="/" className="flex items-center gap-2">
                            {store?.logo_light_mode || store?.logo_dark_mode ? (
                                <>
                                    {store.logo_light_mode && <Image src={store.logo_light_mode} alt={store.name} width={128} height={32} className="h-8 w-auto dark:hidden" />}
                                    {store.logo_dark_mode && <Image src={store.logo_dark_mode} alt={store.name} width={128} height={32} className="h-8 w-auto hidden dark:block" />}
                                </>
                            ) : <span>{store?.name || 'Store'}</span>}
                        </Link>
                    </div>
                    <div className="flex-1 hidden md:flex justify-center">
                        <ProductSearchBar className="w-full max-w-xl" />
                    </div>
                    <div className="flex items-center gap-4 ms-auto">
                        <CartDrawer />
                        <ThemeSwitcher />
                    </div>
                </div>
            </nav>
            <CategoryTopBar />
        </div>
    );
}
