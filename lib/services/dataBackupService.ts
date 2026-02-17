import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

export const BACKUP_TABLES = [
    "categories",
    "attributes",
    "category_attributes",
    "products",
    "product_images",
    "product_badges",
    "product_variants",
    "product_attribute_values",
    "inventory",
    "orders",
    "order_items",
    "stores",
    "delivery",
    "delivery_weight_rules",
    "charge_options",
    "coupons",
    "order_charges",
    "promotions",
    "promotion_items",
    "content_pages",
] as const;

type BackupTable = (typeof BACKUP_TABLES)[number];
type RowData = Record<string, unknown>;
type SnapshotTables = Record<BackupTable, RowData[]>;

const IMPORT_ORDER: BackupTable[] = [
    "categories",
    "attributes",
    "stores",
    "delivery",
    "content_pages",
    "charge_options",
    "coupons",
    "promotions",
    "orders",
    "products",
    "product_images",
    "product_badges",
    "product_variants",
    "product_attribute_values",
    "delivery_weight_rules",
    "inventory",
    "category_attributes",
    "order_items",
    "order_charges",
    "promotion_items",
];

const CLEAR_ORDER: BackupTable[] = [
    "promotion_items",
    "order_charges",
    "order_items",
    "inventory",
    "product_attribute_values",
    "product_variants",
    "product_badges",
    "product_images",
    "products",
    "category_attributes",
    "promotions",
    "orders",
    "coupons",
    "charge_options",
    "delivery_weight_rules",
    "delivery",
    "content_pages",
    "stores",
    "attributes",
    "categories",
];

const CONFLICT_KEYS: Record<BackupTable, string> = {
    categories: "id",
    attributes: "id",
    category_attributes: "category_id,attribute_id",
    products: "id",
    product_images: "id",
    product_badges: "id",
    product_variants: "id",
    product_attribute_values: "id",
    inventory: "id",
    orders: "id",
    order_items: "id",
    stores: "id",
    delivery: "id",
    delivery_weight_rules: "id",
    charge_options: "id",
    coupons: "id",
    order_charges: "id",
    promotions: "id",
    promotion_items: "id",
    content_pages: "id",
};

const DELETE_FILTER_COLUMN: Record<BackupTable, string> = {
    categories: "id",
    attributes: "id",
    category_attributes: "category_id",
    products: "id",
    product_images: "id",
    product_badges: "id",
    product_variants: "id",
    product_attribute_values: "id",
    inventory: "id",
    orders: "id",
    order_items: "id",
    stores: "id",
    delivery: "id",
    delivery_weight_rules: "id",
    charge_options: "id",
    coupons: "id",
    order_charges: "id",
    promotions: "id",
    promotion_items: "id",
    content_pages: "id",
};

const ORDER_BY_COLUMN: Record<BackupTable, string> = {
    categories: "id",
    attributes: "id",
    category_attributes: "category_id",
    products: "id",
    product_images: "id",
    product_badges: "id",
    product_variants: "id",
    product_attribute_values: "id",
    inventory: "id",
    orders: "id",
    order_items: "id",
    stores: "id",
    delivery: "id",
    delivery_weight_rules: "id",
    charge_options: "id",
    coupons: "id",
    order_charges: "id",
    promotions: "id",
    promotion_items: "id",
    content_pages: "id",
};

const EXPORT_PAGE_SIZE = 1000;
const IMPORT_BATCH_SIZE = 500;

export interface DataBackupSnapshot {
    version: 1;
    exportedAt: string;
    tables: SnapshotTables;
}

export interface DataImportSummary {
    importedAt: string;
    mode: "replace";
    tableCounts: Record<BackupTable, number>;
}

function assertObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStringId(row: RowData) {
    return typeof row.id === "string" && row.id.length > 0;
}

function normalizeTables(input: unknown): SnapshotTables {
    if (!assertObject(input)) {
        throw new Error("Backup payload is invalid.");
    }

    const output = {} as SnapshotTables;
    for (const table of BACKUP_TABLES) {
        const rawRows = input[table];
        if (rawRows == null) {
            output[table] = [];
            continue;
        }
        if (!Array.isArray(rawRows)) {
            throw new Error(`Backup payload has invalid table data for '${table}'.`);
        }
        output[table] = rawRows.map(row => {
            if (!assertObject(row)) {
                throw new Error(`Backup payload has non-object row in '${table}'.`);
            }
            return row;
        });
    }

    return output;
}

