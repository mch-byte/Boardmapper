import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Link2, MousePointer2, Upload, X } from 'lucide-react'
import useProjectStore from '../../store/useProjectStore'
import BoardCanvas from './BoardCanvas'

const CHIP_DRAG_MIME = 'application/x-boardmapper-chip'

function pinNumberEquals(a, b) {
  return String(a) === String(b)
}

export default function BoardView() {
  const chips = useProjectStore((s) => s.chips)
  const connections = useProjectStore((s) => s.connections)
  const activeChipId = useProjectStore((s) => s.activeChipId)
  const boardImage = useProjectStore((s) => s.boardImage)
  const setBoardImage = useProjectStore((s) => s.setBoardImage)
  const setActiveChip = useProjectStore((s) => s.setActiveChip)
  const updateChipBoardPosition = useProjectStore((s) => s.updateChipBoardPosition)
  const addConnection = useProjectStore((s) => s.addConnection)
  const removeConnection = useProjectStore((s) => s.removeConnection)
  const fileInputRef = useRef(null)
  const [pendingPin, setPendingPin] = useState(null)

  const placedCount = chips.filter((chip) => chip.boardPosition).length
  const chipsById = useMemo(
    () => new Map(chips.map((chip) => [chip.id, chip])),
    [chips]
  )

  useEffect(() => {
    if (!pendingPin) return
    const chip = chipsById.get(pendingPin.chipId)
    const pinExists = chip?.pins.some((pin) => pinNumberEquals(pin.number, pendingPin.pinNumber))
    if (!chip || !chip.boardPosition || !pinExists) {
      setPendingPin(null)
    }
  }, [chipsById, pendingPin])

  const handleImportImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result
      if (typeof dataUrl !== 'string') return
      setBoardImage({
        dataUrl,
        name: file.name,
        importedAt: new Date().toISOString(),
      })
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleDropChip = (chipId, point) => {
    const chip = chips.find((item) => item.id === chipId)
    if (!chip) return
    updateChipBoardPosition(chipId, {
      x: point.x,
      y: point.y,
      rotation: chip.boardPosition?.rotation ?? 0,
      scale: chip.boardPosition?.scale ?? 1,
    })
    setActiveChip(chipId)
  }

  const handleMoveChip = (chipId, point) => {
    const chip = chips.find((item) => item.id === chipId)
    if (!chip) return
    updateChipBoardPosition(chipId, {
      x: point.x,
      y: point.y,
      rotation: chip.boardPosition?.rotation ?? 0,
      scale: chip.boardPosition?.scale ?? 1,
    })
  }

  const formatPendingLabel = (pinRef) => {
    const chip = chipsById.get(pinRef.chipId)
    const pin = chip?.pins.find((p) => pinNumberEquals(p.number, pinRef.pinNumber))
    if (!chip || !pin) return 'Unknown pin'
    return `${chip.name} - Pin ${pin.number}${pin.name ? ` / ${pin.name}` : ''}`
  }

  const handleBoardPinClick = (pinRef) => {
    const chip = chipsById.get(pinRef.chipId)
    if (!chip) return

    if (!pendingPin) {
      setPendingPin(pinRef)
      setActiveChip(pinRef.chipId)
      return
    }

    const samePin = pendingPin.chipId === pinRef.chipId
      && pinNumberEquals(pendingPin.pinNumber, pinRef.pinNumber)
    if (samePin) {
      setPendingPin(null)
      return
    }

    if (pendingPin.chipId === pinRef.chipId) {
      setPendingPin(pinRef)
      setActiveChip(pinRef.chipId)
      return
    }

    addConnection({
      fromChip: pendingPin.chipId,
      fromPin: pendingPin.pinNumber,
      toChip: pinRef.chipId,
      toPin: pinRef.pinNumber,
      protocol: 'other',
      signalName: '',
      notes: '',
    })
    setPendingPin(null)
  }

  const chipSubtitle = (chip) => (
    chip.package
      ? `${chip.package} · ${chip.pinCount} pins`
      : `${chip.pinCount} pins`
  )

  return (
    <div className="flex h-full min-h-0">
      <aside className="w-72 border-r border-board-border bg-board-surface shrink-0 flex flex-col min-h-0">
        <div className="p-3 border-b border-board-border space-y-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-emerald-400 border border-dashed border-emerald-400/50 rounded hover:bg-emerald-400/10 transition-colors"
          >
            <Upload size={14} />
            {boardImage ? 'Replace PCB Photo' : 'Import PCB Photo'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImportImage}
            className="hidden"
          />

          {boardImage ? (
            <div className="rounded border border-board-border p-2 text-[11px] text-gray-400">
              <div className="truncate">{boardImage.name || 'PCB photo loaded'}</div>
              <button
                onClick={() => setBoardImage(null)}
                className="mt-2 inline-flex items-center gap-1 text-red-400 hover:text-red-300"
              >
                <X size={12} />
                Remove photo
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-gray-500">
              Photo is optional. Drag chips onto the canvas directly, or import a photo for alignment.
            </p>
          )}
        </div>

        <div className="px-3 py-2 border-b border-board-border">
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>Chip palette</span>
            <span>{placedCount}/{chips.length} placed</span>
          </div>
        </div>

        <div className="p-3 border-b border-board-border">
          <div className="rounded border border-board-border bg-board-bg px-2.5 py-2 text-[11px] text-gray-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-gray-300">
              <Link2 size={12} />
              Board pin connect
            </div>
            <p>Click pin A, then pin B to create a connection.</p>
            <p className="text-gray-500">Delete in Board View: click a connection and press Delete.</p>
            {pendingPin ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-board-accent truncate">{formatPendingLabel(pendingPin)}</span>
                <button
                  onClick={() => setPendingPin(null)}
                  className="text-red-400 hover:text-red-300 shrink-0"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p className="text-gray-500">No start pin selected.</p>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-2 space-y-1">
          {chips.length === 0 ? (
            <div className="p-3 text-xs text-gray-500 border border-dashed border-board-border rounded">
              Add chips in the Chip Manager tab to place them here.
            </div>
          ) : (
            chips.map((chip) => (
              <div
                key={chip.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(CHIP_DRAG_MIME, chip.id)
                  event.dataTransfer.setData('text/plain', chip.id)
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onClick={() => setActiveChip(chip.id)}
                className={`
                  rounded border px-3 py-2 text-xs cursor-grab active:cursor-grabbing transition-colors
                  ${activeChipId === chip.id
                    ? 'border-board-accent/50 bg-board-accent/10 text-board-accent'
                    : 'border-board-border hover:bg-white/5 text-gray-300'
                  }
                `}
              >
                <div className="font-semibold truncate">{chip.name}</div>
                <div className="mt-0.5 text-[10px] text-gray-500">
                  {chipSubtitle(chip)}
                </div>
                <div className="mt-1 text-[10px]">
                  {chip.boardPosition ? (
                    <span className="text-emerald-400">Placed on canvas</span>
                  ) : (
                    <span className="text-amber-400">Drag to canvas</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="flex-1 relative min-h-0">
        {chips.length === 0 && (
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <div className="flex items-center gap-2 text-xs text-gray-400 border border-board-border bg-board-surface/90 rounded px-2 py-1.5">
              <MousePointer2 size={13} />
              Create chips in Tab 1 to place them on the board.
            </div>
          </div>
        )}

        {!boardImage && (
          <div className="absolute top-3 right-3 z-10 pointer-events-none">
            <div className="flex items-center gap-2 text-xs text-gray-400 border border-board-border bg-board-surface/90 rounded px-2 py-1.5">
              <ImagePlus size={13} />
              No photo loaded. You can still place chips freely.
            </div>
          </div>
        )}

        <BoardCanvas
          chips={chips}
          connections={connections}
          activeChipId={activeChipId}
          boardImage={boardImage}
          onDropChip={handleDropChip}
          onMoveChip={handleMoveChip}
          onSelectChip={setActiveChip}
          onPinClick={handleBoardPinClick}
          onRemoveConnection={removeConnection}
          pendingPin={pendingPin}
          dragMime={CHIP_DRAG_MIME}
        />
      </section>
    </div>
  )
}
