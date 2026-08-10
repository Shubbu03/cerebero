import { itemIdSchema } from '@cerebero/contracts'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import {
  useAttachTag,
  useCreateTag,
  useDetachTag,
} from '../tags/data-access/use-tag-mutations'
import { useTagsQuery } from '../tags/data-access/use-tags-query'
import { ItemQueryError } from './data-access/item-query-error'
import { useItemAction } from './data-access/use-item-action'
import { useItemQuery } from './data-access/use-item-query'
import { useUpdateItem } from './data-access/use-update-item'
import { ItemDetailUiActions } from './ui/item-detail-ui-actions'
import { ItemDetailUiBody } from './ui/item-detail-ui-body'
import { ItemDetailUiConflict } from './ui/item-detail-ui-conflict'
import { ItemDetailUiEditForm } from './ui/item-detail-ui-edit-form'
import { ItemDetailUiHeader } from './ui/item-detail-ui-header'
import { ItemDetailUiLoading } from './ui/item-detail-ui-loading'
import { ItemSharePanel } from '../sharing/ui/item-share-panel'
import { ItemDetailUiTags } from './ui/item-detail-ui-tags'
import { ItemDetailUiUnavailable } from './ui/item-detail-ui-unavailable'

type ItemDetailFeatureEntryProps = {
  itemId: string
}

export function ItemDetailFeatureEntry({
  itemId,
}: ItemDetailFeatureEntryProps) {
  const parsedItemId = itemIdSchema.safeParse(itemId)
  if (!parsedItemId.success) {
    return <ItemDetailUiUnavailable canRetry={false} />
  }

  return (
    <ItemDetailFeatureItem itemId={parsedItemId.data} key={parsedItemId.data} />
  )
}

function ItemDetailFeatureItem({ itemId }: { itemId: string }) {
  const navigate = useNavigate()
  const itemQuery = useItemQuery(itemId)
  const updateItem = useUpdateItem(itemId)
  const itemAction = useItemAction(itemId)
  const tagsQuery = useTagsQuery()
  const createTag = useCreateTag()
  const attachTag = useAttachTag(itemId)
  const detachTag = useDetachTag(itemId)

  const [isEditing, setIsEditing] = useState(false)
  const [showConflict, setShowConflict] = useState(false)

  if (itemQuery.isPending) {
    return <ItemDetailUiLoading />
  }

  if (itemQuery.isError) {
    const canRetry =
      itemQuery.error instanceof ItemQueryError &&
      itemQuery.error.code !== 'not_found'

    return (
      <ItemDetailUiUnavailable
        canRetry={canRetry}
        isRetrying={itemQuery.isFetching}
        retry={() => void itemQuery.refetch()}
      />
    )
  }

  const item = itemQuery.data
  const tagsBusy =
    createTag.isPending || attachTag.isPending || detachTag.isPending

  return (
    <section
      aria-label="Item details"
      className="flex w-full flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12"
    >
      <ItemDetailUiHeader
        isEditing={isEditing}
        item={item}
        onStartEdit={() => {
          setShowConflict(false)
          setIsEditing(true)
        }}
      />

      {showConflict ? (
        <ItemDetailUiConflict
          isRefreshing={itemQuery.isFetching}
          onDismiss={() => setShowConflict(false)}
          onReload={() => {
            void itemQuery.refetch().then(() => {
              setShowConflict(false)
              setIsEditing(true)
            })
          }}
        />
      ) : null}

      {isEditing ? (
        <ItemDetailUiEditForm
          isSaving={updateItem.isPending}
          item={item}
          onCancel={() => setIsEditing(false)}
          onConflict={() => {
            setIsEditing(false)
            setShowConflict(true)
          }}
          onSaved={() => setIsEditing(false)}
          save={async (input) => updateItem.mutateAsync(input)}
        />
      ) : (
        <>
          <ItemDetailUiActions
            isActing={itemAction.isPending}
            item={item}
            onLeftLibrary={() => {
              void navigate({ to: '/library' })
            }}
            onPermanentlyDeleted={() => {
              void navigate({ to: '/trash' })
            }}
            runAction={async (command) => itemAction.mutateAsync(command)}
          />
          <ItemDetailUiBody
            item={item}
            tagsEditor={
              <div className="grid gap-4">
                <ItemDetailUiTags
                  attachTag={async (tagId) => attachTag.mutateAsync(tagId)}
                  createTag={async (name) => createTag.mutateAsync({ name })}
                  detachTag={async (tagId) => detachTag.mutateAsync(tagId)}
                  isBusy={tagsBusy}
                  item={item}
                  tags={tagsQuery.data?.tags ?? []}
                />
                <ItemSharePanel item={item} />
              </div>
            }
          />
        </>
      )}
    </section>
  )
}
