"use server";
import { revalidatePath } from 'next/cache';
import { StoreService, StoreUpsertInput } from '@/lib/services/storeService';

export async function listStoresPaged(opts: { page: number; pageSize: number; search?: string }) {
    return StoreService.listPaged(opts);
}
export async function createStore(values: StoreUpsertInput) {
    const res = await StoreService.create(values);
    revalidatePath('/admin/settings');
    return res;
}
export async function updateStore(values: StoreUpsertInput & { id: string }) {
    const { id, ...rest } = values;
    const res = await StoreService.update(id, rest);
    revalidatePath('/admin/settings');
    return res;
}
export async function deleteStore({ id }: { id: string }) {
    await StoreService.remove(id);
    revalidatePath('/admin/settings');
}

export async function getStoreSingleton() {
    return StoreService.getFirst();
}

export async function upsertStoreSingleton(values: StoreUpsertInput) {
    const res = await StoreService.upsertSingleton(values);
    revalidatePath('/admin/settings');
    return res;
}
