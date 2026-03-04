import { useState, useEffect } from 'react'
import { Search, X, Download } from 'lucide-react'
import useProjectStore from '../../store/useProjectStore'
import useDialogStore from '../../store/useDialogStore'

const BUILTIN_CHIPS = [
  {
    id: 'at24c02-soic8',
    name: 'AT24C02',
    manufacturer: 'Microchip',
    description: '2Kbit I2C EEPROM',
    category: 'EEPROM',
    package: 'DIP-8 / SOIC-8',
    pins: [
      { number: 1, name: 'A0', type: 'input', description: 'Address bit 0' },
      { number: 2, name: 'A1', type: 'input', description: 'Address bit 1' },
      { number: 3, name: 'A2', type: 'input', description: 'Address bit 2' },
      { number: 4, name: 'GND', type: 'gnd', description: 'Ground' },
      { number: 5, name: 'SDA', type: 'data', description: 'Serial Data' },
      { number: 6, name: 'SCL', type: 'clock', description: 'Serial Clock' },
      { number: 7, name: 'WP', type: 'input', description: 'Write Protect' },
      { number: 8, name: 'VCC', type: 'vcc', description: 'Power Supply (1.7V-5.5V)' },
    ],
  },
  {
    id: 'cmt2210lh',
    name: 'CMT2210LH',
    manufacturer: 'CMOSTEK',
    description: 'Sub-GHz OOK/ASK Receiver',
    category: 'RF',
    package: 'DIP-8 / SOIC-8',
    pins: [
      { number: 1, name: 'VDD', type: 'vcc', description: 'Power Supply' },
      { number: 2, name: 'GIO1', type: 'io', description: 'GPIO / Config' },
      { number: 3, name: 'GIO2', type: 'output', description: 'Data Output' },
      { number: 4, name: 'XI', type: 'clock', description: 'Crystal Input' },
      { number: 5, name: 'XO', type: 'clock', description: 'Crystal Output' },
      { number: 6, name: 'GND', type: 'gnd', description: 'Ground' },
      { number: 7, name: 'RFIN', type: 'input', description: 'RF Input' },
      { number: 8, name: 'GND2', type: 'gnd', description: 'Ground' },
    ],
  },
  {
    id: 'attiny85-soic8',
    name: 'ATtiny85',
    manufacturer: 'Microchip',
    description: '8-bit AVR MCU, 8KB Flash',
    category: 'MCU',
    package: 'DIP-8 / SOIC-8',
    pins: [
      { number: 1, name: 'PB5/RESET', type: 'io', description: 'Port B5 / Reset' },
      { number: 2, name: 'PB3', type: 'io', description: 'Port B3 / ADC3' },
      { number: 3, name: 'PB4', type: 'io', description: 'Port B4 / ADC2' },
      { number: 4, name: 'GND', type: 'gnd', description: 'Ground' },
      { number: 5, name: 'PB0/MOSI', type: 'io', description: 'Port B0 / MOSI / SDA' },
      { number: 6, name: 'PB1/MISO', type: 'io', description: 'Port B1 / MISO' },
      { number: 7, name: 'PB2/SCK', type: 'io', description: 'Port B2 / SCK / SCL' },
      { number: 8, name: 'VCC', type: 'vcc', description: 'Power Supply' },
    ],
  },
  {
    id: 'ne555-soic8',
    name: 'NE555',
    manufacturer: 'Various',
    description: 'Timer IC',
    category: 'Analog',
    package: 'DIP-8 / SOIC-8',
    pins: [
      { number: 1, name: 'GND', type: 'gnd', description: 'Ground' },
      { number: 2, name: 'TRIG', type: 'input', description: 'Trigger' },
      { number: 3, name: 'OUT', type: 'output', description: 'Output' },
      { number: 4, name: 'RESET', type: 'input', description: 'Reset (active low)' },
      { number: 5, name: 'CTRL', type: 'input', description: 'Control Voltage' },
      { number: 6, name: 'THRESH', type: 'input', description: 'Threshold' },
      { number: 7, name: 'DISCH', type: 'output', description: 'Discharge' },
      { number: 8, name: 'VCC', type: 'vcc', description: 'Power Supply (4.5V-16V)' },
    ],
  },
  {
    id: 'lm1117-sot223',
    name: 'LM1117',
    manufacturer: 'TI',
    description: '800mA LDO Voltage Regulator',
    category: 'Power',
    package: 'SOT23-5',
    pins: [
      { number: 1, name: 'GND/ADJ', type: 'gnd', description: 'Ground or Adjust' },
      { number: 2, name: 'OUT', type: 'output', description: 'Regulated Output' },
      { number: 3, name: 'IN', type: 'vcc', description: 'Input Voltage' },
      { number: 4, name: 'OUT2', type: 'output', description: 'Output (tab)' },
      { number: 5, name: 'NC', type: 'nc', description: 'No Connect' },
    ],
  },
]

export default function ChipLibrary({ onClose }) {
  const [search, setSearch] = useState('')
  const [chips, setChips] = useState(BUILTIN_CHIPS)
  const [loading, setLoading] = useState(false)
  const importChipFromLibrary = useProjectStore((s) => s.importChipFromLibrary)
  const requestNotice = useDialogStore((s) => s.requestNotice)

  useEffect(() => {
    fetch('./chips/index.json')
      .then((r) => r.json())
      .then((data) => {
        const ids = new Set(BUILTIN_CHIPS.map((c) => c.id))
        const merged = [...BUILTIN_CHIPS, ...data.filter((c) => !ids.has(c.id))]
        setChips(merged)
      })
      .catch(() => {})
  }, [])

  const filtered = chips.filter((chip) => {
    const q = search.toLowerCase()
    return (
      chip.name.toLowerCase().includes(q) ||
      chip.manufacturer?.toLowerCase().includes(q) ||
      chip.description?.toLowerCase().includes(q) ||
      chip.category?.toLowerCase().includes(q)
    )
  })

  const handleImport = async (chip) => {
    if (chip.file && !chip.pins) {
      setLoading(true)
      try {
        const res = await fetch(`./chips/${chip.file}`)
        const fullChip = await res.json()
        importChipFromLibrary(fullChip)
      } catch (e) {
        console.error('Failed to fetch chip data:', e)
        await requestNotice({
          title: 'Library load failed',
          message: 'Failed to load chip data from library.',
          confirmLabel: 'OK',
          tone: 'danger',
        })
      }
      setLoading(false)
    } else {
      importChipFromLibrary(chip)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-board-surface border border-board-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-board-border">
          <h2 className="text-sm font-bold text-amber-400">Chip Library</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-board-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, manufacturer, category..."
              className="w-full bg-board-bg border border-board-border rounded-md pl-9 pr-3 py-2 text-sm text-gray-200 outline-none focus:border-board-accent transition-colors"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center text-gray-500 text-xs py-8">
              No chips found. Try a different search term.
            </div>
          ) : (
            filtered.map((chip) => (
              <div
                key={chip.id}
                className="flex items-center justify-between p-3 rounded-lg border border-board-border hover:border-board-accent/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-200">{chip.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-board-bg text-gray-500">{chip.category}</span>
                    <span className="text-[10px] text-gray-600">{chip.package || 'Unknown package'}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {chip.manufacturer && <span>{chip.manufacturer} · </span>}
                    {chip.description}
                  </div>
                </div>
                <button
                  onClick={() => handleImport(chip)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-board-accent border border-board-accent/30 rounded hover:bg-board-accent/10 transition-colors shrink-0"
                >
                  <Download size={12} />
                  Import
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
