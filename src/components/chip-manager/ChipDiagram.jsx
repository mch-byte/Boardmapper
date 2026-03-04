import { useMemo, useRef, useState } from 'react'
import useProjectStore, { inferChipLayoutKind, PIN_TYPES } from '../../store/useProjectStore'

const COLORS = PIN_TYPES.reduce((acc, t) => {
  acc[t.value] = t.color
  return acc
}, {})

const MIN_ZOOM = 1
const MAX_ZOOM = 6
const ZOOM_STEP = 1.14

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export default function ChipDiagram({ chip }) {
  const selectedPinNumber = useProjectStore((s) => s.selectedPinNumber)
  const setSelectedPin = useProjectStore((s) => s.setSelectedPin)

  const layoutKind = inferChipLayoutKind(chip.package, chip.pinCount, chip.layoutKind)
  const isSingle = layoutKind === 'single'
  const isSOT = layoutKind === 'sot'
  const isQFP = layoutKind === 'quad' || layoutKind === 'array'

  const viewportHeight = useMemo(() => {
    if (isSingle) return 300
    if (isQFP) {
      if (chip.pinCount >= 100) return 760
      if (chip.pinCount >= 64) return 680
      return 620
    }
    if (isSOT) return 420
    const rows = Math.ceil(chip.pinCount / 2)
    return clamp(240 + rows * 24, 380, 740)
  }, [chip.pinCount, isQFP, isSOT, isSingle])

  const diagram = isSingle
    ? <SinglePinChip chip={chip} selectedPin={selectedPinNumber} onSelectPin={setSelectedPin} className="w-full h-full select-none" />
    : isQFP
    ? <QFPChip chip={chip} selectedPin={selectedPinNumber} onSelectPin={setSelectedPin} className="w-full h-full select-none" />
    : isSOT
      ? <SOTChip chip={chip} selectedPin={selectedPinNumber} onSelectPin={setSelectedPin} className="w-full h-full select-none" />
      : <DIPChip chip={chip} selectedPin={selectedPinNumber} onSelectPin={setSelectedPin} className="w-full h-full select-none" />

  return (
    <ZoomableDiagram height={viewportHeight}>
      {diagram}
    </ZoomableDiagram>
  )
}

function SinglePinChip({ chip, selectedPin, onSelectPin, className = '' }) {
  const pin = chip.pins[0]
  const color = pin ? COLORS[pin.type] : '#6b7280'
  const selected = pin && selectedPin === pin.number
  const width = 340
  const height = 220

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className}>
      <rect x={90} y={75} width={170} height={70} rx={6} fill="#1a1a2e" stroke="#333" strokeWidth={2} />
      <text x={175} y={112} textAnchor="middle" fill="#6b7280" fontSize={10} fontFamily="monospace" fontWeight="bold">
        {chip.name}
      </text>
      {pin && (
        <g onClick={() => onSelectPin(pin.number)} className="cursor-pointer">
          <line x1={30} y1={110} x2={90} y2={110} stroke={color} strokeWidth={selected ? 3 : 2} />
          <circle cx={90} cy={110} r={4} fill={color} stroke={selected ? '#fff' : 'none'} strokeWidth={2} />
          <text x={20} y={102} textAnchor="end" fill="#6b7280" fontSize={9} fontFamily="monospace">
            {pin.number}
          </text>
          <text x={20} y={124} textAnchor="end" fill={color} fontSize={10} fontWeight="bold" fontFamily="monospace">
            {pin.name || '?'}
          </text>
        </g>
      )}
    </svg>
  )
}

