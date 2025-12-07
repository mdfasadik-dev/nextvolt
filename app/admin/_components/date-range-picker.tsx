"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
    className?: string;
    date?: DateRange;
    onDateChange?: (date: DateRange | undefined) => void;
}

export function DatePickerWithRange({
    className,
    date,
    onDateChange,
}: DateRangePickerProps) {
    const [internalDate, setInternalDate] = React.useState<DateRange | undefined>(date);

    React.useEffect(() => {
        setInternalDate(date);
    }, [date]);

    const handleSelect = (newDate: DateRange | undefined) => {
        setInternalDate(newDate);
        if (onDateChange) {
            onDateChange(newDate);
        }
    };

    const handlePresetChange = (value: string) => {
        const today = new Date();
        let newRange: DateRange | undefined;

        if (value === "today") {
            newRange = { from: today, to: today };
        } else if (value === "week") {
            const start = new Date(today);
            start.setDate(today.getDate() - 6);
            newRange = { from: start, to: today };
        } else if (value === "month") {
            const start = new Date(today);
            start.setDate(today.getDate() - 29);
            newRange = { from: start, to: today };
        }

        handleSelect(newRange);
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <div className="flex items-center gap-2">
                <Select onValueChange={handlePresetChange}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Quick Range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                    </SelectContent>
                </Select>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-[240px] justify-start text-left font-normal",
                                !internalDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {internalDate?.from ? (
                                internalDate.to ? (
                                    <>
                                        {format(internalDate.from, "LLL dd, y")} -{" "}
                                        {format(internalDate.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(internalDate.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={internalDate?.from}
                            selected={internalDate}
                            onSelect={handleSelect}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
