import useProjectStore, { PIN_TYPES } from '../../store/useProjectStore'

function formatPinLabel(pin) {
  return `Pin ${pin.number}${pin.name ? ` / ${pin.name}` : ''}`
}

function pinNumberEquals(a, b) {
  return String(a) === String(b)
}

export default function PinTable({ chip }) {
  const selectedPinNumber = useProjectStore((s) => s.selectedPinNumber)
  const setSelectedPin = useProjectStore((s) => s.setSelectedPin)
  const chips = useProjectStore((s) => s.chips)
  const connections = useProjectStore((s) => s.connections)

  const getConnectionSummary = (pin) => {
    const linkedConnections = connections.filter((connection) =>
      (connection.fromChip === chip.id && pinNumberEquals(connection.fromPin, pin.number)) ||
      (connection.toChip === chip.id && pinNumberEquals(connection.toPin, pin.number))
    )

    if (linkedConnections.length === 0) return pin.connectedTo || '—'

    return linkedConnections.map((connection) => {
      const otherEnd = connection.fromChip === chip.id && pinNumberEquals(connection.fromPin, pin.number)
        ? { chipId: connection.toChip, pinNumber: connection.toPin }
        : { chipId: connection.fromChip, pinNumber: connection.fromPin }

      const otherChip = chips.find((item) => item.id === otherEnd.chipId)
      const otherPin = otherChip?.pins.find((item) => pinNumberEquals(item.number, otherEnd.pinNumber))

      if (!otherChip) return `Unknown chip - Pin ${otherEnd.pinNumber}`
      if (!otherPin) return `${otherChip.name} - Pin ${otherEnd.pinNumber}`
      return `${otherChip.name} - ${formatPinLabel(otherPin)}`
    }).join(', ')
  }

  return (
    <div className="bg-board-surface border border-board-border rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-board-bg">
            <th className="px-3 py-2 text-left text-gray-500 font-semibold">#</th>
            <th className="px-3 py-2 text-left text-gray-500 font-semibold">Name</th>
            <th className="px-3 py-2 text-left text-gray-500 font-semibold">Type</th>
            <th className="px-3 py-2 text-left text-gray-500 font-semibold">Connected To</th>
            <th className="px-3 py-2 text-left text-gray-500 font-semibold">Notes</th>
          </tr>
        </thead>
        <tbody>
          {chip.pins.map((pin) => {
            const typeInfo = PIN_TYPES.find((t) => t.value === pin.type)
            const selected = pinNumberEquals(selectedPinNumber, pin.number)
            const connectionSummary = getConnectionSummary(pin)
            return (
              <tr
                key={pin.number}
                onClick={() => setSelectedPin(pin.number)}
                className={`cursor-pointer border-t border-board-border transition-colors ${
                  selected ? 'bg-board-accent/5' : 'hover:bg-white/[0.02]'
                }`}
              >
                <td className="px-3 py-1.5 text-gray-500">{pin.number}</td>
                <td className="px-3 py-1.5 font-semibold" style={{ color: typeInfo?.color }}>
                  {pin.name || '—'}
                </td>
                <td className="px-3 py-1.5">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px]"
                    style={{
                      backgroundColor: `${typeInfo?.color}15`,
                      color: typeInfo?.color,
                    }}
                  >
                    {typeInfo?.label}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-gray-500 max-w-[280px] truncate" title={connectionSummary}>
                  {connectionSummary}
                </td>
                <td className="px-3 py-1.5 text-gray-600 truncate max-w-[200px]">{pin.notes || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
