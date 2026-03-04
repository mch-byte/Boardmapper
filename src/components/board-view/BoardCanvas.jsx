import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Group, Image, Layer, Line, Rect, Stage, Text } from 'react-konva'
import { inferChipLayoutKind, PIN_TYPES, PROTOCOL_COLORS } from '../../store/useProjectStore'
import useDialogStore from '../../store/useDialogStore'

const MIN_SCALE = 0.2
const MAX_SCALE = 6
const ZOOM_FACTOR = 1.08
const DEFAULT_WORKSPACE_WIDTH = 3200
const DEFAULT_WORKSPACE_HEIGHT = 2200
const PAN_MARGIN = 220
const CONNECTION_FALLBACK_COLORS = [
  '#22c55e',
  '#38bdf8',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#14b8a6',
  '#f97316',
]
const PIN_COLOR_BY_TYPE = PIN_TYPES.reduce((acc, type) => {
  acc[type.value] = type.color
  return acc
}, {})

function getChipNodeLayout(chip) {
  const pinCount = Number(chip?.pinCount || 0)
  const layoutKind = inferChipLayoutKind(chip?.package, pinCount, chip?.layoutKind)

  if (layoutKind === 'single') {
    return {
      kind: 'single',
      width: 86,
      height: 52,
    }
  }

  if (layoutKind === 'quad' || layoutKind === 'array') {
    const pinsPerSide = Math.max(4, Math.ceil(pinCount / 4))
    const edge = clamp(88 + pinsPerSide * 4, 96, 220)
    return {
      kind: 'qfp',
      width: edge,
      height: edge,
      pinsPerSide,
    }
  }

  if (layoutKind === 'sot') {
    const topCount = Math.max(1, Math.ceil(pinCount / 2))
    const bottomCount = Math.max(1, pinCount - topCount)
    const maxSide = Math.max(topCount, bottomCount)
    const width = clamp(88 + maxSide * 16, 96, 190)
    return {
      kind: 'sot',
      width,
      height: 56,
      topCount,
      bottomCount,
    }
  }

  const pinRows = Math.max(2, Math.ceil(pinCount / 2))
  return {
    kind: 'dual',
    width: 120,
    height: Math.max(46, 30 + pinRows * 7),
    pinRows,
  }
}

