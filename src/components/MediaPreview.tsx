import type { ResolvedMediaPreview } from "../lib/resolve-media-preview.js"

/** Props for {@link MediaPreview}. */
export interface MediaPreviewProps {
  /** Resolved media item to render. */
  item: ResolvedMediaPreview
  /** Optional class overrides for media elements. */
  className?: string
}

/**
 * Read-only media preview for run output (image / video / audio / pdf / fallback).
 * @category Demo
 */
export function MediaPreview({ item, className }: MediaPreviewProps) {
  if (item.error) {
    return <p className="text-label text-error">{item.error}</p>
  }
  if (!item.url) {
    return <p className="text-label text-on-surface-variant">No preview available.</p>
  }
  const mediaClass =
    className ?? "max-h-64 max-w-full rounded border border-outline-variant/40 object-contain"
  switch (item.previewKind) {
    case "image":
      return <img src={item.url} alt={item.name || item.path} className={mediaClass} />
    case "video":
      return (
        <video
          src={item.url}
          controls
          className={className ?? "max-h-64 max-w-full rounded border border-outline-variant/40"}
        />
      )
    case "audio":
      return <audio src={item.url} controls className={className ?? "w-full"} />
    case "pdf":
      return (
        <iframe
          title={item.name || item.path}
          src={item.url}
          className={
            className ?? "h-64 w-full rounded border border-outline-variant/40 bg-surface-container-lowest"
          }
        />
      )
    default:
      return (
        <p className="font-mono text-label text-on-surface-variant">
          {item.mediaType} · use Open to view in the browser
        </p>
      )
  }
}
