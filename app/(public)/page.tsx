import { Hero } from '@/components/public/hero';
import { CategoriesSection } from '@/components/public/categories-section';
import { CategoriesSectionSkeleton } from '@/components/public/categories-section-skeleton';
import { Suspense } from 'react';
import { BentoGrid } from '@/components/public/bento-grid';
import { FeaturedProducts } from '@/components/public/featured-products';
import { FeaturedProductsSkeleton } from '@/components/public/featured-products-skeleton';


export default async function Home() {
    return (
        <main className="min-h-screen w-full flex flex-col">
            <Hero />
            <section id='categories' className="w-full max-w-6xl mx-auto flex-1 p-6 flex flex-col gap-16 scroll-mt-28">
                <Suspense fallback={<CategoriesSectionSkeleton />}>
                    <CategoriesSection />
                </Suspense>
            </section>

            <section id='featured' className="w-full max-w-6xl mx-auto flex-1 p-6 flex flex-col gap-16 scroll-mt-28">
                <Suspense fallback={<FeaturedProductsSkeleton />}>
                    <FeaturedProducts />
                </Suspense>
            </section>
            <section id='features' className="w-full max-w-6xl mx-auto flex-1 p-6 flex flex-col gap-16 scroll-mt-28">
                <BentoGrid />
            </section>
        </main>
    );
}