function useLoadedImage(src) {
  const [image, setImage] = useState(null)

  useEffect(() => {
    if (!src) {
      setImage(null)
      return
    }

    const img = new window.Image()
    img.onload = () => setImage(img)
    img.src = src
  }, [src])

  return image
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function clampStagePosition(position, scale, stageSize, workspaceSize) {
  const scaledWorkspaceWidth = workspaceSize.width * scale
  const scaledWorkspaceHeight = workspaceSize.height * scale

  let minX = stageSize.width - scaledWorkspaceWidth - PAN_MARGIN
  let maxX = PAN_MARGIN
  let minY = stageSize.height - scaledWorkspaceHeight - PAN_MARGIN
  let maxY = PAN_MARGIN

  if (minX > maxX) {
    const centeredX = (stageSize.width - scaledWorkspaceWidth) / 2
    minX = centeredX
    maxX = centeredX
  }

  if (minY > maxY) {
    const centeredY = (stageSize.height - scaledWorkspaceHeight) / 2
    minY = centeredY
    maxY = centeredY
  }

  return {
    x: clamp(position.x, minX, maxX),
    y: clamp(position.y, minY, maxY),
  }
}

function clampChipPosition(position, chipSize, workspaceSize) {
  return {
    x: clamp(position.x, 0, workspaceSize.width - chipSize.width),
    y: clamp(position.y, 0, workspaceSize.height - chipSize.height),
  }
}

function getConnectionColor(connection, index) {
  const protocol = connection.protocol || 'other'
  const protocolColor = PROTOCOL_COLORS[protocol]?.color
  if (protocolColor && protocol !== 'other') return protocolColor
  return CONNECTION_FALLBACK_COLORS[index % CONNECTION_FALLBACK_COLORS.length]
}

function getPinAnchorLocal(chip, pinNumber) {
  const pin = Number(pinNumber)
  if (!Number.isInteger(pin) || pin < 1) return null

  const layout = getChipNodeLayout(chip)
  const x0 = 0
  const y0 = 0

  if (layout.kind === 'single') {
    return {
      x: x0,
      y: y0 + layout.height / 2,
      side: 'left',
    }
  }

  if (layout.kind === 'qfp') {
    const pps = layout.pinsPerSide
    const sideSpacingY = (layout.height - 16) / (pps + 1)
    const sideSpacingX = (layout.width - 16) / (pps + 1)

    if (pin <= pps) {
      const idx = pin - 1
      return {
        x: x0,
        y: y0 + 8 + (idx + 1) * sideSpacingY,
        side: 'left',
      }
    }
    if (pin <= pps * 2) {
      const idx = pin - pps - 1
      return {
        x: x0 + 8 + (idx + 1) * sideSpacingX,
        y: y0 + layout.height,
        side: 'bottom',
      }
    }
    if (pin <= pps * 3) {
      const idx = pps * 3 - pin
      return {
        x: x0 + layout.width,
        y: y0 + 8 + (idx + 1) * sideSpacingY,
        side: 'right',
      }
    }

    const idx = Math.max(0, chip.pinCount - pin)
    return {
      x: x0 + 8 + (idx + 1) * sideSpacingX,
      y: y0,
      side: 'top',
    }
  }

  if (layout.kind === 'sot') {
    const inset = 12
    const topSpacing = layout.topCount > 1 ? (layout.width - inset * 2) / (layout.topCount - 1) : 0
    const bottomSpacing = layout.bottomCount > 1 ? (layout.width - inset * 2) / (layout.bottomCount - 1) : 0

    if (pin <= layout.topCount) {
      const idx = pin - 1
      return {
        x: x0 + inset + idx * topSpacing,
        y: y0,
        side: 'top',
      }
    }

    const idxFromLeft = clamp(chip.pinCount - pin, 0, layout.bottomCount - 1)
    return {
      x: x0 + inset + idxFromLeft * bottomSpacing,
      y: y0 + layout.height,
      side: 'bottom',
    }
  }

  const pinSpacing = (layout.height - 12) / layout.pinRows
  const leftCount = Math.ceil(chip.pinCount / 2)

  if (pin <= leftCount) {
    const rowIndex = clamp(pin - 1, 0, layout.pinRows - 1)
    return {
      x: x0,
      y: y0 + 6 + rowIndex * pinSpacing + 1.5,
      side: 'left',
    }
  }

  const rightIndex = clamp(pin - leftCount - 1, 0, layout.pinRows - 1)
  return {
    x: x0 + layout.width,
    y: y0 + 6 + rightIndex * pinSpacing + 1.5,
    side: 'right',
  }
}

function getPinAnchor(chip, pinNumber) {
  if (!chip?.boardPosition) return null
  const local = getPinAnchorLocal(chip, pinNumber)
  if (!local) return null
  return {
    ...local,
    x: chip.boardPosition.x + local.x,
    y: chip.boardPosition.y + local.y,
  }
}

function getChipBounds(chip) {
  if (!chip?.boardPosition) return null
  const { width, height } = getChipNodeLayout(chip)
  return {
    x1: chip.boardPosition.x,
    y1: chip.boardPosition.y,
    x2: chip.boardPosition.x + width,
    y2: chip.boardPosition.y + height,
  }
}

function rangesOverlap(minA, maxA, minB, maxB) {
  return Math.max(minA, minB) < Math.min(maxA, maxB)
}

function segmentIntersectsRect(segment, rect, padding = 2) {
  const [x1, y1, x2, y2] = segment
  const rx1 = rect.x1 + padding
  const ry1 = rect.y1 + padding
  const rx2 = rect.x2 - padding
  const ry2 = rect.y2 - padding

  if (rx1 >= rx2 || ry1 >= ry2) return false

  if (x1 === x2) {
    if (!(x1 > rx1 && x1 < rx2)) return false
    const segMinY = Math.min(y1, y2)
    const segMaxY = Math.max(y1, y2)
    return rangesOverlap(segMinY, segMaxY, ry1, ry2)
  }

  if (y1 === y2) {
    if (!(y1 > ry1 && y1 < ry2)) return false
    const segMinX = Math.min(x1, x2)
    const segMaxX = Math.max(x1, x2)
    return rangesOverlap(segMinX, segMaxX, rx1, rx2)
  }

  return false
}

function routeIntersectsChips(points, chipBounds) {
  for (let i = 0; i < points.length - 3; i += 2) {
    const segment = [points[i], points[i + 1], points[i + 2], points[i + 3]]
    for (const bounds of chipBounds) {
      if (segmentIntersectsRect(segment, bounds)) return true
    }
  }
  return false
}

function getSideVector(side) {
  if (side === 'left') return { x: -1, y: 0 }
  if (side === 'right') return { x: 1, y: 0 }
  if (side === 'top') return { x: 0, y: -1 }
  return { x: 0, y: 1 }
}

function createConnectionRoute(fromAnchor, toAnchor, laneIndex, chipBounds) {
  const stub = 18
  const outwardGap = 20
  const laneOffset = ((laneIndex % 11) - 5) * 12
  const startPoint = { x: fromAnchor.x, y: fromAnchor.y }
  const endPoint = { x: toAnchor.x, y: toAnchor.y }
  const fromVec = getSideVector(fromAnchor.side)
  const toVec = getSideVector(toAnchor.side)
  const startOuter = {
    x: startPoint.x + fromVec.x * stub,
    y: startPoint.y + fromVec.y * stub,
  }
  const endOuter = {
    x: endPoint.x + toVec.x * stub,
    y: endPoint.y + toVec.y * stub,
  }

  const enforceOutwardX = (candidateX) => {
    let x = candidateX
    if (fromAnchor.side === 'left') x = Math.min(x, startOuter.x - outwardGap)
    if (fromAnchor.side === 'right') x = Math.max(x, startOuter.x + outwardGap)
    if (toAnchor.side === 'left') x = Math.min(x, endOuter.x - outwardGap)
    if (toAnchor.side === 'right') x = Math.max(x, endOuter.x + outwardGap)
    return x
  }
  const enforceOutwardY = (candidateY) => {
    let y = candidateY
    if (fromAnchor.side === 'top') y = Math.min(y, startOuter.y - outwardGap)
    if (fromAnchor.side === 'bottom') y = Math.max(y, startOuter.y + outwardGap)
    if (toAnchor.side === 'top') y = Math.min(y, endOuter.y - outwardGap)
    if (toAnchor.side === 'bottom') y = Math.max(y, endOuter.y + outwardGap)
    return y
  }

  const buildViaX = (routeX) => {
    const x = enforceOutwardX(routeX)
    return [
      startPoint.x, startPoint.y,
      startOuter.x, startOuter.y,
      x, startOuter.y,
      x, endOuter.y,
      endOuter.x, endOuter.y,
      endPoint.x, endPoint.y,
    ]
  }
  const buildViaY = (routeY) => {
    const y = enforceOutwardY(routeY)
    return [
      startPoint.x, startPoint.y,
      startOuter.x, startOuter.y,
      startOuter.x, y,
      endOuter.x, y,
      endOuter.x, endOuter.y,
      endPoint.x, endPoint.y,
    ]
  }

  const minX = Math.min(...chipBounds.map((bounds) => bounds.x1))
  const maxX = Math.max(...chipBounds.map((bounds) => bounds.x2))
  const minY = Math.min(...chipBounds.map((bounds) => bounds.y1))
  const maxY = Math.max(...chipBounds.map((bounds) => bounds.y2))

  const primaryX = (startOuter.x + endOuter.x) / 2 + laneOffset
  const primaryY = (startOuter.y + endOuter.y) / 2 + laneOffset

  const horizontalSource = fromAnchor.side === 'left' || fromAnchor.side === 'right'
  const horizontalTarget = toAnchor.side === 'left' || toAnchor.side === 'right'
  const verticalSource = !horizontalSource
  const verticalTarget = !horizontalTarget

  const candidateRoutes = [
    ...(horizontalSource && horizontalTarget
      ? [buildViaX(primaryX)]
      : []),
    ...(verticalSource && verticalTarget
      ? [buildViaY(primaryY)]
      : []),
    buildViaX(primaryX),
    buildViaY(primaryY),
    buildViaY(minY - 52 - Math.abs(laneOffset)),
    buildViaY(maxY + 52 + Math.abs(laneOffset)),
    buildViaX(minX - 62 - Math.abs(laneOffset)),
    buildViaX(maxX + 62 + Math.abs(laneOffset)),
    ...(horizontalSource !== horizontalTarget || verticalSource !== verticalTarget
      ? [buildViaX((startOuter.x + endOuter.x) / 2), buildViaY((startOuter.y + endOuter.y) / 2)]
      : []),
  ]

  const selected = candidateRoutes.find((points) => !routeIntersectsChips(points, chipBounds))
    || candidateRoutes[0]

  return {
    startPoint,
    endPoint,
    points: selected,
  }
}

function ChipNode({
  chip,
  position,
  isActive,
  onSelect,
  onPinClick,
  pendingPin,
  onMoveLive,
  onMove,
  workspaceSize,
}) {
  const layout = getChipNodeLayout(chip)
  const { width, height } = layout
  const pinRows = layout.kind === 'dual' ? layout.pinRows : 0
  const pinSpacing = pinRows > 0 ? (height - 12) / pinRows : 0
  const subtitle = chip.package
    ? `${chip.package}  |  ${chip.pinCount} pins`
    : `${chip.pinCount} pins`

  return (
    <Group
      x={position.x}
      y={position.y}
      draggable
      onClick={(event) => {
        event.cancelBubble = true
        onSelect(chip.id)
      }}
      onTap={(event) => {
        event.cancelBubble = true
        onSelect(chip.id)
      }}
      onDragStart={(event) => {
        event.cancelBubble = true
      }}
      onDragMove={(event) => {
        event.cancelBubble = true
        const clamped = clampChipPosition(
          { x: event.target.x(), y: event.target.y() },
          { width, height },
          workspaceSize
        )
        event.target.position(clamped)
        onMoveLive(chip.id, clamped)
      }}
      onDragEnd={(event) => {
        event.cancelBubble = true
        const clamped = clampChipPosition(
          { x: event.target.x(), y: event.target.y() },
          { width, height },
          workspaceSize
        )
        event.target.position(clamped)
        onMoveLive(chip.id, clamped)
        onMove(chip.id, clamped)
      }}
      dragBoundFunc={(position) => clampChipPosition(position, { width, height }, workspaceSize)}
    >
      <Rect
        width={width}
        height={height}
        cornerRadius={6}
        fill={isActive ? '#083344' : '#161622'}
        stroke={isActive ? '#06b6d4' : '#3f3f46'}
        strokeWidth={isActive ? 2 : 1}
        shadowColor="#000"
        shadowOpacity={0.3}
        shadowBlur={8}
        shadowOffset={{ x: 0, y: 2 }}
      />

      {layout.kind === 'dual' && (
        <>
          {Array.from({ length: pinRows }).map((_, i) => (
            <Rect
              key={`lp-${chip.id}-${i}`}
              x={-2}
              y={6 + i * pinSpacing}
              width={4}
              height={3}
              fill="#6b7280"
            />
          ))}
          {Array.from({ length: pinRows }).map((_, i) => (
            <Rect
              key={`rp-${chip.id}-${i}`}
              x={width - 2}
              y={6 + i * pinSpacing}
              width={4}
              height={3}
              fill="#6b7280"
            />
          ))}
        </>
      )}

      {layout.kind === 'single' && (
        <Rect x={-2} y={height / 2 - 1.5} width={4} height={3} fill="#6b7280" />
      )}

      {layout.kind === 'sot' && (
        <>
          {Array.from({ length: layout.topCount }).map((_, i) => {
            const inset = 12
            const step = layout.topCount > 1 ? (width - inset * 2) / (layout.topCount - 1) : 0
            return (
              <Rect
                key={`tp-${chip.id}-${i}`}
                x={inset + i * step - 1.5}
                y={-2}
                width={3}
                height={4}
                fill="#6b7280"
              />
            )
          })}
          {Array.from({ length: layout.bottomCount }).map((_, i) => {
            const inset = 12
            const step = layout.bottomCount > 1 ? (width - inset * 2) / (layout.bottomCount - 1) : 0
            return (
              <Rect
                key={`bp-${chip.id}-${i}`}
                x={inset + i * step - 1.5}
                y={height - 2}
                width={3}
                height={4}
                fill="#6b7280"
              />
            )
          })}
        </>
      )}

      {layout.kind === 'qfp' && (
        <>
          {Array.from({ length: layout.pinsPerSide }).map((_, i) => {
            const stepY = (height - 16) / (layout.pinsPerSide + 1)
            return (
              <Rect
                key={`ql-${chip.id}-${i}`}
                x={-2}
                y={8 + (i + 1) * stepY - 1.5}
                width={4}
                height={3}
                fill="#6b7280"
              />
            )
          })}
          {Array.from({ length: layout.pinsPerSide }).map((_, i) => {
            const stepY = (height - 16) / (layout.pinsPerSide + 1)
            return (
              <Rect
                key={`qr-${chip.id}-${i}`}
                x={width - 2}
                y={8 + (i + 1) * stepY - 1.5}
                width={4}
                height={3}
                fill="#6b7280"
              />
            )
          })}
          {Array.from({ length: layout.pinsPerSide }).map((_, i) => {
            const stepX = (width - 16) / (layout.pinsPerSide + 1)
            return (
              <Rect
                key={`qt-${chip.id}-${i}`}
                x={8 + (i + 1) * stepX - 1.5}
                y={-2}
                width={3}
                height={4}
                fill="#6b7280"
              />
            )
          })}
          {Array.from({ length: layout.pinsPerSide }).map((_, i) => {
            const stepX = (width - 16) / (layout.pinsPerSide + 1)
            return (
              <Rect
                key={`qb-${chip.id}-${i}`}
                x={8 + (i + 1) * stepX - 1.5}
                y={height - 2}
                width={3}
                height={4}
                fill="#6b7280"
              />
            )
          })}
        </>
      )}

      <Text
        x={8}
        y={8}
        width={width - 16}
        text={chip.name}
        fill="#e5e7eb"
        fontSize={11}
        fontStyle="bold"
        ellipsis
      />

      <Text
        x={8}
        y={24}
        width={width - 16}
        text={subtitle}
        fill="#9ca3af"
        fontSize={9}
        ellipsis
      />

      {chip.pins.map((pin) => {
        const anchor = getPinAnchorLocal(chip, pin.number)
        if (!anchor) return null
        const isPending = pendingPin
          && pendingPin.chipId === chip.id
          && pendingPin.pinNumber === pin.number
        const color = PIN_COLOR_BY_TYPE[pin.type] || '#9ca3af'
        return (
          <Circle
            key={`pin-dot-${chip.id}-${pin.number}`}
            x={anchor.x}
            y={anchor.y}
            radius={isPending ? 4.8 : 3.8}
            fill={isPending ? '#22d3ee' : color}
            stroke={isPending ? '#ffffff' : '#0a0a10'}
            strokeWidth={isPending ? 1.5 : 1.1}
            opacity={0.97}
            onClick={(event) => {
              event.cancelBubble = true
              onSelect(chip.id)
              onPinClick?.({ chipId: chip.id, pinNumber: pin.number })
            }}
            onTap={(event) => {
              event.cancelBubble = true
              onSelect(chip.id)
              onPinClick?.({ chipId: chip.id, pinNumber: pin.number })
            }}
          />
        )
      })}
    </Group>
  )
}

export default function BoardCanvas({
  chips,
  connections,
  activeChipId,
  boardImage,
  onDropChip,
  onMoveChip,
  onSelectChip,
  onPinClick,
  onRemoveConnection,
  pendingPin,
  dragMime,
}) {
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 })
  const [liveChipPositions, setLiveChipPositions] = useState({})
  const [pointerWorld, setPointerWorld] = useState(null)
  const [selectedConnectionId, setSelectedConnectionId] = useState(null)
  const requestConfirm = useDialogStore((s) => s.requestConfirm)

  const boardBitmap = useLoadedImage(boardImage?.dataUrl)
  const workspaceSize = useMemo(() => {
    const boardWidth = boardBitmap?.width ?? 0
    const boardHeight = boardBitmap?.height ?? 0
    return {
      width: Math.max(DEFAULT_WORKSPACE_WIDTH, stageSize.width + 800, boardWidth + 400),
      height: Math.max(DEFAULT_WORKSPACE_HEIGHT, stageSize.height + 800, boardHeight + 400),
    }
  }, [boardBitmap, stageSize.height, stageSize.width])
  const boardOffset = useMemo(() => {
    if (!boardBitmap) return { x: 0, y: 0 }
    return {
      x: (workspaceSize.width - boardBitmap.width) / 2,
      y: (workspaceSize.height - boardBitmap.height) / 2,
    }
  }, [boardBitmap, workspaceSize.height, workspaceSize.width])

  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      const rect = containerRef.current.getBoundingClientRect()
      setStageSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const nextPositions = {}
    chips.forEach((chip) => {
      if (!chip.boardPosition) return
      nextPositions[chip.id] = chip.boardPosition
    })
    setLiveChipPositions(nextPositions)
  }, [chips])

  useEffect(() => {
    if (!selectedConnectionId) return
    const stillExists = connections.some((connection) => connection.id === selectedConnectionId)
    if (!stillExists) setSelectedConnectionId(null)
  }, [connections, selectedConnectionId])

  useEffect(() => {
    if (!selectedConnectionId || !onRemoveConnection) return

    const onKeyDown = (event) => {
      const target = event.target
      const isTextInput = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target?.isContentEditable
      if (isTextInput) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        const connectionId = selectedConnectionId
        void (async () => {
          const confirmed = await requestConfirm({
            title: 'Delete connection',
            message: 'Delete this connection?',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            tone: 'danger',
          })
          if (!confirmed) return
          onRemoveConnection(connectionId)
          setSelectedConnectionId((current) => (current === connectionId ? null : current))
        })()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onRemoveConnection, requestConfirm, selectedConnectionId])

  useEffect(() => {
    if (!stageSize.width || !stageSize.height) return

    if (!boardBitmap) {
      const scale = 1
      const centeredPosition = clampStagePosition(
        {
          x: (stageSize.width - workspaceSize.width * scale) / 2,
          y: (stageSize.height - workspaceSize.height * scale) / 2,
        },
        scale,
        stageSize,
        workspaceSize
      )
      setViewport({ x: centeredPosition.x, y: centeredPosition.y, scale })
      return
    }

    const fitWidth = boardBitmap ? boardBitmap.width : workspaceSize.width
    const fitHeight = boardBitmap ? boardBitmap.height : workspaceSize.height
    const fitX = boardBitmap ? boardOffset.x : 0
    const fitY = boardBitmap ? boardOffset.y : 0

    const fitScale = Math.min(stageSize.width / fitWidth, stageSize.height / fitHeight)
    const scale = clamp(fitScale * 0.95, MIN_SCALE, MAX_SCALE)
    const nextPosition = clampStagePosition(
      {
        x: (stageSize.width - fitWidth * scale) / 2 - fitX * scale,
        y: (stageSize.height - fitHeight * scale) / 2 - fitY * scale,
      },
      scale,
      stageSize,
      workspaceSize
    )

    setViewport({ x: nextPosition.x, y: nextPosition.y, scale })
  }, [
    boardBitmap,
    boardImage?.dataUrl,
    boardOffset.x,
    boardOffset.y,
    stageSize.height,
    stageSize.width,
    workspaceSize.height,
    workspaceSize.width,
  ])

  const chipsWithLivePositions = useMemo(
    () => chips.map((chip) => ({
      ...chip,
      boardPosition: liveChipPositions[chip.id] || chip.boardPosition,
    })),
    [chips, liveChipPositions]
  )
  const placedChips = useMemo(
    () => chipsWithLivePositions.filter((chip) => chip.boardPosition),
    [chipsWithLivePositions]
  )
  const chipsById = useMemo(
    () => new Map(chipsWithLivePositions.map((chip) => [chip.id, chip])),
    [chipsWithLivePositions]
  )
  const chipBoundsById = useMemo(() => {
    const bounds = new Map()
    chipsWithLivePositions.forEach((chip) => {
      const chipBounds = getChipBounds(chip)
      if (chipBounds) bounds.set(chip.id, chipBounds)
    })
    return bounds
  }, [chipsWithLivePositions])
  const pendingAnchor = useMemo(() => {
    if (!pendingPin) return null
    const chip = chipsById.get(pendingPin.chipId)
    if (!chip) return null
    return getPinAnchor(chip, pendingPin.pinNumber)
  }, [chipsById, pendingPin])
  const visibleConnections = useMemo(() => (
    connections
      .map((connection, index) => {
        const fromChip = chipsById.get(connection.fromChip)
        const toChip = chipsById.get(connection.toChip)
        if (!fromChip?.boardPosition || !toChip?.boardPosition) return null

        const fromPoint = getPinAnchor(fromChip, connection.fromPin)
        const toPoint = getPinAnchor(toChip, connection.toPin)
        if (!fromPoint || !toPoint) return null

        const fromBounds = chipBoundsById.get(fromChip.id)
        const toBounds = chipBoundsById.get(toChip.id)
        if (!fromBounds || !toBounds) return null

        const route = createConnectionRoute(
          fromPoint,
          toPoint,
          index,
          [fromBounds, toBounds, ...Array.from(chipBoundsById.values())]
        )
        const protocolColor = getConnectionColor(connection, index)

        return {
          id: connection.id,
          fromChip: connection.fromChip,
          fromPin: connection.fromPin,
          toChip: connection.toChip,
          toPin: connection.toPin,
          fromPoint: route.startPoint,
          toPoint: route.endPoint,
          routePoints: route.points,
          color: protocolColor,
        }
      })
      .filter(Boolean)
  ), [chipsById, chipBoundsById, connections])

  const stagePointFromClient = (clientX, clientY) => {
    const stage = stageRef.current
    if (!stage) return null
    const rect = stage.container().getBoundingClientRect()
    return {
      x: (clientX - rect.left - viewport.x) / viewport.scale,
      y: (clientY - rect.top - viewport.y) / viewport.scale,
    }
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const chipId = event.dataTransfer.getData(dragMime) || event.dataTransfer.getData('text/plain')
    if (!chipId) return

    const point = stagePointFromClient(event.clientX, event.clientY)
    if (!point) return

    const chip = chips.find((item) => item.id === chipId)
    if (!chip) return
    const chipSize = getChipNodeLayout(chip)
    const centeredPosition = clampChipPosition(
      {
        x: point.x - chipSize.width / 2,
        y: point.y - chipSize.height / 2,
      },
      chipSize,
      workspaceSize
    )
    setLiveChipPositions((current) => ({
      ...current,
      [chipId]: centeredPosition,
    }))
    onDropChip(chipId, centeredPosition)
  }

  const handleWheel = (event) => {
    event.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const oldScale = viewport.scale
    const mousePoint = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    }

    const direction = event.evt.deltaY > 0 ? -1 : 1
    const newScale = clamp(
      direction > 0 ? oldScale * ZOOM_FACTOR : oldScale / ZOOM_FACTOR,
      MIN_SCALE,
      MAX_SCALE
    )

    const unclamped = {
      scale: newScale,
      x: pointer.x - mousePoint.x * newScale,
      y: pointer.y - mousePoint.y * newScale,
    }
    const clampedPosition = clampStagePosition(
      { x: unclamped.x, y: unclamped.y },
      newScale,
      stageSize,
      workspaceSize
    )

    setViewport({
      scale: newScale,
      x: clampedPosition.x,
      y: clampedPosition.y,
    })
  }

  const handleChipMoveLive = (chipId, position) => {
    setLiveChipPositions((current) => ({
      ...current,
      [chipId]: position,
    }))
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-board-bg"
      onDrop={handleDrop}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
    >
      {stageSize.width > 0 && stageSize.height > 0 && (
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          x={viewport.x}
          y={viewport.y}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          draggable
          dragBoundFunc={(position) =>
            clampStagePosition(position, viewport.scale, stageSize, workspaceSize)
          }
          onWheel={handleWheel}
          onMouseDown={(event) => {
            if (event.target === event.target.getStage()) {
              onSelectChip(null)
              setSelectedConnectionId(null)
            }
          }}
          onMouseMove={() => {
            const stage = stageRef.current
            const pointer = stage?.getPointerPosition()
            if (!pointer) {
              setPointerWorld(null)
              return
            }
            setPointerWorld({
              x: (pointer.x - viewport.x) / viewport.scale,
              y: (pointer.y - viewport.y) / viewport.scale,
            })
          }}
          onMouseLeave={() => {
            setPointerWorld(null)
          }}
          onDragMove={(event) => {
            if (event.target !== event.target.getStage()) return
            setViewport((current) => ({
              ...current,
              x: event.target.x(),
              y: event.target.y(),
            }))
          }}
          onDragEnd={(event) => {
            if (event.target !== event.target.getStage()) return
            setViewport((current) => ({
              ...current,
              x: event.target.x(),
              y: event.target.y(),
            }))
          }}
        >
          <Layer>
            <Rect x={0} y={0} width={workspaceSize.width} height={workspaceSize.height} fill="#0a0a10" listening={false} />

            {Array.from({ length: Math.floor(workspaceSize.width / 100) + 1 }).map((_, i) => (
              <Line
                key={`grid-v-${i}`}
                points={[i * 100, 0, i * 100, workspaceSize.height]}
                stroke="#141421"
                strokeWidth={1}
                listening={false}
              />
            ))}
            {Array.from({ length: Math.floor(workspaceSize.height / 100) + 1 }).map((_, i) => (
              <Line
                key={`grid-h-${i}`}
                points={[0, i * 100, workspaceSize.width, i * 100]}
                stroke="#141421"
                strokeWidth={1}
                listening={false}
              />
            ))}

            <Rect
              x={0}
              y={0}
              width={workspaceSize.width}
              height={workspaceSize.height}
              stroke="#2a2a3a"
              strokeWidth={2}
              listening={false}
            />

            {boardBitmap && (
              <Image
                image={boardBitmap}
                x={boardOffset.x}
                y={boardOffset.y}
                width={boardBitmap.width}
                height={boardBitmap.height}
                listening={false}
              />
            )}
          </Layer>

          <Layer>
            {visibleConnections.map((connection) => (
              <Group key={connection.id}>
                <Line
                  points={connection.routePoints}
                  stroke={connection.color}
                  strokeWidth={selectedConnectionId === connection.id ? 3.8 : 2.5}
                  opacity={selectedConnectionId === connection.id ? 1 : 0.95}
                  lineCap="round"
                  lineJoin="round"
                  hitStrokeWidth={12}
                  shadowColor={selectedConnectionId === connection.id ? '#ffffff' : undefined}
                  shadowBlur={selectedConnectionId === connection.id ? 6 : 0}
                  onMouseDown={(event) => {
                    event.cancelBubble = true
                    setSelectedConnectionId(connection.id)
                  }}
                  onClick={(event) => {
                    event.cancelBubble = true
                    setSelectedConnectionId(connection.id)
                  }}
                  onTap={(event) => {
                    event.cancelBubble = true
                    setSelectedConnectionId(connection.id)
                  }}
                  onContextMenu={(event) => {
                    void (async () => {
                      event.evt.preventDefault()
                      event.cancelBubble = true
                      const confirmed = await requestConfirm({
                        title: 'Delete connection',
                        message: 'Delete this connection?',
                        confirmLabel: 'Delete',
                        cancelLabel: 'Cancel',
                        tone: 'danger',
                      })
                      if (confirmed) {
                        onRemoveConnection?.(connection.id)
                        setSelectedConnectionId((current) => (
                          current === connection.id ? null : current
                        ))
                      }
                    })()
                  }}
                />
              </Group>
            ))}
          </Layer>

          <Layer listening={false}>
            {visibleConnections.map((connection) => (
              <Group key={`end-${connection.id}`} listening={false}>
                <Circle x={connection.fromPoint.x} y={connection.fromPoint.y} radius={3.5} fill="#0a0a10" />
                <Circle x={connection.toPoint.x} y={connection.toPoint.y} radius={3.5} fill="#0a0a10" />
                <Circle x={connection.fromPoint.x} y={connection.fromPoint.y} radius={2.4} fill={connection.color} />
                <Circle x={connection.toPoint.x} y={connection.toPoint.y} radius={2.4} fill={connection.color} />
              </Group>
            ))}
          </Layer>

          <Layer listening={false}>
            {pendingAnchor && pointerWorld && (
              <Line
                points={[pendingAnchor.x, pendingAnchor.y, pointerWorld.x, pointerWorld.y]}
                stroke="#22d3ee"
                strokeWidth={2}
                dash={[8, 6]}
                opacity={0.9}
                lineCap="round"
              />
            )}
            {pendingAnchor && (
              <Circle
                x={pendingAnchor.x}
                y={pendingAnchor.y}
                radius={5}
                fill="#0a0a10"
                stroke="#22d3ee"
                strokeWidth={2}
              />
            )}
          </Layer>

          <Layer>
            {placedChips.map((chip) => (
              <ChipNode
                key={chip.id}
                chip={chip}
                position={chip.boardPosition}
                isActive={chip.id === activeChipId}
                onSelect={onSelectChip}
                onPinClick={onPinClick}
                pendingPin={pendingPin}
                onMoveLive={handleChipMoveLive}
                onMove={onMoveChip}
                workspaceSize={workspaceSize}
              />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  )
}
