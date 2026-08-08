export type Json = Record<string, unknown>

export type ComponentNode = Json & {
  key: string
  type: number
  components?: ComponentNode[]
  accessory?: ComponentNode
}

export type MentionSettings = { everyone: boolean; users: boolean; roles: boolean }

export type MessageDraft = {
  components: ComponentNode[]
  settings: {
    username: string
    avatar_url: string
    suppress_notifications: boolean
    allowed_mentions: MentionSettings
    thread_id: string
    thread_name: string
    applied_tags: string
  }
}

export const componentTypes = [
  [17, 'Container'], [10, 'Text Display'], [9, 'Section'], [1, 'Action Row'], [2, 'Button'],
  [3, 'String Select'], [5, 'User Select'], [6, 'Role Select'], [7, 'Mentionable Select'], [8, 'Channel Select'],
  [12, 'Media Gallery'], [13, 'File'], [14, 'Separator'], [11, 'Thumbnail'],
] as const

export const componentName = (type: number) => componentTypes.find(([id]) => id === type)?.[1] ?? `Component ${type}`
export const componentTypeKeys: Record<number, string> = {
  1: 'discord.component.actionRow', 2: 'discord.component.button', 3: 'discord.component.select',
  5: 'discord.component.select', 6: 'discord.component.select', 7: 'discord.component.select', 8: 'discord.component.select',
  9: 'discord.component.section', 10: 'discord.component.text', 11: 'discord.component.thumbnail',
  12: 'discord.component.gallery', 13: 'discord.component.file', 14: 'discord.component.separator', 17: 'discord.component.container',
}
export const componentLabelKey = (type: number) => componentTypeKeys[type] || 'discord.component.unknown'
export const uid = () => crypto.randomUUID()
export const clone = <T,>(value: T): T => structuredClone(value)

const actionId = (kind: string) => `${kind}_${Math.random().toString(36).slice(2, 8)}`

export function createComponent(type: number): ComponentNode {
  if (type === 17) return { key: uid(), type, accent_color: 10395294, components: [createComponent(10)] }
  if (type === 10) return { key: uid(), type, content: 'Escreva o conteúdo desta mensagem.' }
  if (type === 9) return { key: uid(), type, components: [createComponent(10)], accessory: createComponent(11) }
  if (type === 1) return { key: uid(), type, components: [createComponent(2)] }
  if (type === 2) return { key: uid(), type, style: 1, label: 'Continuar', custom_id: actionId('button') }
  if ([3, 5, 6, 7, 8].includes(type)) return { key: uid(), type, custom_id: actionId('select'), placeholder: 'Selecione uma opção', min_values: 1, max_values: 1, ...(type === 3 ? { options: [{ label: 'Opção 1', value: 'option_1', description: '', emoji: '', default: false }] } : {}) }
  if (type === 12) return { key: uid(), type, items: [{ media: { url: 'https://placehold.co/800x450/png' }, description: '', spoiler: false }] }
  if (type === 13) return { key: uid(), type, file: { url: 'attachment://arquivo.pdf' }, spoiler: false }
  if (type === 14) return { key: uid(), type, divider: true, spacing: 1 }
  return { key: uid(), type, media: { url: 'https://placehold.co/160x160/png' }, description: '', spoiler: false }
}

export function defaultDraft(): MessageDraft {
  return {
    components: [createComponent(17)],
    settings: {
      username: '', avatar_url: '', suppress_notifications: false,
      allowed_mentions: { everyone: false, users: false, roles: false },
      thread_id: '', thread_name: '', applied_tags: '',
    },
  }
}

function stripMediaItem(value: unknown): Json {
  const item = value && typeof value === 'object' ? value as Json : {}
  const media = item.media && typeof item.media === 'object' ? clean(item.media as Json) : undefined
  return clean({ ...item, media })
}

export function stripComponent(node: ComponentNode): Json {
  const { key: _key, components, accessory, ...rest } = node
  return {
    ...clean(rest),
    ...(Array.isArray(rest.items) ? { items: rest.items.map(stripMediaItem) } : {}),
    ...(components ? { components: components.map(stripComponent) } : {}),
    ...(accessory ? { accessory: stripComponent(accessory) } : {}),
  }
}

export function hydrateComponent(value: unknown): ComponentNode {
  const input = value && typeof value === 'object' ? value as Json : {}
  const children = Array.isArray(input.components) ? input.components.map(hydrateComponent) : undefined
  const accessory = input.accessory && typeof input.accessory === 'object' ? hydrateComponent(input.accessory) : undefined
  return { ...input, key: uid(), type: Number(input.type ?? 10), ...(children ? { components: children } : {}), ...(accessory ? { accessory } : {}) }
}

export function clean(value: Json): Json {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== '' && item !== undefined && item !== null && (!Array.isArray(item) || item.length > 0)))
}

export function isAllowedChild(parent: ComponentNode | null, type: number, accessory = false): boolean {
  if (accessory) return parent?.type === 9 && [2, 11].includes(type)
  if (!parent) return [1, 9, 10, 12, 13, 14, 17].includes(type)
  if (parent.type === 17) return [1, 9, 10, 12, 13, 14].includes(type)
  if (parent.type === 1) return [2, 3, 5, 6, 7, 8].includes(type)
  if (parent.type === 9) return type === 10
  return false
}

export function walkComponents(nodes: ComponentNode[], visit: (node: ComponentNode, parent: ComponentNode | null, relation: 'child' | 'accessory') => void, parent: ComponentNode | null = null) {
  nodes.forEach((node) => { visit(node, parent, 'child'); node.components?.forEach((child) => walkComponents([child], visit, node)); if (node.accessory) visit(node.accessory, node, 'accessory') })
}

export function locateComponent(nodes: ComponentNode[], key: string): { node: ComponentNode; parent: ComponentNode | null; list: ComponentNode[]; accessory: boolean } | null {
  for (const node of nodes) {
    if (node.key === key) return { node, parent: null, list: nodes, accessory: false }
    if (node.accessory?.key === key) return { node: node.accessory, parent: node, list: [], accessory: true }
    if (node.components) { const found = locateComponent(node.components, key); if (found) return { ...found, parent: found.parent ?? node } }
  }
  return null
}