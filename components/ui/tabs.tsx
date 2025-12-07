"use client";
import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
    value: string;
    setValue: (v: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
    defaultValue: string;
    value?: string;
    onValueChange?: (value: string) => void;
}

export function Tabs({ defaultValue, value: valueProp, onValueChange, className, children, ...rest }: TabsProps) {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const isControlled = valueProp !== undefined;
    const value = isControlled ? (valueProp as string) : internalValue;

    const setValue = React.useCallback(
        (next: string) => {
            if (!isControlled) setInternalValue(next);
            onValueChange?.(next);
        },
        [isControlled, onValueChange],
    );

    React.useEffect(() => {
        if (isControlled && valueProp !== undefined) {
            setInternalValue(valueProp);
        }
    }, [isControlled, valueProp]);

    return (
        <TabsContext.Provider value={{ value, setValue }}>
            <div className={cn("tabs-root", className)} {...rest}>
                {children}
            </div>
        </TabsContext.Provider>
    );
}

export function TabsList({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
    return <div role="tablist" className={cn('inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground', className)} {...rest}>{children}</div>;
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { value: string; }
export function TabsTrigger({ value, className, children, ...rest }: TabsTriggerProps) {
    const ctx = React.useContext(TabsContext); if (!ctx) throw new Error('TabsTrigger must be used within Tabs');
    const selected = ctx.value === value;
    return (
        <button
            role="tab"
            type="button"
            aria-selected={selected}
            data-state={selected ? 'active' : 'inactive'}
            onClick={() => ctx.setValue(value)}
            className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow', className)} {...rest}
        >{children}</button>
    );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> { value: string; }
export function TabsContent({ value, className, children, ...rest }: TabsContentProps) {
    const ctx = React.useContext(TabsContext); if (!ctx) throw new Error('TabsContent must be used within Tabs');
    const selected = ctx.value === value;
    if (!selected) return null;
    return <div role="tabpanel" data-state={selected ? 'active' : 'inactive'} className={cn('mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className)} {...rest}>{children}</div>;
}