function ZoomableDiagram({ height, children }) {
  const containerRef = useRef(null)
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0, pointerId: null })

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)

  const clampPan = (nextPan, targetZoom = zoom) => {
    const container = containerRef.current
    if (!container) return nextPan

    const width = container.clientWidth
    const heightPx = container.clientHeight
    const scaledWidth = width * targetZoom
    const scaledHeight = heightPx * targetZoom
    const minX = Math.min(0, width - scaledWidth)
    const minY = Math.min(0, heightPx - scaledHeight)

    return {
      x: clamp(nextPan.x, minX, 0),
      y: clamp(nextPan.y, minY, 0),
    }
  }

  const zoomAt = (targetZoom, originX, originY) => {
    const nextZoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM)
    if (Math.abs(nextZoom - zoom) < 0.0001) return

    const contentX = (originX - pan.x) / zoom
    const contentY = (originY - pan.y) / zoom
    const unclampedPan = {
      x: originX - contentX * nextZoom,
      y: originY - contentY * nextZoom,
    }

    setZoom(nextZoom)
    setPan(clampPan(unclampedPan, nextZoom))
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-md border border-board-border bg-board-surface/40 overflow-hidden"
      style={{ height }}
      onWheel={(event) => {
        if (!event.shiftKey) return
        event.preventDefault()
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        const originX = event.clientX - rect.left
        const originY = event.clientY - rect.top
        const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
        zoomAt(zoom * factor, originX, originY)
      }}
      onPointerDown={(event) => {
        const canPan = event.shiftKey || event.button === 1
        if (!canPan) return
        event.preventDefault()
        panStartRef.current = {
          x: event.clientX,
          y: event.clientY,
          panX: pan.x,
          panY: pan.y,
          pointerId: event.pointerId,
        }
        setIsPanning(true)
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!isPanning) return
        const dx = event.clientX - panStartRef.current.x
        const dy = event.clientY - panStartRef.current.y
        setPan(clampPan({
          x: panStartRef.current.panX + dx,
          y: panStartRef.current.panY + dy,
        }))
      }}
      onPointerUp={(event) => {
        if (!isPanning) return
        if (event.pointerId === panStartRef.current.pointerId) {
          event.currentTarget.releasePointerCapture(event.pointerId)
          setIsPanning(false)
        }
      }}
      onPointerCancel={(event) => {
        if (!isPanning) return
        if (event.pointerId === panStartRef.current.pointerId) {
          setIsPanning(false)
        }
      }}
    >
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/40 border border-board-border rounded px-1 py-1">
        <button
          type="button"
          className="px-2 py-1 text-[10px] text-gray-300 hover:text-white border border-board-border rounded"
          onClick={() => {
            const container = containerRef.current
            if (!container) return
            zoomAt(zoom / ZOOM_STEP, container.clientWidth / 2, container.clientHeight / 2)
          }}
          title="Zoom out"
        >
          -
        </button>
        <button
          type="button"
          className="px-2 py-1 text-[10px] text-gray-300 hover:text-white border border-board-border rounded"
          onClick={() => {
            const container = containerRef.current
            if (!container) return
            zoomAt(zoom * ZOOM_STEP, container.clientWidth / 2, container.clientHeight / 2)
          }}
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="px-2 py-1 text-[10px] text-gray-300 hover:text-white border border-board-border rounded"
          onClick={() => {
            setZoom(1)
            setPan({ x: 0, y: 0 })
          }}
          title="Reset view"
        >
          Reset
        </button>
      </div>

      <div className="absolute bottom-2 left-2 z-10 rounded border border-board-border bg-black/40 px-2 py-1 text-[10px] text-gray-400 pointer-events-none">
        Shift+wheel: zoom · Shift+drag: pan · {Math.round(zoom * 100)}%
      </div>

      <div
        className={isPanning ? 'w-full h-full cursor-grabbing touch-none' : 'w-full h-full touch-none'}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function DIPChip({ chip, selectedPin, onSelectPin, className = '' }) {
  const half = Math.ceil(chip.pins.length / 2)
  const leftPins = chip.pins.slice(0, half)
  const rightPins = chip.pins.slice(half).reverse()
  const pinH = 48
  const chipW = 160
  const pinW = 110
  const totalW = pinW + chipW + pinW
  const chipH = Math.max(half * pinH + 20, 120)

  return (
    <svg viewBox={`0 0 ${totalW} ${chipH + 40}`} className={className}>
      <rect x={pinW} y={20} width={chipW} height={chipH} rx={6} fill="#1a1a2e" stroke="#333" strokeWidth={2} />
      <circle cx={pinW + chipW / 2} cy={20} r={8} fill="#0d0d1a" stroke="#333" strokeWidth={1.5} />
      <text x={pinW + chipW / 2} y={chipH / 2 + 24} textAnchor="middle" fill="#6b7280" fontSize={10} fontFamily="monospace" fontWeight="bold">
        {chip.name}
      </text>

      {leftPins.map((pin, i) => {
        const y = 30 + i * pinH + pinH / 2
        const color = COLORS[pin.type]
        const selected = selectedPin === pin.number
        return (
          <g key={pin.number} onClick={() => onSelectPin(pin.number)} className="cursor-pointer">
            <line x1={0} y1={y} x2={pinW} y2={y} stroke={color} strokeWidth={selected ? 3 : 2} />
            <circle cx={pinW} cy={y} r={4} fill={color} stroke={selected ? '#fff' : 'none'} strokeWidth={2} />
            <text x={pinW - 12} y={y - 8} textAnchor="end" fill="#6b7280" fontSize={9} fontFamily="monospace">{pin.number}</text>
            <text x={pinW - 12} y={y + 12} textAnchor="end" fill={color} fontSize={10} fontWeight="bold" fontFamily="monospace">
              {pin.name || '?'}
            </text>
            {selected && <rect x={0} y={y - pinH / 2 + 4} width={totalW} height={pinH - 8} fill="rgba(255,255,255,0.03)" rx={4} pointerEvents="none" />}
          </g>
        )
      })}

      {rightPins.map((pin, i) => {
        const y = 30 + i * pinH + pinH / 2
        const color = COLORS[pin.type]
        const selected = selectedPin === pin.number
        return (
          <g key={pin.number} onClick={() => onSelectPin(pin.number)} className="cursor-pointer">
            <line x1={pinW + chipW} y1={y} x2={totalW} y2={y} stroke={color} strokeWidth={selected ? 3 : 2} />
            <circle cx={pinW + chipW} cy={y} r={4} fill={color} stroke={selected ? '#fff' : 'none'} strokeWidth={2} />
            <text x={pinW + chipW + 12} y={y - 8} textAnchor="start" fill="#6b7280" fontSize={9} fontFamily="monospace">{pin.number}</text>
            <text x={pinW + chipW + 12} y={y + 12} textAnchor="start" fill={color} fontSize={10} fontWeight="bold" fontFamily="monospace">
              {pin.name || '?'}
            </text>
            {selected && <rect x={0} y={y - pinH / 2 + 4} width={totalW} height={pinH - 8} fill="rgba(255,255,255,0.03)" rx={4} pointerEvents="none" />}
          </g>
        )
      })}
    </svg>
  )
}

