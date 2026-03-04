import { useEffect } from 'react'
import useDialogStore from '../../store/useDialogStore'

const TONE_STYLES = {
  danger: 'border-red-500/50 text-red-300 hover:bg-red-500/10',
  info: 'border-blue-500/50 text-blue-300 hover:bg-blue-500/10',
  neutral: 'border-board-accent/50 text-board-accent hover:bg-board-accent/10',
}

export default function DialogHost() {
  const dialog = useDialogStore((s) => s.dialog)
  const closeDialog = useDialogStore((s) => s.closeDialog)

  useEffect(() => {
    if (!dialog) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDialog(false)
      if (event.key === 'Enter') closeDialog(true)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeDialog, dialog])

  if (!dialog) return null

  const confirmTone = TONE_STYLES[dialog.tone] || TONE_STYLES.neutral
  const isConfirm = dialog.type === 'confirm'

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-board-border bg-board-surface shadow-2xl">
        <div className="p-4 border-b border-board-border">
          <h3 className="text-sm font-semibold text-gray-100">{dialog.title}</h3>
          <p className="mt-1 text-xs text-gray-400 whitespace-pre-line">{dialog.message}</p>
        </div>
        <div className="p-4 flex items-center justify-end gap-2">
          {isConfirm && dialog.cancelLabel && (
            <button
              onClick={() => closeDialog(false)}
              className="px-3 py-1.5 text-xs border border-board-border rounded text-gray-300 hover:bg-white/5 transition-colors"
            >
              {dialog.cancelLabel}
            </button>
          )}
          <button
            onClick={() => closeDialog(true)}
            className={`px-3 py-1.5 text-xs border rounded transition-colors ${confirmTone}`}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
