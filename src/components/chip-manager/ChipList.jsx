import { Plus, Trash2, BookOpen } from 'lucide-react'
import { useState } from 'react'
import useProjectStore from '../../store/useProjectStore'
import ChipLibrary from './ChipLibrary'
import useDialogStore from '../../store/useDialogStore'

export default function ChipList() {
  const chips = useProjectStore((s) => s.chips)
  const activeChipId = useProjectStore((s) => s.activeChipId)
  const addChip = useProjectStore((s) => s.addChip)
  const removeChip = useProjectStore((s) => s.removeChip)
  const setActiveChip = useProjectStore((s) => s.setActiveChip)
  const requestConfirm = useDialogStore((s) => s.requestConfirm)
  const [showLibrary, setShowLibrary] = useState(false)

  const handleDeleteChip = async (event, chip) => {
    event.stopPropagation()
    const confirmed = await requestConfirm({
      title: 'Delete chip',
      message: `Delete "${chip.name}"?`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      tone: 'danger',
    })
    if (confirmed) removeChip(chip.id)
  }

  const chipSubtitle = (chip) => (
    chip.package
      ? `${chip.package} · ${chip.pinCount} pins`
      : `${chip.pinCount} pins`
  )

  return (
    <>
      <div className="w-64 border-r border-board-border flex flex-col bg-board-surface shrink-0">
        <div className="p-3 border-b border-board-border">
          <div className="flex gap-2">
            <button
              onClick={() => addChip()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-board-accent border border-dashed border-board-accent/50 rounded hover:bg-board-accent/10 transition-colors"
            >
              <Plus size={14} />
              Custom Chip
            </button>
            <button
              onClick={() => setShowLibrary(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-amber-400 border border-dashed border-amber-400/50 rounded hover:bg-amber-400/10 transition-colors"
              title="Import from chip library"
            >
              <BookOpen size={14} />
              Library
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {chips.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-xs">
              No chips yet. Add a custom chip or import from the library.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {chips.map((chip) => (
                <div
                  key={chip.id}
                  onClick={() => setActiveChip(chip.id)}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded cursor-pointer text-xs transition-colors group
                    ${activeChipId === chip.id
                      ? 'bg-board-accent/10 text-board-accent border border-board-accent/30'
                      : 'text-gray-400 hover:bg-white/5 border border-transparent'
                    }
                  `}
                >
                  <div className="truncate">
                    <div className="font-semibold truncate">{chip.name}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{chipSubtitle(chip)}</div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChip(e, chip)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showLibrary && <ChipLibrary onClose={() => setShowLibrary(false)} />}
    </>
  )
}