function SOTChip({ chip, selectedPin, onSelectPin, className = '' }) {
  const topCount = Math.ceil(chip.pins.length / 2)
  const botCount = chip.pins.length - topCount
  const chipW = Math.max(topCount, botCount) * 70 + 20
  const chipHt = 80
  const pinH = 60
  const totalW = chipW + 40
  const totalH = pinH + chipHt + pinH + 40

  const topPins = chip.pins.slice(0, topCount)
  const botPins = chip.pins.slice(topCount).reverse()

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className={className}>
      <rect x={20} y={pinH + 20} width={chipW} height={chipHt} rx={6} fill="#1a1a2e" stroke="#333" strokeWidth={2} />
      <circle cx={30} cy={pinH + 20} r={4} fill="#0d0d1a" stroke="#333" strokeWidth={1.5} />
      <text x={20 + chipW / 2} y={pinH + 20 + chipHt / 2 + 4} textAnchor="middle" fill="#6b7280" fontSize={9} fontFamily="monospace" fontWeight="bold">
        {chip.name}
      </text>

      {topPins.map((pin, i) => {
        const x = 20 + (chipW / (topCount + 1)) * (i + 1)
        const color = COLORS[pin.type]
        const selected = selectedPin === pin.number
        return (
          <g key={pin.number} onClick={() => onSelectPin(pin.number)} className="cursor-pointer">
            <line x1={x} y1={20} x2={x} y2={pinH + 20} stroke={color} strokeWidth={selected ? 3 : 2} />
            <circle cx={x} cy={pinH + 20} r={4} fill={color} stroke={selected ? '#fff' : 'none'} strokeWidth={2} />
            <text x={x} y={12} textAnchor="middle" fill={color} fontSize={10} fontWeight="bold" fontFamily="monospace">{pin.name || '?'}</text>
            <text x={x} y={pinH + 36} textAnchor="middle" fill="#6b7280" fontSize={9} fontFamily="monospace">{pin.number}</text>
          </g>
        )
      })}

      {botPins.map((pin, i) => {
        const x = 20 + (chipW / (botCount + 1)) * (i + 1)
        const yTop = pinH + 20 + chipHt
        const color = COLORS[pin.type]
        const selected = selectedPin === pin.number
        return (
          <g key={pin.number} onClick={() => onSelectPin(pin.number)} className="cursor-pointer">
            <line x1={x} y1={yTop} x2={x} y2={yTop + pinH} stroke={color} strokeWidth={selected ? 3 : 2} />
            <circle cx={x} cy={yTop} r={4} fill={color} stroke={selected ? '#fff' : 'none'} strokeWidth={2} />
            <text x={x} y={yTop + pinH + 16} textAnchor="middle" fill={color} fontSize={10} fontWeight="bold" fontFamily="monospace">{pin.name || '?'}</text>
            <text x={x} y={yTop - 8} textAnchor="middle" fill="#6b7280" fontSize={9} fontFamily="monospace">{pin.number}</text>
          </g>
        )
      })}
    </svg>
  )
}

