import { create } from 'zustand'

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const createDefaultPin = (number) => ({
  number: String(number),
  name: '',
  type: 'unknown',
  notes: '',
  connectedTo: '',
})

const createDefaultChip = (overrides = {}) => ({
  id: generateId(),
  name: 'New Chip',
  package: 'DIP-8 / SOIC-8',
  pinCount: 8,
  layoutKind: 'dual',
  isFromLibrary: false,
  libraryId: null,
  pins: Array.from({ length: 8 }, (_, i) => createDefaultPin(i + 1)),
  boardPosition: null,
  ...overrides,
})

export const PIN_TYPES = [
  { value: 'unknown', label: 'Unknown', color: '#6b7280' },
  { value: 'vcc', label: 'VCC / Power', color: '#ef4444' },
  { value: 'gnd', label: 'GND', color: '#1e1e1e' },
  { value: 'input', label: 'Input', color: '#3b82f6' },
  { value: 'output', label: 'Output', color: '#f59e0b' },
  { value: 'io', label: 'I/O', color: '#8b5cf6' },
  { value: 'clock', label: 'Clock / XTAL', color: '#06b6d4' },
  { value: 'data', label: 'Data (SDA/MOSI)', color: '#10b981' },
  { value: 'debug', label: 'Debug (SWD/JTAG)', color: '#ec4899' },
  { value: 'nc', label: 'No Connect', color: '#4b5563' },
]

const PIN_TYPE_ALIASES = {
  power: 'vcc',
  vdd: 'vcc',
  vss: 'gnd',
  ground: 'gnd',
  in: 'input',
  out: 'output',
  bidirectional: 'io',
  bidir: 'io',
}

const VALID_PIN_TYPES = new Set(PIN_TYPES.map((type) => type.value))

const normalizePinType = (value) => {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (VALID_PIN_TYPES.has(raw)) return raw
  return PIN_TYPE_ALIASES[raw] || 'unknown'
}

const normalizePinNumber = (value, fallbackNumber = null) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === 'string') {
    const normalized = value.trim()
    if (normalized) return normalized
  }

  if (fallbackNumber !== null && fallbackNumber !== undefined) {
    return String(fallbackNumber)
  }

  return ''
}

const pinNumbersMatch = (a, b) => normalizePinNumber(a) === normalizePinNumber(b)

const normalizePin = (pin, number) => ({
  number: normalizePinNumber(pin?.number, number),
  name: pin?.name || '',
  type: normalizePinType(pin?.type),
  notes: pin?.notes || pin?.description || '',
  connectedTo: pin?.connectedTo || '',
})

const normalizeConnectionInput = (connection) => {
  const fromPin = normalizePinNumber(connection?.fromPin)
  const toPin = normalizePinNumber(connection?.toPin)
  if (!connection?.fromChip || !connection?.toChip) return null
  if (!fromPin || !toPin) return null

  return {
    fromChip: connection.fromChip,
    fromPin,
    toChip: connection.toChip,
    toPin,
    protocol: connection.protocol || 'other',
    signalName: connection.signalName || '',
    notes: connection.notes || '',
  }
}

const connectionKey = (connection) => {
  const a = `${connection.fromChip}:${normalizePinNumber(connection.fromPin)}`
  const b = `${connection.toChip}:${normalizePinNumber(connection.toPin)}`
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

export const PACKAGES = {
  'SOT23-5': 5,
  'SOT23-6': 6,
  'DIP-8 / SOIC-8': 8,
  'DIP-14 / SOIC-14': 14,
  'DIP-16 / SOIC-16': 16,
  'DIP-20 / SOIC-20': 20,
  'DIP-28 / SOIC-28': 28,
  'QFP-32': 32,
  'QFP-44': 44,
  'QFP-48': 48,
  'QFP-64': 64,
  'QFP-100': 100,
}

const PACKAGE_ALIASES = {
  'SOIC-8': 'DIP-8 / SOIC-8',
  'SOIC-14': 'DIP-14 / SOIC-14',
  'SOIC-16': 'DIP-16 / SOIC-16',
  'SOIC-20': 'DIP-20 / SOIC-20',
  'SOIC-28': 'DIP-28 / SOIC-28',
  'DIP-8': 'DIP-8 / SOIC-8',
  'DIP-14': 'DIP-14 / SOIC-14',
  'DIP-16': 'DIP-16 / SOIC-16',
  'DIP-20': 'DIP-20 / SOIC-20',
  'DIP-28': 'DIP-28 / SOIC-28',
}

const VALID_LAYOUT_KINDS = new Set(['single', 'sot', 'dual', 'quad', 'array'])

const normalizePackageName = (value) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''
  if (PACKAGES[raw]) return raw
  if (PACKAGE_ALIASES[raw]) return PACKAGE_ALIASES[raw]
  return raw
}

