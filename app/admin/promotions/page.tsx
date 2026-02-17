import { getAllPromotions } from '@/lib/data/promotions';
import { Tables } from '@/lib/types/supabase';
import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarClock, Plus, SquarePen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TYPE_GROUPS: Array<{
    key: Tables<'promotions'>['type'];
    label: string;
    description: string;
}> = [
    { key: 'hero', label: 'Hero', description: 'Homepage hero sections' },
    { key: 'carousel', label: 'Carousel', description: 'Multi-slide promo rows' },
    { key: 'banner', label: 'Banner', description: 'Wide strip announcements' },
    { key: 'popup', label: 'Popup', description: 'Modal promotional campaigns' },
    { key: 'custom', label: 'Custom', description: 'Flexible custom placements' },
];

function getScheduleText(promo: Tables<'promotions'>) {
    const start = promo.start_at ? format(new Date(promo.start_at), 'MMM d, yyyy') : 'Now';
    const end = promo.end_at ? format(new Date(promo.end_at), 'MMM d, yyyy') : 'Forever';
    return `${start} - ${end}`;
}

export default async function PromotionsPage() {
    const { data: promotions } = await getAllPromotions(1, 100);
    const allPromotions = promotions ?? [];

    const groupedPromotions = TYPE_GROUPS.map((group) => ({
        ...group,
        promotions: allPromotions.filter((promo) => promo.type === group.key),
    })).filter((group) => group.promotions.length > 0);

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Promotions</h2>
                <Button asChild>
                    <Link href="/admin/promotions/new">
                        <Plus className="mr-2 h-4 w-4" /> Create Promotion
                    </Link>
                </Button>
            </div>

            {groupedPromotions.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <p className="text-sm text-muted-foreground">No promotions found.</p>
                    </CardContent>
                </Card>
            ) : (
                groupedPromotions.map((group) => (
                    <Card key={group.key} className="overflow-hidden">
                        <CardHeader className="border-b bg-muted/20 py-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base">{group.label}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{group.description}</p>
                                </div>
                                <Badge variant="secondary">{group.promotions.length}</Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="grid gap-3 p-4 md:grid-cols-2 2xl:grid-cols-3">
                            {group.promotions.map((promo) => (
                                <article
                                    key={promo.id}
                                    className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 space-y-1">
                                            <p className="truncate font-semibold">{promo.title || 'Untitled campaign'}</p>
                                            {promo.description ? (
                                                <p className="line-clamp-2 text-xs text-muted-foreground">{promo.description}</p>
                                            ) : null}
                                        </div>

                                        <Button
                                            asChild
                                            variant="ghost"
                                            size="icon"
                                            title="Edit promotion"
                                            aria-label="Edit promotion"
                                            className="shrink-0"
                                        >
                                            <Link href={`/admin/promotions/${promo.id}`}>
                                                <SquarePen className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2">
                                        <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                                            {promo.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                        <Badge variant="outline" className="capitalize">{promo.type}</Badge>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                        <CalendarClock className="h-3.5 w-3.5" />
                                        <span>{getScheduleText(promo)}</span>
                                    </div>
                                </article>
                            ))}
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}
