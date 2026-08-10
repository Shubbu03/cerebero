import {
  publicSharedItemSchema,
  shareLinkCreatedSchema,
  shareLinkStatusSchema,
  type PublicSharedItem,
  type ShareLinkCreated,
  type ShareLinkStatus,
} from '@cerebero/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { itemShareQueryKey } from './share-query-key'

async function readShareStatus(itemId: string): Promise<ShareLinkStatus> {
  const response = await apiClient.get(
    `/items/${encodeURIComponent(itemId)}/share`,
  )
  return shareLinkStatusSchema.parse(response.data)
}

async function createShare(itemId: string): Promise<ShareLinkCreated> {
  const response = await apiClient.post(
    `/items/${encodeURIComponent(itemId)}/share`,
  )
  return shareLinkCreatedSchema.parse(response.data)
}

async function rotateShare(itemId: string): Promise<ShareLinkCreated> {
  const response = await apiClient.post(
    `/items/${encodeURIComponent(itemId)}/share/rotate`,
  )
  return shareLinkCreatedSchema.parse(response.data)
}

async function revokeShare(itemId: string): Promise<void> {
  await apiClient.delete(`/items/${encodeURIComponent(itemId)}/share`)
}

export function useItemShareStatus(itemId: string, enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: () => readShareStatus(itemId),
    queryKey: itemShareQueryKey(itemId),
  })
}

export function useCreateShare(itemId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => createShare(itemId),
    onSuccess: (created) => {
      queryClient.setQueryData(itemShareQueryKey(itemId), {
        active: true,
        createdAt: created.createdAt,
      } satisfies ShareLinkStatus)
    },
  })
}

export function useRotateShare(itemId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => rotateShare(itemId),
    onSuccess: (created) => {
      queryClient.setQueryData(itemShareQueryKey(itemId), {
        active: true,
        createdAt: created.createdAt,
      } satisfies ShareLinkStatus)
    },
  })
}

export function useRevokeShare(itemId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => revokeShare(itemId),
    onSuccess: () => {
      queryClient.setQueryData(itemShareQueryKey(itemId), {
        active: false,
        createdAt: null,
      } satisfies ShareLinkStatus)
    },
  })
}

export async function readPublicSharedItem(
  token: string,
): Promise<PublicSharedItem> {
  try {
    const response = await apiClient.get(
      `/public/shares/${encodeURIComponent(token)}`,
    )
    return publicSharedItemSchema.parse(response.data)
  } catch (error) {
    throw new Error('unavailable', { cause: error })
  }
}
