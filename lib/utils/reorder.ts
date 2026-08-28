/**
 * Move an item to a new position given a drop target and which half of that
 * target the pointer was over. Shared by the admin drag-and-drop lists so
 * categories, products and load calculator rows all behave identically.
 */
export function moveItemWithPlacement<T>(
    items: T[],
    fromIndex: number,
    toIndex: number,
    placement: "before" | "after",
): T[] {
    if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= items.length ||
        toIndex >= items.length ||
        fromIndex === toIndex
    ) {
        return items;
    }
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    let insertIndex = toIndex;
    if (fromIndex < toIndex) {
        insertIndex = placement === "before" ? toIndex - 1 : toIndex;
    } else {
        insertIndex = placement === "before" ? toIndex : toIndex + 1;
    }
    if (insertIndex < 0) insertIndex = 0;
    if (insertIndex > next.length) insertIndex = next.length;
    next.splice(insertIndex, 0, moved);
    return next;
}
