import {
  createTagInputSchema,
  itemViewSchema,
  renameTagInputSchema,
  tagViewSchema,
  type CreateTagInput,
  type ItemView,
  type RenameTagInput,
  type TagList,
  type TagView,
} from '@cerebero/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '../../../lib/api-client'
import {
  invalidateLibraryItemLists,
  writeItemCaches,
} from '../../items/data-access/item-cache'
import { parseTagMutationError } from './parse-tag-mutation-error'
import { tagsQueryKey } from './tags-query-key'

function sortTags(tags: TagView[]): TagView[] {
  return [...tags].sort(
    (left, right) =>
      left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }) ||
      left.id.localeCompare(right.id),
  )
}

function upsertTagList(current: TagList | undefined, tag: TagView): TagList {
  const tags = current?.tags ?? []
  const without = tags.filter((entry) => entry.id !== tag.id)
  return { tags: sortTags([...without, tag]) }
}

function removeTagFromList(
  current: TagList | undefined,
  tagId: string,
): TagList {
  return {
    tags: (current?.tags ?? []).filter((tag) => tag.id !== tagId),
  }
}

async function createTag(input: CreateTagInput): Promise<TagView> {
  try {
    const response = await apiClient.post(
      '/tags',
      createTagInputSchema.parse(input),
    )
    return tagViewSchema.parse(response.data)
  } catch (error) {
    throw parseTagMutationError(error)
  }
}

async function renameTag(
  tagId: string,
  input: RenameTagInput,
): Promise<TagView> {
  try {
    const response = await apiClient.patch(
      `/tags/${encodeURIComponent(tagId)}`,
      renameTagInputSchema.parse(input),
    )
    return tagViewSchema.parse(response.data)
  } catch (error) {
    throw parseTagMutationError(error)
  }
}

async function deleteTag(tagId: string): Promise<void> {
  try {
    await apiClient.delete(`/tags/${encodeURIComponent(tagId)}`)
  } catch (error) {
    throw parseTagMutationError(error)
  }
}

async function attachTag(itemId: string, tagId: string): Promise<ItemView> {
  try {
    const response = await apiClient.put(
      `/items/${encodeURIComponent(itemId)}/tags/${encodeURIComponent(tagId)}`,
    )
    return itemViewSchema.parse(response.data)
  } catch (error) {
    throw parseTagMutationError(error)
  }
}

async function detachTag(itemId: string, tagId: string): Promise<ItemView> {
  try {
    const response = await apiClient.delete(
      `/items/${encodeURIComponent(itemId)}/tags/${encodeURIComponent(tagId)}`,
    )
    return itemViewSchema.parse(response.data)
  } catch (error) {
    throw parseTagMutationError(error)
  }
}

export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTag,
    onSuccess: (tag) => {
      queryClient.setQueryData<TagList>(tagsQueryKey, (current) =>
        upsertTagList(current, tag),
      )
    },
  })
}

export function useRenameTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ input, tagId }: { input: RenameTagInput; tagId: string }) =>
      renameTag(tagId, input),
    onSuccess: (tag) => {
      queryClient.setQueryData<TagList>(tagsQueryKey, (current) =>
        upsertTagList(current, tag),
      )
      invalidateLibraryItemLists(queryClient)
      void queryClient.invalidateQueries({
        queryKey: ['items', 'detail'],
        refetchType: 'active',
      })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTag,
    onSuccess: (_result, tagId) => {
      queryClient.setQueryData<TagList>(tagsQueryKey, (current) =>
        removeTagFromList(current, tagId),
      )
      invalidateLibraryItemLists(queryClient)
      void queryClient.invalidateQueries({
        queryKey: ['items', 'detail'],
        refetchType: 'active',
      })
    },
  })
}

export function useAttachTag(itemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tagId: string) => attachTag(itemId, tagId),
    onSuccess: (item) => {
      writeItemCaches(queryClient, item)
      invalidateLibraryItemLists(queryClient)
    },
  })
}

export function useDetachTag(itemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tagId: string) => detachTag(itemId, tagId),
    onSuccess: (item) => {
      writeItemCaches(queryClient, item)
      invalidateLibraryItemLists(queryClient)
    },
  })
}