export const inferChipLayoutKind = (packageName, pinCount, existingKind) => {
  const preferred = typeof existingKind === 'string' ? existingKind.trim().toLowerCase() : ''
  if (VALID_LAYOUT_KINDS.has(preferred)) {
    return preferred
  }

  const pins = Number(pinCount) || 0
  if (pins <= 1) return 'single'

  const pkg = String(packageName || '').toUpperCase()
  if (/(BGA|LGA|WLCSP|CSP)/.test(pkg)) return 'array'
  if (/(QFP|LQFP|TQFP|QFN|DFN|PLCC)/.test(pkg)) return 'quad'
  if (/(SOT|SC70|SOD)/.test(pkg) && pins <= 8) return 'sot'
  return 'dual'
}

export const PROTOCOL_COLORS = {
  i2c: { color: '#10b981', label: 'I²C' },
  spi: { color: '#3b82f6', label: 'SPI' },
  uart: { color: '#f59e0b', label: 'UART' },
  jtag: { color: '#ec4899', label: 'JTAG' },
  swd: { color: '#a855f7', label: 'SWD' },
  power: { color: '#ef4444', label: 'Power' },
  analog: { color: '#06b6d4', label: 'Analog' },
  gpio: { color: '#6b7280', label: 'GPIO' },
  other: { color: '#9ca3af', label: 'Other' },
}

