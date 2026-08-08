import type { ComponentPreviewProps } from './types'
import { DiscordActionRowPreview, DiscordButtonPreview } from './DiscordActionRowPreview'
import { DiscordContainerPreview } from './DiscordContainerPreview'
import { DiscordFilePreview } from './DiscordFilePreview'
import { DiscordMediaGalleryPreview } from './DiscordMediaGalleryPreview'
import { DiscordSectionPreview } from './DiscordSectionPreview'
import { DiscordSelectPreview } from './DiscordSelectPreview'
import { DiscordSeparatorPreview } from './DiscordSeparatorPreview'
import { DiscordTextDisplayPreview } from './DiscordTextDisplayPreview'
import { DiscordThumbnailPreview } from './DiscordThumbnailPreview'

export function DiscordComponentPreview(props: ComponentPreviewProps) {
  switch (props.node.type) {
    case 17: return <DiscordContainerPreview {...props} />
    case 10: return <DiscordTextDisplayPreview {...props} />
    case 9: return <DiscordSectionPreview {...props} />
    case 1: return <DiscordActionRowPreview {...props} />
    case 12: return <DiscordMediaGalleryPreview {...props} />
    case 13: return <DiscordFilePreview {...props} />
    case 14: return <DiscordSeparatorPreview {...props} />
    case 11: return <DiscordThumbnailPreview {...props} />
    case 2: return <DiscordButtonPreview {...props} />
    case 3: case 5: case 6: case 7: case 8: return <DiscordSelectPreview {...props} />
    default: return null
  }
}
