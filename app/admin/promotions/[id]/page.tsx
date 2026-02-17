import { getPromotionById } from '@/lib/data/promotions';
import { PromotionForm } from '../_components/PromotionForm';

interface PageProps {
    params: Promise<{ id: string }>;
}

// Ensure dynamic rendering to fetch fresh data
export const dynamic = 'force-dynamic';

export default async function PromotionEditPage({ params }: PageProps) {
    const { id } = await params;
    const isNew = id === 'new';
    const promotion = !isNew ? await getPromotionById(id).catch(() => null) : null;

    if (!isNew && !promotion) {
        return (
            <div className="flex-1 p-8 pt-6">
                <h2 className="text-2xl font-semibold">Promotion not found</h2>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 pt-6">
            <PromotionForm promotion={promotion} />
        </div>
    );
}