const useProjectStore = create((set, get) => ({
  project: {
    name: 'Untitled Project',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  activeTab: 'chips',
  activeChipId: null,
  selectedPinNumber: null,
  chips: [],
  connections: [],
  boardImage: null,
  annotations: [],
  setActiveTab: (tab) => set({ activeTab: tab }),
  setProjectName: (name) => set((state) => ({
    project: { ...state.project, name, modified: new Date().toISOString() },
  })),
  addChip: (overrides = {}) => {
    const chip = createDefaultChip(overrides)
    set((state) => ({
      chips: [...state.chips, chip],
      activeChipId: chip.id,
      selectedPinNumber: null,
      project: { ...state.project, modified: new Date().toISOString() },
    }))
    return chip.id
  },

  removeChip: (chipId) => set((state) => {
    const newChips = state.chips.filter((c) => c.id !== chipId)
    const newConnections = state.connections.filter(
      (c) => c.fromChip !== chipId && c.toChip !== chipId
    )
    return {
      chips: newChips,
      connections: newConnections,
      activeChipId: state.activeChipId === chipId
        ? (newChips[0]?.id || null)
        : state.activeChipId,
      selectedPinNumber: state.activeChipId === chipId ? null : state.selectedPinNumber,
      project: { ...state.project, modified: new Date().toISOString() },
    }
  }),

  setActiveChip: (chipId) => set({ activeChipId: chipId, selectedPinNumber: null }),

  updateChip: (chipId, updates) => set((state) => ({
    chips: state.chips.map((c) => c.id === chipId ? { ...c, ...updates } : c),
    project: { ...state.project, modified: new Date().toISOString() },
  })),

  changePackage: (chipId, packageName) => {
    const pinCount = PACKAGES[packageName]
    if (!pinCount) return
    set((state) => ({
      chips: state.chips.map((c) => {
        if (c.id !== chipId) return c
        const newPins = Array.from({ length: pinCount }, (_, i) => {
          const existing = c.pins.find((p) => pinNumbersMatch(p.number, i + 1))
          return normalizePin(existing || createDefaultPin(i + 1), i + 1)
        })
        return {
          ...c,
          package: packageName,
          pinCount,
          layoutKind: inferChipLayoutKind(packageName, pinCount),
          pins: newPins,
        }
      }),
      connections: state.connections.filter((connection) => {
        if (connection.fromChip === chipId) {
          const pin = Number(connection.fromPin)
          if (!Number.isInteger(pin) || pin < 1 || pin > pinCount) return false
        }
        if (connection.toChip === chipId) {
          const pin = Number(connection.toPin)
          if (!Number.isInteger(pin) || pin < 1 || pin > pinCount) return false
        }
        return true
      }),
      selectedPinNumber: null,
      project: { ...state.project, modified: new Date().toISOString() },
    }))
  },
  setSelectedPin: (pinNumber) => set({ selectedPinNumber: normalizePinNumber(pinNumber) || null }),
  updatePin: (chipId, pinNumber, updates) => set((state) => {
    const normalizedUpdates = updates.type !== undefined
      ? { ...updates, type: normalizePinType(updates.type) }
      : updates
    const targetPin = normalizePinNumber(pinNumber)
    return {
      chips: state.chips.map((c) => {
        if (c.id !== chipId) return c
        return {
          ...c,
          pins: c.pins.map((p) => (pinNumbersMatch(p.number, targetPin) ? { ...p, ...normalizedUpdates } : p)),
        }
      }),
      project: { ...state.project, modified: new Date().toISOString() },
    }
  }),
  addConnection: (connection) => set((state) => {
    const normalized = normalizeConnectionInput(connection)
    if (!normalized) return {}

    const key = connectionKey(normalized)
    const alreadyExists = state.connections.some((existing) => {
      const normalizedExisting = normalizeConnectionInput(existing)
      return normalizedExisting && connectionKey(normalizedExisting) === key
    })

    if (alreadyExists) return {}

    return {
      connections: [...state.connections, { id: generateId(), ...normalized }],
      project: { ...state.project, modified: new Date().toISOString() },
    }
  }),
  removeConnection: (connectionId) => set((state) => ({
    connections: state.connections.filter((c) => c.id !== connectionId),
    project: { ...state.project, modified: new Date().toISOString() },
  })),
  updateConnection: (connectionId, updates) => set((state) => ({
    connections: state.connections.map((c) =>
      c.id === connectionId ? { ...c, ...updates } : c
    ),
    project: { ...state.project, modified: new Date().toISOString() },
  })),
  setBoardImage: (imageData) => set((state) => ({
    boardImage: imageData,
    project: { ...state.project, modified: new Date().toISOString() },
  })),
  updateChipBoardPosition: (chipId, position) => set((state) => ({
    chips: state.chips.map((c) =>
      c.id === chipId ? { ...c, boardPosition: position } : c
    ),
    project: { ...state.project, modified: new Date().toISOString() },
  })),
  addAnnotation: (annotation) => set((state) => ({
    annotations: [...state.annotations, { id: generateId(), ...annotation }],
    project: { ...state.project, modified: new Date().toISOString() },
  })),
  removeAnnotation: (annotationId) => set((state) => ({
    annotations: state.annotations.filter((a) => a.id !== annotationId),
    project: { ...state.project, modified: new Date().toISOString() },
  })),
  exportProject: () => {
    const state = get()
    return JSON.stringify({
      project: state.project,
      chips: state.chips,
      connections: state.connections,
      boardImage: state.boardImage,
      annotations: state.annotations,
    }, null, 2)
  },

  importProject: (json) => {
    try {
      const data = JSON.parse(json)
      const importedChips = (data.chips || []).map((chip) => {
        const normalizedInputPins = Array.isArray(chip.pins)
          ? chip.pins.map((pin, index) => normalizePin(pin, index + 1))
          : []

        const inferredPinCount = Number(chip.pinCount)
          || normalizedInputPins.length
          || 0
        const normalizedPackage = normalizePackageName(chip.package)
        const hasExplicitPins = normalizedInputPins.length > 0

        const pins = hasExplicitPins
          ? normalizedInputPins
          : Array.from({ length: inferredPinCount }, (_, i) =>
              normalizePin(createDefaultPin(i + 1), i + 1))
        const pinCount = Math.max(inferredPinCount, pins.length)

        return {
          id: chip.id || generateId(),
          name: chip.name || 'Imported Chip',
          package: normalizedPackage,
          pinCount,
          layoutKind: inferChipLayoutKind(
            normalizedPackage,
            pinCount,
            chip.layoutKind
          ),
          isFromLibrary: Boolean(chip.isFromLibrary),
          libraryId: chip.libraryId || null,
          pins,
          boardPosition: chip.boardPosition || null,
        }
      })

      const pinSetByChipId = new Map(
        importedChips.map((chip) => [
          chip.id,
          new Set(chip.pins.map((pin) => normalizePinNumber(pin.number))),
        ])
      )
      const importedConnections = (data.connections || []).map((connection) => {
        const normalized = normalizeConnectionInput(connection)
        if (!normalized) return null

        const fromPins = pinSetByChipId.get(normalized.fromChip)
        const toPins = pinSetByChipId.get(normalized.toChip)
        if (!fromPins || !toPins) return null
        if (!fromPins.has(normalized.fromPin)) return null
        if (!toPins.has(normalized.toPin)) return null

        return {
          id: connection.id || generateId(),
          ...normalized,
        }
      }).filter(Boolean)

      set({
        project: data.project || { name: 'Imported', created: new Date().toISOString(), modified: new Date().toISOString() },
        chips: importedChips,
        connections: importedConnections,
        boardImage: data.boardImage || null,
        annotations: data.annotations || [],
        activeChipId: importedChips[0]?.id || null,
        selectedPinNumber: null,
      })
      return true
    } catch (e) {
      console.error('Failed to import project:', e)
      return false
    }
  },
  importChipFromLibrary: (libraryChip) => {
    const normalizedPackage = normalizePackageName(libraryChip.package)
    const pins = Array.isArray(libraryChip.pins)
      ? libraryChip.pins.map((p, index) => normalizePin({
        number: p.number,
        name: p.name || '',
        type: p.type,
        description: p.description || '',
      }, index + 1))
      : []

    const chip = createDefaultChip({
      name: libraryChip.name,
      package: normalizedPackage,
      pinCount: pins.length,
      layoutKind: inferChipLayoutKind(
        normalizedPackage,
        pins.length,
        libraryChip.layoutKind
      ),
      isFromLibrary: true,
      libraryId: libraryChip.id,
      pins,
    })
    set((state) => ({
      chips: [...state.chips, chip],
      activeChipId: chip.id,
      selectedPinNumber: null,
      project: { ...state.project, modified: new Date().toISOString() },
    }))
    return chip.id
  },
  resetProject: () => set({
    project: { name: 'Untitled Project', created: new Date().toISOString(), modified: new Date().toISOString() },
    chips: [],
    connections: [],
    boardImage: null,
    annotations: [],
    activeChipId: null,
    selectedPinNumber: null,
    activeTab: 'chips',
  }),
}))

export default useProjectStore
