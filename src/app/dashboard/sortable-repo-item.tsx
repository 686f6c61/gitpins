/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Sortable Repo Item Component
 * Draggable repository item used in both the pinned and pool zones.
 * Displays repo name, description, language, stars, and forks.
 */

'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVerticalIcon, StarIcon, ForkIcon } from '@/components/icons'
import type { Repo } from '@/types'

/** Props for the SortableRepoItem component */
interface SortableRepoItemProps {
  repo: Repo
  index: number
  isTop: boolean
  onRemove?: () => void
}

/**
 * Sortable repository item component.
 * Displays a single repo with drag handle and metadata.
 * Uses dnd-kit's useSortable hook for drag-and-drop functionality.
 */
export function SortableRepoItem({ repo, index, isTop, onRemove }: SortableRepoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: repo.fullName })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 bg-background ${
        isDragging ? 'shadow-lg z-10' : ''
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
      >
        <GripVerticalIcon className="w-5 h-5" />
      </button>

      {/* Position number */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
          isTop
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {index + 1}
      </div>

      {/* Repo info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline truncate"
          >
            {repo.name}
          </a>
          {repo.isPrivate && (
            <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
              Private
            </span>
          )}
        </div>
        {repo.description && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {repo.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
        {repo.language && (
          <span className="hidden sm:block">{repo.language}</span>
        )}
        <span className="flex items-center gap-1">
          <StarIcon className="w-4 h-4" />
          {repo.stars}
        </span>
        <span className="flex items-center gap-1">
          <ForkIcon className="w-4 h-4" />
          {repo.forks}
        </span>
      </div>

      {/* Remove button - only shown when in top zone */}
      {isTop && onRemove && (
        <button
          onClick={onRemove}
          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
          title="Remove from pinned"
          aria-label="Remove from pinned repos"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
