import { componentLabelKey, type MessageDraft, walkComponents } from './model'

export type BuilderIssue = { message: string; key?: string; field?: string }

export type DiscordTranslator = (key: string, values?: Record<string, string | number>) => string

const text = (value: unknown) => String(value ?? '')
const isHttpsUrl = (value: string) => value === '' || value.startsWith('attachment://') || value.startsWith('https://')

export function validateDraft(draft: MessageDraft, td: DiscordTranslator = (key) => key): BuilderIssue[] {
  const issues: BuilderIssue[] = []
  const push = (message: string, key?: string, field?: string) => issues.push({ message, key, field })
  const ids = new Set<string>()
  const nodes = draft.components
  let componentCount = 0
  const componentLabel = (type: number) => td(componentLabelKey(type))

  if (!nodes.length) push(td('discord.v2Empty'))

  walkComponents(nodes, (node, parent, relation) => {
    componentCount += 1
    if (componentCount > 40) push(td('discord.v2Max', { max: 40 }), node.key)
    if (node.type === 17 && parent && ![17].includes(parent.type)) push(td('discord.childInvalid', { child: componentLabel(node.type), parent: componentLabel(parent.type) }), node.key)
    if (node.type === 9) {
      const textChildren = node.components?.filter((child) => child.type === 10).length ?? 0
      if (textChildren < 1 || textChildren > 3) push(td('discord.sectionTextCount'), node.key)
      if (!node.accessory || ![2, 11].includes(node.accessory.type)) push(td('discord.sectionAccessory'), node.key)
    }
    if (node.type === 1) {
      const children = node.components ?? []
      const buttons = children.filter((child) => child.type === 2)
      const selects = children.filter((child) => [3, 5, 6, 7, 8].includes(child.type))
      if (!children.length) push(td('discord.actionRowEmpty'), node.key)
      if (buttons.length && selects.length) push(td('discord.actionRowMix'), node.key)
      if (buttons.length > 5) push(td('discord.actionRowButtons'), node.key)
      if (selects.length > 1) push(td('discord.actionRowSelects'), node.key)
    }
    if (node.type === 2) {
      const style = Number(node.style ?? 1); const id = text(node.custom_id); const url = text(node.url)
      const label = text(node.label)
      if (label.length > 80) push(td('discord.buttonLabelMax'), node.key, 'label')
      if (style === 5 && !url) push(td('discord.buttonLinkUrl'), node.key, 'url')
      if (style === 5 && id) push(td('discord.buttonLinkId'), node.key, 'custom_id')
      if (style === 6 && !text(node.sku_id)) push(td('discord.buttonPremiumSku'), node.key, 'sku_id')
      if (style === 6 && (id || url || label || text(node.emoji))) push(td('discord.buttonPremiumFields'), node.key)
      if (![5, 6].includes(style) && (!id || id.length > 100)) push(td('discord.buttonId'), node.key, 'custom_id')
      if (style === 5 && url && !url.startsWith('https://')) push(td('discord.httpOnly'), node.key, 'url')
      if (id) { if (ids.has(id)) push(td('discord.customIdDuplicate', { id }), node.key, 'custom_id'); ids.add(id) }
    }
    if ([3, 5, 6, 7, 8].includes(node.type)) {
      const id = text(node.custom_id)
      if (!id || id.length > 100) push(td('discord.selectId', { label: componentLabel(node.type) }), node.key, 'custom_id')
      if (id) { if (ids.has(id)) push(td('discord.customIdDuplicate', { id }), node.key, 'custom_id'); ids.add(id) }
      if (text(node.placeholder).length > 150) push(td('discord.placeholderMax'), node.key, 'placeholder')
      if (node.type === 3) {
        const options = Array.isArray(node.options) ? node.options : []
        if (!options.length || options.length > 25) push(td('discord.optionsCount'), node.key)
        options.forEach((option) => { const value = option as Record<string, unknown>; if (!text(value.label) || !text(value.value) || text(value.label).length > 100 || text(value.value).length > 100) push(td('discord.optionInvalid'), node.key) })
      }
    }
    if (node.type === 12) {
      const items = Array.isArray(node.items) ? node.items : []
      if (items.length < 1 || items.length > 10) push(td('discord.galleryCount'), node.key)
      items.forEach((item) => { const media = (item as Record<string, unknown>).media as Record<string, unknown> | undefined; if (typeof media?.url === 'string' && !isHttpsUrl(media.url)) push(td('discord.httpOnly'), node.key) })
    }
    if (node.type === 13) {
      const fileUrl = text((node.file as Record<string, unknown> | undefined)?.url)
      if (!fileUrl) push(td('discord.fileUrlRequired'), node.key)
      else if (!isHttpsUrl(fileUrl)) push(td('discord.httpOnly'), node.key)
    }
    if (node.type === 11) {
      const url = text((node.media as Record<string, unknown> | undefined)?.url)
      if (!url) push(td('discord.thumbnailRequired'), node.key)
      else if (!isHttpsUrl(url)) push(td('discord.httpOnly'), node.key)
    }
    if (relation === 'accessory' && parent?.type !== 9) push(td('discord.accessoryInvalid'), node.key)
  })
  return issues
}