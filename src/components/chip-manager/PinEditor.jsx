import { useEffect, useMemo, useState } from 'react'
import { Link2, Trash2 } from 'lucide-react'
import useProjectStore, { PIN_TYPES } from '../../store/useProjectStore'

function formatPinLabel(pin) {
  return `Pin ${pin.number}${pin.name ? ` / ${pin.name}` : ''}`
}

function getOtherConnectionEnd(connection, chipId, pinNumber) {
  const isFrom = connection.fromChip === chipId && connection.fromPin === pinNumber
  const isTo = connection.toChip === chipId && connection.toPin === pinNumber
  if (!isFrom && !isTo) return null

  return isFrom
    ? { chipId: connection.toChip, pinNumber: connection.toPin }
    : { chipId: connection.fromChip, pinNumber: connection.fromPin }
}

export default function PinEditor({ chip }) {
  const selectedPinNumber = useProjectStore((s) => s.selectedPinNumber)
  const chips = useProjectStore((s) => s.chips)
  const connections = useProjectStore((s) => s.connections)
  const updatePin = useProjectStore((s) => s.updatePin)
  const addConnection = useProjectStore((s) => s.addConnection)
  const removeConnection = useProjectStore((s) => s.removeConnection)

  const pin = chip.pins.find((p) => p.number === selectedPinNumber)
  const otherChips = useMemo(
    () => chips.filter((item) => item.id !== chip.id),
    [chips, chip.id]
  )

  const [targetChipId, setTargetChipId] = useState('')
  const [targetPinNumber, setTargetPinNumber] = useState('')

  useEffect(() => {
    if (!otherChips.length) {
      setTargetChipId('')
      return
    }
    if (!otherChips.some((item) => item.id === targetChipId)) {
      setTargetChipId(otherChips[0].id)
    }
  }, [otherChips, targetChipId])

  const targetChip = useMemo(
    () => chips.find((item) => item.id === targetChipId) || null,
    [chips, targetChipId]
  )

  useEffect(() => {
    const pins = targetChip?.pins || []
    if (!pins.length) {
      setTargetPinNumber('')
      return
    }

    const pinExists = pins.some((item) => String(item.number) === String(targetPinNumber))
    if (!pinExists) {
      setTargetPinNumber(String(pins[0].number))
    }
  }, [targetChip, targetPinNumber])

  const pinConnections = useMemo(
    () => connections.filter((connection) =>
      (connection.fromChip === chip.id && connection.fromPin === pin?.number) ||
      (connection.toChip === chip.id && connection.toPin === pin?.number)
    ),
    [chip.id, connections, pin?.number]
  )

  if (!pin) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-xs border border-dashed border-board-border rounded-lg p-8 text-center">
        Click a pin on the chip diagram to edit it
      </div>
    )
  }

  const pinColor = PIN_TYPES.find((t) => t.value === pin.type)?.color || '#6b7280'
  const canConnect = Boolean(targetChip && targetPinNumber)

  const createConnection = () => {
    if (!canConnect) return

    addConnection({
      fromChip: chip.id,
      fromPin: pin.number,
      toChip: targetChip.id,
      toPin: Number(targetPinNumber),
      protocol: 'other',
      signalName: '',
      notes: '',
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold" style={{ color: pinColor }}>
        Pin {pin.number}
      </h3>

      <label className="block">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Name</span>
        <input
          type="text"
          value={pin.name}
          onChange={(e) => updatePin(chip.id, pin.number, { name: e.target.value })}
          placeholder="e.g. XTAL_IN, SDA, VCC..."
          className="mt-1 block w-full bg-board-bg border border-board-border rounded-md px-3 py-2 text-sm text-gray-200 outline-none focus:border-board-accent transition-colors"
        />
      </label>

      <label className="block">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Type</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PIN_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => updatePin(chip.id, pin.number, { type: t.value })}
              className="px-2.5 py-1 text-[10px] rounded border transition-colors"
              style={{
                borderColor: pin.type === t.value ? t.color : '#333',
                color: pin.type === t.value ? t.color : '#6b7280',
                backgroundColor: pin.type === t.value ? `${t.color}15` : 'transparent',
                fontWeight: pin.type === t.value ? 700 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </label>

      <div className="rounded-md border border-board-border p-3 space-y-3">
        <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider">
          <Link2 size={12} />
          Connect To Another Chip
        </div>

        {otherChips.length === 0 ? (
          <div className="text-xs text-gray-500">
            Add at least one more chip to create pin-to-pin links.
          </div>
        ) : (
          <>
            <select
              value={targetChipId}
              onChange={(e) => setTargetChipId(e.target.value)}
              className="block w-full bg-board-bg border border-board-border rounded-md px-3 py-2 text-xs text-gray-200 outline-none focus:border-board-accent transition-colors"
            >
              {otherChips.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={targetPinNumber}
              onChange={(e) => setTargetPinNumber(e.target.value)}
              className="block w-full bg-board-bg border border-board-border rounded-md px-3 py-2 text-xs text-gray-200 outline-none focus:border-board-accent transition-colors"
            >
              {(targetChip?.pins || []).map((targetPin) => (
                <option key={targetPin.number} value={targetPin.number}>
                  {formatPinLabel(targetPin)}
                </option>
              ))}
            </select>

            <button
              onClick={createConnection}
              disabled={!canConnect}
              className="w-full px-3 py-2 rounded text-xs font-semibold border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Connection
            </button>
          </>
        )}

        <div className="space-y-1">
          {pinConnections.length === 0 ? (
            <div className="text-xs text-gray-500">No pin-to-pin links yet.</div>
          ) : (
            pinConnections.map((connection) => {
              const otherEnd = getOtherConnectionEnd(connection, chip.id, pin.number)
              const otherChip = chips.find((item) => item.id === otherEnd?.chipId)
              const otherPin = otherChip?.pins.find((item) => item.number === otherEnd?.pinNumber)
              return (
                <div
                  key={connection.id}
                  className="flex items-center justify-between rounded border border-board-border bg-board-bg px-2 py-1.5 text-xs"
                >
                  <div className="text-gray-300 truncate pr-2">
                    {otherChip?.name || 'Unknown chip'} - {otherPin ? formatPinLabel(otherPin) : `Pin ${otherEnd?.pinNumber || '?'}`}
                  </div>
                  <button
                    onClick={() => removeConnection(connection.id)}
                    className="text-red-400 hover:text-red-300"
                    title="Remove connection"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      <label className="block">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Connected To (Manual Note)</span>
        <input
          type="text"
          value={pin.connectedTo}
          onChange={(e) => updatePin(chip.id, pin.number, { connectedTo: e.target.value })}
          placeholder="Optional free text note..."
          className="mt-1 block w-full bg-board-bg border border-board-border rounded-md px-3 py-2 text-sm text-gray-200 outline-none focus:border-board-accent transition-colors"
        />
      </label>

      <label className="block">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Notes</span>
        <textarea
          value={pin.notes}
          onChange={(e) => updatePin(chip.id, pin.number, { notes: e.target.value })}
          placeholder="Observations, measurements, guesses..."
          rows={3}
          className="mt-1 block w-full bg-board-bg border border-board-border rounded-md px-3 py-2 text-sm text-gray-200 outline-none focus:border-board-accent transition-colors resize-y"
        />
      </label>
    </div>
  )
}