function QFPChip({ chip, selectedPin, onSelectPin, className = '' }) {
  const pinsPerSide = Math.ceil(chip.pins.length / 4)
  const pinSpacing = 36
  const chipSize = pinsPerSide * pinSpacing + 20
  const pinLen = 50
  const margin = 80
  const totalSize = chipSize + 2 * pinLen + 2 * margin

  const sides = [
    chip.pins.slice(0, pinsPerSide),
    chip.pins.slice(pinsPerSide, pinsPerSide * 2),
    chip.pins.slice(pinsPerSide * 2, pinsPerSide * 3).reverse(),
    chip.pins.slice(pinsPerSide * 3).reverse(),
  ]

  const chipX = pinLen + margin
  const chipY = pinLen + margin

  return (
    <svg viewBox={`0 0 ${totalSize} ${totalSize}`} className={className}>
      <rect x={chipX} y={chipY} width={chipSize} height={chipSize} rx={6} fill="#1a1a2e" stroke="#333" strokeWidth={2} />
      <circle cx={chipX + 10} cy={chipY + 10} r={5} fill="#0d0d1a" stroke="#333" strokeWidth={1.5} />
      <text x={chipX + chipSize / 2} y={chipY + chipSize / 2 + 4} textAnchor="middle" fill="#6b7280" fontSize={10} fontFamily="monospace" fontWeight="bold">
        {chip.name}
      </text>

      {sides[0].map((pin, i) => {
        const y = chipY + (chipSize / (sides[0].length + 1)) * (i + 1)
        const color = COLORS[pin.type]
        const selected = selectedPin === pin.number
        return (
          <g key={pin.number} onClick={() => onSelectPin(pin.number)} className="cursor-pointer">
            <line x1={chipX - pinLen} y1={y} x2={chipX} y2={y} stroke={color} strokeWidth={selected ? 3 : 1.5} />
            <circle cx={chipX} cy={y} r={3} fill={color} stroke={selected ? '#fff' : 'none'} strokeWidth={2} />
            <text x={chipX - pinLen - 4} y={y + 3} textAnchor="end" fill={color} fontSize={8} fontFamily="monospace">{pin.name || pin.number}</text>
          </g>
        )
      })}

      {sides[1].map((pin, i) => {
        const x = chipX + (chipSize / (sides[1].length + 1)) * (i + 1)
        const color = COLORS[pin.type]
        const selected = selectedPin === pin.number
        return (
          <g key={pin.number} onClick={() => onSelectPin(pin.number)} className="cursor-pointer">
            <line x1={x} y1={chipY + chipSize} x2={x} y2={chipY + chipSize + pinLen} stroke={color} strokeWidth={selected ? 3 : 1.5} />
            <circle cx={x} cy={chipY + chipSize} r={3} fill={color} stroke={selected ? '#fff' : 'none'} strokeWidth={2} />
            <text x={x} y={chipY + chipSize + pinLen + 12} textAnchor="middle" fill={color} fontSize={8} fontFamily="monospace">{pin.name || pin.number}</text>
          </g>
        )
      })}

      {sides[2].map((pin, i) => {
        const y = chipY + (chipSize / (sides[2].length + 1)) * (i + 1)
        const color = COLORS[pin.type]
        const selected = selectedPin === pin.number
        return (
          <g key={pin.number} onClick={() => onSelectPin(pin.number)} className="cursor-pointer">
            <line x1={chipX + chipSize} y1={y} x2={chipX + chipSize + pinLen} y2={y} stroke={color} strokeWidth={selected ? 3 : 1.5} />
            <circle cx={chipX + chipSize} cy={y} r={3} fill={color} stroke={selected ? '#fff' : 'none'} strokeWidth={2} />
            <text x={chipX + chipSize + pinLen + 4} y={y + 3} textAnchor="start" fill={color} fontSize={8} fontFamily="monospace">{pin.name || pin.number}</text>
          </g>
        )
      })}

      {sides[3].map((pin, i) => {
        const x = chipX + (chipSize / (sides[3].length + 1)) * (i + 1)
        const color = COLORS[pin.type]
        const selected = selectedPin === pin.number
        return (
          <g key={pin.number} onClick={() => onSelectPin(pin.number)} className="cursor-pointer">
            <line x1={x} y1={chipY - pinLen} x2={x} y2={chipY} stroke={color} strokeWidth={selected ? 3 : 1.5} />
            <circle cx={x} cy={chipY} r={3} fill={color} stroke={selected ? '#fff' : 'none'} strokeWidth={2} />
            <text x={x} y={chipY - pinLen - 4} textAnchor="middle" fill={color} fontSize={8} fontFamily="monospace">{pin.name || pin.number}</text>
          </g>
        )
      })}
    </svg>
  )
}