export class DataBackupService {
    static async exportAll(): Promise<DataBackupSnapshot> {
        const supabase = await createAdminClient();
        const tables = {} as SnapshotTables;

        for (const table of BACKUP_TABLES) {
            const rows: RowData[] = [];
            let from = 0;

            while (true) {
                const to = from + EXPORT_PAGE_SIZE - 1;
                const query = supabase
                    .from(table)
                    .select("*")
                    .order(ORDER_BY_COLUMN[table], { ascending: true })
                    .range(from, to);
                const { data, error } = await query;

                if (error) {
                    throw new Error(`Failed to export '${table}': ${error.message}`);
                }

                const batch = ((data || []) as RowData[]);
                rows.push(...batch);
                if (batch.length < EXPORT_PAGE_SIZE) break;
                from += EXPORT_PAGE_SIZE;
            }

            tables[table] = rows;
        }

        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            tables,
        };
    }

    static async importAll(snapshotInput: unknown): Promise<DataImportSummary> {
        const supabase = await createAdminClient();
        if (!assertObject(snapshotInput)) {
            throw new Error("Backup payload is invalid.");
        }
        if (snapshotInput.version !== 1) {
            throw new Error("Unsupported backup version.");
        }
        const tables = normalizeTables(snapshotInput.tables);

        for (const table of CLEAR_ORDER) {
            const key = DELETE_FILTER_COLUMN[table];
            const { error } = await supabase
                .from(table)
                .delete()
                .not(key, "is", null);
            if (error) {
                throw new Error(`Failed to clear '${table}': ${error.message}`);
            }
        }

        const counts = {} as Record<BackupTable, number>;
        for (const table of IMPORT_ORDER) {
            const rows = tables[table];
            if (!rows.length) {
                counts[table] = 0;
                continue;
            }

            if (table === "categories") {
                const imported = await this.importCategories(supabase, rows);
                counts[table] = imported;
                continue;
            }

            const imported = await this.upsertRows(supabase, table, rows);
            counts[table] = imported;
        }

        return {
            importedAt: new Date().toISOString(),
            mode: "replace",
            tableCounts: counts,
        };
    }

    private static async importCategories(supabase: Awaited<ReturnType<typeof createAdminClient>>, rows: RowData[]) {
        const withId = rows.filter(hasStringId);
        const withoutId = rows.filter(row => !hasStringId(row));
        const pending = new Map(withId.map(row => [String(row.id), row]));
        const resolved = new Set<string>();
        let imported = 0;

        while (pending.size > 0) {
            const batch: RowData[] = [];
            for (const row of pending.values()) {
                const parentId = typeof row.parent_id === "string" ? row.parent_id : null;
                if (!parentId || resolved.has(parentId) || !pending.has(parentId)) {
                    batch.push(row);
                }
            }

            if (batch.length === 0) {
                throw new Error("Categories import failed due to unresolved parent references.");
            }

            imported += await this.upsertRows(supabase, "categories", batch);
            for (const row of batch) {
                const id = String(row.id);
                resolved.add(id);
                pending.delete(id);
            }
        }

        if (withoutId.length > 0) {
            imported += await this.upsertRows(supabase, "categories", withoutId);
        }

        return imported;
    }

    private static async upsertRows(
        supabase: Awaited<ReturnType<typeof createAdminClient>>,
        table: BackupTable,
        rows: RowData[],
    ) {
        let imported = 0;
        for (let i = 0; i < rows.length; i += IMPORT_BATCH_SIZE) {
            const chunk = rows.slice(i, i + IMPORT_BATCH_SIZE);
            const { error } = await supabase
                .from(table)
                .upsert(chunk, { onConflict: CONFLICT_KEYS[table] });
            if (error) {
                throw new Error(`Failed to import '${table}': ${error.message}`);
            }
            imported += chunk.length;
        }
        return imported;
    }
}
