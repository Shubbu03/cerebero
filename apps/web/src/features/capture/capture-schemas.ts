import {
  MAX_ITEM_NOTE_LENGTH,
  MAX_ITEM_TITLE_LENGTH,
  MAX_ITEM_URL_LENGTH,
  type CaptureItemInput,
} from '@cerebero/contracts'
import { z } from 'zod'

function isHttpUrl(value: string) {
  if (!value) {
    return true
  }

  try {
    const url = new URL(value)
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

export const captureFormSchema = z
  .object({
    authoredTitle: z
      .string()
      .trim()
      .max(MAX_ITEM_TITLE_LENGTH, 'Title is too long.'),
    noteMarkdown: z.string().max(MAX_ITEM_NOTE_LENGTH, 'Note is too long.'),
    originalUrl: z
      .string()
      .trim()
      .max(MAX_ITEM_URL_LENGTH, 'URL is too long.')
      .refine(
        isHttpUrl,
        'Enter a valid HTTP or HTTPS URL without embedded credentials.',
      ),
  })
  .superRefine((input, context) => {
    if (!input.originalUrl && !input.noteMarkdown.trim()) {
      context.addIssue({
        code: 'custom',
        message: 'Add a URL or write a note.',
        path: ['originalUrl'],
      })
    }
  })

export type CaptureFormInput = z.infer<typeof captureFormSchema>

export function toCaptureItemInput(
  input: CaptureFormInput,
  allowDuplicate: boolean,
): CaptureItemInput {
  return {
    allowDuplicate,
    authoredTitle: input.authoredTitle || null,
    noteMarkdown: input.noteMarkdown.trim() ? input.noteMarkdown : null,
    originalUrl: input.originalUrl || null,
  }
}
