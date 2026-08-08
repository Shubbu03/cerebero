export const itemQueryKey = (itemId: string) =>
  ['items', 'detail', itemId] as const
