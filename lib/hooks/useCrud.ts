"use client";
import { useTransition, useState, useCallback } from "react";

type CrudAction<TPayload, TResult> = (payload: TPayload) => Promise<TResult>;

export interface UseCrudOptions<TRecord> {
    listAction: () => Promise<TRecord[]>;
    createAction: CrudAction<Partial<TRecord>, TRecord | null>;
    updateAction: CrudAction<Partial<TRecord>, TRecord | null>;
    deleteAction: CrudAction<{ id: string }, { id: string } | null>;
    initialData: TRecord[];
}

export function useCrud<TRecord extends { id: string }>(options: UseCrudOptions<TRecord>) {
    const { listAction, createAction, updateAction, deleteAction, initialData } = options;
    const [records, setRecords] = useState<TRecord[]>(initialData);
    // isTransitionPending covers list reloads (refresh). We add a separate counter for mutations.
    const [isTransitionPending, startTransition] = useTransition();
    const [mutationCount, setMutationCount] = useState(0);
    const isPending = isTransitionPending || mutationCount > 0;
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(() => {
        startTransition(async () => {
            try {
                const list = await listAction();
                setRecords(list);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load");
            }
        });
    }, [listAction]);

    const create = useCallback(async (data: Partial<TRecord>) => {
        setError(null);
        setMutationCount(c => c + 1);
        try {
            const res = await createAction(data);
            if (res) setRecords(prev => [res as TRecord, ...prev]);
            return res;
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Create failed";
            setError(msg);
            throw e;
        } finally {
            setMutationCount(c => c - 1);
        }
    }, [createAction]);

    const update = useCallback(async (data: Partial<TRecord>) => {
        setError(null);
        setMutationCount(c => c + 1);
        try {
            const res = await updateAction(data);
            if (res) setRecords(prev => prev.map(r => r.id === res.id ? res as TRecord : r));
            return res;
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Update failed";
            setError(msg);
            throw e;
        } finally {
            setMutationCount(c => c - 1);
        }
    }, [updateAction]);

    const remove = useCallback(async (id: string) => {
        setError(null);
        setMutationCount(c => c + 1);
        try {
            const res = await deleteAction({ id });
            if (res) setRecords(prev => prev.filter(r => r.id !== id));
            return res;
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Delete failed";
            setError(msg);
            throw e;
        } finally {
            setMutationCount(c => c - 1);
        }
    }, [deleteAction]);

    return { records, isPending, error, refresh, create, update, remove };
}
