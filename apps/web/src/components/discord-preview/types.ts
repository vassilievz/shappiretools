import type { ComponentNode, Json } from '../../features/discord/model'

export type PreviewSelection = {
  selected: string
  onSelect: (key: string) => void
}

export type ComponentPreviewProps = PreviewSelection & {
  node: ComponentNode
}

export type MediaItem = {
  url: string
  description: string
  spoiler: boolean
}

export const mediaUrl = (value: Json | undefined) => String(value?.url ?? '').trim()

export const toAccentColor = (value: unknown) => typeof value === 'number'
  ? `#${Math.max(0, Math.min(0xffffff, value)).toString(16).padStart(6, '0')}`
  : undefined
