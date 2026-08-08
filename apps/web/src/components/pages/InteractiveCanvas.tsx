import { useState } from 'react'
import {
  Plus,
  Trash2,
  Copy,
  Image,
  Layers3,
  ArrowUp,
  ArrowDown,
  Trash,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import {
  componentLabelKey,
  createComponent,
  locateComponent,
  type ComponentNode,
  type Json,
  type MessageDraft
} from '../../features/discord/model'
import type { BuilderIssue } from '../../features/discord/validation'
import { useI18n } from '../../i18n'
import { AccentColorEditor } from './AccentColorEditor'

interface InteractiveCanvasProps {
  nodes: ComponentNode[]
  selected: string
  setSelected: (key: string) => void
  updateNode: (key: string, patch: Json) => void
  remove: (key: string) => void
  duplicate: (key: string) => void
  commit: (next: MessageDraft | ((current: MessageDraft) => MessageDraft)) => void
  issues: BuilderIssue[]
}

export function InteractiveCanvas({
  nodes,
  selected,
  setSelected,
  updateNode,
  remove,
  duplicate,
  commit,
  issues
}: InteractiveCanvasProps) {
  const { t: translate } = useI18n()
  const td = (key: string, values?: Record<string, string | number>) => {
    const template = translate(key)
    return values ? template.replace(/\{(\w+)\}/g, (_, token) => String(values[token] ?? '')) : template
  }
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [editingAccent, setEditingAccent] = useState<string | null>(null)

  // Move component up or down
  const moveNode = (key: string, dir: 'up' | 'down') => {
    commit((current) => {
      const target = locateComponent(current.components, key)
      if (target) {
        const idx = target.list.indexOf(target.node)
        if (dir === 'up' && idx > 0) {
          const temp = target.list[idx - 1]
          target.list[idx - 1] = target.list[idx]
          target.list[idx] = temp
        } else if (dir === 'down' && idx < target.list.length - 1) {
          const temp = target.list[idx + 1]
          target.list[idx + 1] = target.list[idx]
          target.list[idx] = temp
        }
      }
      return current
    })
  }

  // Add child to a container component
  const addChild = (parentKey: string, type: number) => {
    commit((current) => {
      const target = locateComponent(current.components, parentKey)
      if (target?.node) {
        const children = target.node.components ?? []
        const parentType = target.node.type
        const isSelect = [3, 5, 6, 7, 8].includes(type)
        const hasSelect = children.some((child) => [3, 5, 6, 7, 8].includes(child.type))
        const allowed = parentType === 17 || (parentType === 9 && type === 10 && children.length < 3) || (parentType === 1 && ((type === 2 && !hasSelect && children.length < 5) || (isSelect && !children.length)))
        if (!allowed) return current
        if (!target.node.components) target.node.components = []
        const child = createComponent(type)
        target.node.components.push(child)
        setSelected(child.key)
      }
      return current
    })
  }

  const setAccessory = (sectionKey: string, type: 2 | 11) => {
    commit((current) => {
      const target = locateComponent(current.components, sectionKey)
      if (!target || target.node.type !== 9) return current
      const accessory = createComponent(type)
      target.node.accessory = accessory
      setSelected(accessory.key)
      return current
    })
  }

  const removeAccessory = (sectionKey: string) => {
    commit((current) => {
      const target = locateComponent(current.components, sectionKey)
      if (!target || target.node.type !== 9) return current
      delete target.node.accessory
      setSelected(sectionKey)
      return current
    })
  }

  // Add a top-level component at the root level
  const addRoot = (type: number) => {
    commit((current) => {
      const item = createComponent(type)
      current.components.push(item)
      setSelected(item.key)
      return current
    })
  }

  const toggleCollapsed = (key: string) => {
    setCollapsed((current) => ({ ...current, [key]: !current[key] }))
  }

  // Render list of component blocks recursively
  const renderNodes = (nodeList: ComponentNode[]) => {
    return nodeList.map((node, index) => {
      const active = selected === node.key
      const nodeIssues = issues.filter((i) => i.key === node.key)
      const hasChildren = Array.isArray(node.components)
      const childCount = hasChildren ? node.components!.length : 0
      const canCollapse = [17, 9, 1].includes(node.type)
      const isCollapsed = Boolean(collapsed[node.key])
      const containerIndex = node.type === 17
        ? nodeList.filter((n, i) => n.type === 17 && i <= index).length
        : 0
      const componentLabel = (type: number) => td(componentLabelKey(type))

      // Action buttons
      const headerActions = (
        <div className="discord-editor-actions">
          <button
            type="button"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation()
              moveNode(node.key, 'up')
            }}
            title={td('discord.moveUp')}
          >
            <ArrowUp size={12} />
          </button>
          <button
            type="button"
            disabled={index === nodeList.length - 1}
            onClick={(e) => {
              e.stopPropagation()
              moveNode(node.key, 'down')
            }}
            title={td('discord.moveDown')}
          >
            <ArrowDown size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              duplicate(node.key)
            }}
            title={td('discord.duplicate')}
          >
            <Copy size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              remove(node.key)
            }}
            className="delete-btn"
            title={td('discord.remove')}
          >
            <Trash size={12} />
          </button>
        </div>
      )

      // Inner component editors
      let editorContent = null

      if (node.type === 17) {
        // Container
        const colorVal = Number(node.accent_color ?? 10066329)
        const colorHex = '#' + colorVal.toString(16).padStart(6, '0')
        const hasAccent = typeof node.accent_color === 'number'

        editorContent = (
          <div className="discord-container-editor">
            <div className="discord-editor-row">
              <div className="discord-editor-field discord-accent-control">
                <span>{td('discord.accent')}</span>
                <div><button type="button" className={`discord-accent-toggle ${hasAccent ? 'is-enabled' : ''}`} onClick={() => updateNode(node.key, { accent_color: hasAccent ? undefined : colorVal })}><i />{hasAccent ? td('discord.accent.on') : td('discord.accent.off')}</button>{hasAccent && <button type="button" className="discord-accent-open" onClick={() => setEditingAccent(editingAccent === node.key ? null : node.key)}><i style={{ backgroundColor: colorHex }} />{td('discord.accent.edit')}</button>}</div>
              </div>

              <label className="discord-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(node.spoiler)}
                  onChange={(e) => updateNode(node.key, { spoiler: e.target.checked })}
                />
                {td('discord.spoiler')}
              </label>
            </div>

            {hasAccent && editingAccent === node.key && <AccentColorEditor value={colorHex} onChange={(color) => updateNode(node.key, { accent_color: parseInt(color.slice(1), 16) })} />}

            {/* Nested Children Inside Container */}
            {hasChildren && childCount > 0 && (
              <div className="discord-nested-children">
                {renderNodes(node.components!)}
              </div>
            )}

            {/* Add Child Buttons Panel */}
            <div className="discord-child-add-panel">
              <div className="discord-child-header">
                <span>{td('discord.childComponents')}</span>
                <span className="count-badge">{childCount}</span>
              </div>
              <div className="discord-add-grid">
                <button type="button" onClick={() => addChild(node.key, 10)}>
                  <Plus size={11} /> {td('discord.textDisplay')}
                </button>
                <button type="button" onClick={() => addChild(node.key, 14)}>
                  <Plus size={11} /> {td('discord.separator')}
                </button>
                <button type="button" onClick={() => addChild(node.key, 9)}>
                  <Plus size={11} /> {td('discord.sectionCmp')}
                </button>
                <button type="button" onClick={() => addChild(node.key, 12)}>
                  <Plus size={11} /> {td('discord.media')}
                </button>
                <button type="button" onClick={() => addChild(node.key, 1)}>
                  <Plus size={11} /> {td('discord.actionRow')}
                </button>
                <button type="button" onClick={() => addChild(node.key, 13)}>
                  <Plus size={11} /> {td('discord.file')}
                </button>
              </div>
            </div>
          </div>
        )
      } else if (node.type === 10) {
        // Text Display
        editorContent = (
          <div className="discord-text-display-editor">
            {/* Simple Markdown Formatting Toolbar */}
            <div className="discord-markdown-toolbar">
              <button
                type="button"
                onClick={() => {
                  const currentContent = String(node.content ?? '')
                  updateNode(node.key, { content: currentContent + '**bold**' })
                }}
                title={td('discord.bold')}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentContent = String(node.content ?? '')
                  updateNode(node.key, { content: currentContent + '*italic*' })
                }}
                title={td('discord.italic')}
              >
                I
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentContent = String(node.content ?? '')
                  updateNode(node.key, { content: currentContent + '__underline__' })
                }}
                title={td('discord.underline')}
              >
                U
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentContent = String(node.content ?? '')
                  updateNode(node.key, { content: currentContent + '~~strikethrough~~' })
                }}
                title={td('discord.strikethrough')}
              >
                S
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentContent = String(node.content ?? '')
                  updateNode(node.key, { content: currentContent + '`code`' })
                }}
                title={td('discord.code')}
              >
                &lt;&gt;
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentContent = String(node.content ?? '')
                  updateNode(node.key, { content: currentContent + '> quote' })
                }}
                title={td('discord.quote')}
              >
                ”
              </button>
            </div>
            <textarea
              value={String(node.content ?? '')}
              onChange={(e) => updateNode(node.key, { content: e.target.value })}
              placeholder={td('discord.markdown.placeholder')}
            />
          </div>
        )
      } else if (node.type === 14) {
        // Separator
        editorContent = (
          <div className="discord-separator-editor">
            <label className="discord-toggle">
              <input
                type="checkbox"
                checked={Boolean(node.divider)}
                onChange={(e) => updateNode(node.key, { divider: e.target.checked })}
              />
              {td('discord.divider')}
            </label>

            <label className="discord-editor-field select-field">
              <span>{td('discord.spacing')}:</span>
              <select
                value={Number(node.spacing ?? 1)}
                onChange={(e) => updateNode(node.key, { spacing: Number(e.target.value) })}
              >
                <option value="1">{td('discord.small')}</option>
                <option value="2">{td('discord.large')}</option>
              </select>
            </label>
          </div>
        )
      } else if (node.type === 12) {
        // Media Gallery
        const items = Array.isArray(node.items) ? (node.items as Json[]) : []
        const updateItem = (itemIndex: number, patch: Json) => {
          const updatedItems = items.map((item, idx) =>
            idx === itemIndex ? { ...item, ...patch } : item
          )
          updateNode(node.key, { items: updatedItems })
        }
        const deleteItem = (itemIndex: number) => {
          const updatedItems = items.filter((_, idx) => idx !== itemIndex)
          updateNode(node.key, { items: updatedItems })
        }
        const addItem = () => {
          const updatedItems = [
            ...items,
            { media: { url: '' }, description: '', spoiler: false }
          ]
          updateNode(node.key, { items: updatedItems })
        }

        editorContent = (
          <div className="discord-gallery-editor">
            {items.map((item, idx) => {
              const url = String((item.media as Json | undefined)?.url ?? '')
              const isValidImg = url.startsWith('http://') || url.startsWith('https://')
              return (
                <div className="discord-gallery-row" key={idx}>
                  <div className="discord-gallery-thumbnail">
                    {isValidImg ? (
                      <img src={url} alt="" />
                    ) : (
                      <div className="image-placeholder">
                        <Image size={18} />
                      </div>
                    )}
                  </div>
                  <div className="discord-gallery-fields">
                    <input
                      type="text"
                      placeholder={td('discord.image.placeholder')}
                      value={url}
                      onChange={(e) =>
                        updateItem(idx, { media: { ...(item.media as Json), url: e.target.value } })
                      }
                    />
                    {!item.media || (typeof (item.media as Json).url === 'string' && !(item.media as Json).url) || (!isValidImg && url !== '') ? (
                      <span className="url-error">{td('discord.httpsOnly')}</span>
                    ) : null}
                    <input
                      type="text"
                      placeholder={td('discord.gallery.caption')}
                      value={String(item.description ?? '')}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                    />
                    <label className="discord-toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(item.spoiler)}
                        onChange={(e) => updateItem(idx, { spoiler: e.target.checked })}
                      />
                      {td('discord.spoiler')}
                    </label>
                  </div>
                  <button
                    type="button"
                    className="discord-item-delete"
                    onClick={() => deleteItem(idx)}
                    title={td('discord.gallery.remove')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
            {items.length < 10 && (
              <button type="button" className="add-gallery-item-btn" onClick={addItem}>
                <Plus size={12} /> {td('discord.gallery.addImage')}
              </button>
            )}
          </div>
        )
      } else if (node.type === 13) {
        // File
        editorContent = (
          <div className="discord-file-editor">
            <input
              type="text"
              placeholder={td('discord.attachment.placeholder')}
              value={String((node.file as Json | undefined)?.url ?? '')}
              onChange={(e) =>
                updateNode(node.key, { file: { ...(node.file as Json), url: e.target.value } })
              }
            />
            <label className="discord-toggle">
              <input
                type="checkbox"
                checked={Boolean(node.spoiler)}
                onChange={(e) => updateNode(node.key, { spoiler: e.target.checked })}
              />
              {td('discord.spoiler')}
            </label>
          </div>
        )
      } else if (node.type === 9) {
        // Section
        editorContent = (
          <div className="discord-section-editor">
            {hasChildren && <div className="discord-nested-children">{renderNodes(node.components!)}</div>}
            {childCount < 3 && <button type="button" className="discord-section-add-text" onClick={() => addChild(node.key, 10)}><Plus size={12} />{td('discord.addText')}</button>}
            {node.accessory ? (
              <div className="discord-section-accessory">
                <header><span className="accessory-label">{td('discord.accessory')}</span><button type="button" onClick={() => removeAccessory(node.key)}>{td('discord.remove')}</button></header>
                {renderNodes([node.accessory])}
              </div>
            ) : <div className="discord-accessory-add"><span>{td('discord.accessory')}</span><button type="button" onClick={() => setAccessory(node.key, 2)}><Plus size={11} />{td('discord.button')}</button><button type="button" onClick={() => setAccessory(node.key, 11)}><Plus size={11} />{td('discord.thumbnail')}</button></div>}
          </div>
        )
      } else if (node.type === 1) {
        // Action Row
        editorContent = (
          <div className="discord-actionrow-editor">
            {hasChildren && <div className="discord-nested-children horizontal-row">{renderNodes(node.components!)}</div>}
            <div className="discord-add-grid inline-grid">
              <button type="button" onClick={() => addChild(node.key, 2)}>
                <Plus size={11} /> {td('discord.button')}
              </button>
              <button type="button" onClick={() => addChild(node.key, 3)}>
                <Plus size={11} /> {td('discord.selectMenu')}
              </button>
            </div>
          </div>
        )
      } else if (node.type === 2) {
        // Button
        const style = Number(node.style ?? 1)
        const setStyle = (nextStyle: number) => {
          const isLink = nextStyle === 5
          const isPremium = nextStyle === 6
          updateNode(node.key, {
            style: nextStyle,
            custom_id: isLink || isPremium ? undefined : String(node.custom_id || `button_${node.key.slice(0, 8)}`),
            url: isLink ? String(node.url || 'https://example.com') : undefined,
            sku_id: isPremium ? String(node.sku_id || '') : undefined,
            label: isPremium ? undefined : node.label,
            emoji: isPremium ? undefined : node.emoji
          })
        }
        editorContent = (
          <div className="discord-button-editor">
            {style !== 6 && <div className="discord-button-fields"><label><span>{td('discord.label')}</span><input type="text" maxLength={80} placeholder={td('discord.label')} value={String(node.label ?? '')} onChange={(e) => updateNode(node.key, { label: e.target.value })} /></label><label><span>{td('discord.emoji')}</span><input type="text" placeholder={td('discord.emoji')} value={String(node.emoji ?? '')} onChange={(e) => updateNode(node.key, { emoji: e.target.value })} /></label></div>}
            <label className="discord-editor-field select-field"><span>{td('discord.style')}</span><select value={style} onChange={(e) => setStyle(Number(e.target.value))}><option value="1">{td('discord.style.primary')}</option><option value="2">{td('discord.style.secondary')}</option><option value="3">{td('discord.style.success')}</option><option value="4">{td('discord.style.danger')}</option><option value="5">{td('discord.style.link')}</option><option value="6">{td('discord.style.premium')}</option></select></label>
            {style === 5 ? <label className="discord-editor-field"><span>{td('discord.url')}</span><input type="url" placeholder={td('discord.url.placeholder')} value={String(node.url ?? '')} onChange={(e) => updateNode(node.key, { url: e.target.value })} /></label> : style === 6 ? <label className="discord-editor-field"><span>{td('discord.skuId')}</span><input type="text" placeholder={td('discord.skuId')} value={String(node.sku_id ?? '')} onChange={(e) => updateNode(node.key, { sku_id: e.target.value })} /></label> : <label className="discord-editor-field"><span>{td('discord.customId')}</span><input type="text" maxLength={100} placeholder={td('discord.customId')} value={String(node.custom_id ?? '')} onChange={(e) => updateNode(node.key, { custom_id: e.target.value })} /></label>}
            <label className="discord-toggle"><input type="checkbox" checked={Boolean(node.disabled)} onChange={(e) => updateNode(node.key, { disabled: e.target.checked })} />{td('discord.disabled')}</label>
          </div>
        )
      } else if (node.type === 11) {
        editorContent = <div className="discord-thumbnail-editor"><label className="discord-editor-field"><span>{td('discord.thumbnail.url')}</span><input type="url" placeholder={td('discord.url.placeholder')} value={String((node.media as Json | undefined)?.url ?? '')} onChange={(e) => updateNode(node.key, { media: { ...(node.media as Json), url: e.target.value } })} /></label><label className="discord-editor-field"><span>{td('discord.fields.title')}</span><textarea maxLength={1024} placeholder={td('discord.gallery.caption')} value={String(node.description ?? '')} onChange={(e) => updateNode(node.key, { description: e.target.value })} /></label><label className="discord-toggle"><input type="checkbox" checked={Boolean(node.spoiler)} onChange={(e) => updateNode(node.key, { spoiler: e.target.checked })} />{td('discord.spoiler')}</label></div>
      } else if ([3, 5, 6, 7, 8].includes(node.type)) {
        // Select Menu
        editorContent = (
          <div className="discord-select-editor">
            <input
              type="text"
              placeholder={td('discord.placeholder')}
              value={String(node.placeholder ?? '')}
              onChange={(e) => updateNode(node.key, { placeholder: e.target.value })}
            />
          </div>
        )
      } else {
        editorContent = (
          <div className="discord-generic-editor">
            <p>{td('discord.generic')}</p>
          </div>
        )
      }

      return (
        <div
          className={`discord-editor-card card-type-${node.type} ${active ? 'is-active' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}
          key={node.key}
          onClick={(e) => {
            e.stopPropagation()
            setSelected(node.key)
          }}
        >
          <header className="discord-editor-card-header">
            <div className="discord-card-title">
              <strong>{node.type === 17 ? `${td('discord.container')} #${containerIndex}` : componentLabel(node.type)}</strong>
              {hasChildren && (node.type === 17 || childCount > 0) && (
                <span className="count-badge">{childCount}</span>
              )}
              {canCollapse && (
                <button
                  type="button"
                  className="discord-collapse-chevron-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleCollapsed(node.key)
                  }}
                  title={isCollapsed ? td('discord.expand') : td('discord.collapse')}
                  aria-label={isCollapsed ? td('discord.expand') : td('discord.collapse')}
                >
                  {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              )}
            </div>
            {headerActions}
          </header>

          {/* Validation issue alerts */}
          {nodeIssues.length > 0 && (
            <div className="discord-card-validation">
              {nodeIssues.map((issue, idx) => (
                <div key={idx} className="validation-item">
                  <AlertCircleIcon />
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}

          {!isCollapsed && <div className="discord-editor-card-body">{editorContent}</div>}
        </div>
      )
    })
  }

  // Helper alert circle icon
  const AlertCircleIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="alert-icon"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )

  return (
    <div className="discord-interactive-canvas">
      {nodes.length > 0 ? (
        <div className="discord-canvas-cards">{renderNodes(nodes)}</div>
      ) : (
        <div className="discord-empty-canvas-placeholder">
          <Layers3 size={28} />
          <p>{td('discord.emptyCanvas')}</p>
        </div>
      )}

      {/* Root component add buttons */}
      <div className="discord-canvas-root-add">
        <span className="add-label">{td('discord.rootAdd')}</span>
        <div className="discord-add-grid">
          <button type="button" onClick={() => addRoot(17)}>
            <Plus size={12} /> {td('discord.container')}
          </button>
          <button type="button" onClick={() => addRoot(10)}>
            <Plus size={12} /> {td('discord.textDisplay')}
          </button>
          <button type="button" onClick={() => addRoot(9)}>
            <Plus size={12} /> {td('discord.sectionCmp')}
          </button>
          <button type="button" onClick={() => addRoot(14)}>
            <Plus size={12} /> {td('discord.separator')}
          </button>
          <button type="button" onClick={() => addRoot(12)}>
            <Plus size={12} /> {td('discord.mediaGallery')}
          </button>
          <button type="button" onClick={() => addRoot(13)}>
            <Plus size={12} /> {td('discord.file')}
          </button>
          <button type="button" onClick={() => addRoot(1)}>
            <Plus size={12} /> {td('discord.actionRow')}
          </button>
        </div>
      </div>
    </div>
  )
}