import { LoadCalculatorService } from "@/lib/services/loadCalculatorService";
import { CalculatorClient } from "./_components/calculator-client";

export const revalidate = 0;

export default async function AdminLoadCalculatorPage() {
    const [groups, fields, rules] = await Promise.all([
        LoadCalculatorService.listGroupsAdmin(),
        LoadCalculatorService.listFieldsAdmin(),
        LoadCalculatorService.listRulesAdmin(),
    ]);
    return <CalculatorClient groups={groups} fields={fields} rules={rules} />;
}
