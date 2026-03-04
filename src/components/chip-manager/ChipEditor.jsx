import useProjectStore, { PACKAGES } from '../../store/useProjectStore'
import ChipDiagram from './ChipDiagram'
import PinEditor from './PinEditor'
import PinTable from './PinTable'

export default function ChipEditor() {
  const activeChipId = useProjectStore((s) => s.activeChipId)
  const chip = useProjectStore((s) => s.chips.find((c) => c.id === s.activeChipId))
  const updateChip = useProjectStore((s) => s.updateChip)
  const changePackage = useProjectStore((s) => s.changePackage)
  const selectedPinNumber = useProjectStore((s) => s.selectedPinNumber)

  if (!chip) return null

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={chip.name}
            onChange={(e) => updateChip(activeChipId, { name: e.target.value })}
            placeholder="Chip name..."
            className="flex-1 bg-board-bg border border-board-border rounded-md px-3 py-2 text-sm text-gray-200 outline-none focus:border-board-accent transition-colors"
          />
          <select
            value={chip.package}
            onChange={(e) => changePackage(activeChipId, e.target.value)}
            className="bg-board-bg border border-board-border rounded-md px-3 py-2 text-sm text-gray-200 outline-none focus:border-board-accent transition-colors"
          >
            {chip.package && !PACKAGES[chip.package] && (
              <option value={chip.package}>{chip.package}</option>
            )}
            {Object.keys(PACKAGES).map((pkg) => (
              <option key={pkg} value={pkg}>{pkg}</option>
            ))}
          </select>
        </div>

        <div className="bg-board-bg border border-board-border rounded-lg p-6 mb-6">
          <ChipDiagram chip={chip} />
        </div>

        <PinTable chip={chip} />
      </div>

      <div className="w-80 border-l border-board-border p-4 overflow-auto shrink-0">
        <PinEditor chip={chip} />
      </div>
    </div>
  )
}
