"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
    LoadGroupWithItems,
    MetaFieldWithOptions,
    RuleWithRelations,
} from "@/lib/services/loadCalculatorService";
import { LoadGroupsTab } from "./load-groups-tab";
import { MetaFieldsTab } from "./meta-fields-tab";
import { RulesTab } from "./rules-tab";

export function CalculatorClient({
    groups,
    fields,
    rules,
}: {
    groups: LoadGroupWithItems[];
    fields: MetaFieldWithOptions[];
    rules: RuleWithRelations[];
}) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Load Calculator</h1>
                <p className="text-sm text-muted-foreground">
                    Configure the loads, the extra inputs, and which products get suggested.
                </p>
            </div>

            <Tabs defaultValue="loads">
                <TabsList>
                    <TabsTrigger value="loads">Groups &amp; Loads</TabsTrigger>
                    <TabsTrigger value="fields">Calculator Fields</TabsTrigger>
                    <TabsTrigger value="rules">Suggestion Rules</TabsTrigger>
                </TabsList>
                <TabsContent value="loads" className="pt-4">
                    <LoadGroupsTab groups={groups} />
                </TabsContent>
                <TabsContent value="fields" className="pt-4">
                    <MetaFieldsTab fields={fields} />
                </TabsContent>
                <TabsContent value="rules" className="pt-4">
                    <RulesTab rules={rules} fields={fields} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
