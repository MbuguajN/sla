/**
 * Board completion policy.
 *
 * Kept free of server-only imports so the client can disable a control with the
 * exact message the server would throw, instead of restating the rules and
 * drifting from them.
 */

export type CompletionCard = {
  assignedToUserId?: number | null;
  checklistItems?: { isDone: boolean }[];
};

export type CompletionItem = {
  assignedUserId?: number | null;
};

/**
 * Why this card cannot be marked done by `userId`, or null if it can.
 */
export function cardCompletionBlocker(
  card: CompletionCard,
  userId: number
): string | null {
  if (!card.assignedToUserId) {
    return "Card must be assigned before marking as done";
  }

  if (card.assignedToUserId !== userId) {
    return "Only the assigned member can mark this card as done";
  }

  const items = card.checklistItems ?? [];
  if (items.length > 0 && !items.every((item) => item.isDone)) {
    return "All checklist items must be completed before marking this card as done";
  }

  return null;
}

/**
 * Why this checklist item cannot be ticked by `userId`, or null if it can.
 */
export function checklistItemCompletionBlocker(
  item: CompletionItem,
  userId: number
): string | null {
  if (!item.assignedUserId) {
    return "Assign this item to someone before marking it done";
  }

  if (item.assignedUserId !== userId) {
    return "Only the assigned person can mark this item as done";
  }

  return null;
}
