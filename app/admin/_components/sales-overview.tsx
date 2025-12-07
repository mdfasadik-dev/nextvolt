"use client";

import { useState, useTransition } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DatePickerWithRange } from "./date-range-picker";
import { DateRange } from "react-day-picker";
import { getDashboardChartData } from "../actions";
import { Loader2 } from "lucide-react";

interface SalesOverviewProps {
    data: { name: string; total: number }[];
    currencySymbol?: string;
}

export function SalesOverview({ data: initialData, currencySymbol = "$" }: SalesOverviewProps) {
    const [data, setData] = useState(initialData);
    const [isPending, startTransition] = useTransition();

    const handleDateChange = (range: DateRange | undefined) => {
        if (range?.from && range?.to) {
            startTransition(async () => {
                const newData = await getDashboardChartData(range.from!.toISOString(), range.to!.toISOString());
                setData(newData);
            });
        }
    };

    return (
        <Card className="col-span-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle>Sales Over Time</CardTitle>
                    <CardDescription>Recent sales performance across all channels.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <DatePickerWithRange onDateChange={handleDateChange} />
                </div>
            </CardHeader>
            <CardContent className="pl-2 pt-6">
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${currencySymbol}${value}`}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
