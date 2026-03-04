#!/usr/bin/env node

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, dirname, join } from 'path'

const inputDir = process.argv[2]
const outputDir = process.argv[3]

if (!inputDir || !outputDir) {
  console.error('Usage: node scripts/import-kicad.js <kicad-symbols-dir> <output-dir>')
  process.exit(1)
}

const PIN_TYPE_MAP = {
  input: 'input',
  output: 'output',
  bidirectional: 'io',
  tri_state: 'io',
  passive: 'unknown',
  free: 'unknown',
  unspecified: 'unknown',
  power_in: 'vcc',
  power_out: 'output',
  open_collector: 'output',
  open_emitter: 'output',
  no_connect: 'nc',
}

const CATEGORY_MAP = {
  Memory_EEPROM: 'eeprom',
  Memory_Flash: 'memory',
  Memory_RAM: 'memory',
  MCU_Microchip_ATtiny: 'mcu',
  MCU_Microchip_ATmega: 'mcu',
  MCU_Microchip_PIC16: 'mcu',
  MCU_Microchip_PIC18: 'mcu',
  MCU_ST_STM32: 'mcu',
  MCU_NXP: 'mcu',
  MCU_Nordic: 'mcu',
  MCU_Espressif: 'mcu',
  MCU_RaspberryPi: 'mcu',
  Regulator_Linear: 'power',
  Regulator_Switching: 'power',
  Amplifier_Operational: 'analog',
  Amplifier_Audio: 'analog',
  Comparator: 'analog',
  Interface_UART: 'interface',
  Interface_USB: 'interface',
  Interface_CAN_LIN: 'interface',
  Sensor_Temperature: 'sensor',
  Sensor_Pressure: 'sensor',
  Timer: 'analog',
  RF_Receiver: 'rf',
  RF_Transceiver: 'rf',
}

function tokenize(text) {
  const tokens = []
  let i = 0

  while (i < text.length) {
    const ch = text[i]
    if (ch === '(' || ch === ')') {
      tokens.push(ch)
      i++
      continue
    }

    if (ch === '"') {
      let value = ''
      i++
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\') {
          i++
          value += text[i] || ''
        } else {
          value += text[i]
        }
        i++
      }
      i++
      tokens.push(value)
      continue
    }

    if (/\s/.test(ch)) {
      i++
      continue
    }

    let word = ''
    while (i < text.length && !/[\s()"]/.test(text[i])) {
      word += text[i]
      i++
    }
    tokens.push(word)
  }

  return tokens
}

function parse(tokens) {
  let cursor = 0

  function readNode() {
    if (tokens[cursor] !== '(') {
      return tokens[cursor++]
    }

    cursor++
    const list = []
    while (cursor < tokens.length && tokens[cursor] !== ')') {
      list.push(readNode())
    }
    cursor++
    return list
  }

  const root = []
  while (cursor < tokens.length) {
    root.push(readNode())
  }
  return root
}

function findFirst(list, tag) {
  if (!Array.isArray(list)) return null
  for (const item of list) {
    if (Array.isArray(item) && item[0] === tag) return item
  }
  return null
}

function findAll(list, tag) {
  if (!Array.isArray(list)) return []
  return list.filter((item) => Array.isArray(item) && item[0] === tag)
}

function readProperties(symbol) {
  const props = {}
  const propertyNodes = findAll(symbol, 'property')
  for (const property of propertyNodes) {
    const key = property[1]
    const value = property[2]
    if (typeof key === 'string') {
      props[key] = typeof value === 'string' ? value : ''
    }
  }
  return props
}

function isNonPhysicalSymbol(symbol, props) {
  const reference = String(props.Reference || '').trim()
  const keywords = String(props.ki_keywords || '').toLowerCase()
  const description = String(props.Description || '').toLowerCase()

  if (reference.startsWith('#')) return true
  if (findFirst(symbol, 'power')) return true
  if (keywords.includes('global power')) return true
  if (description.includes('power symbol creates a global label')) return true
  return false
}

function normalizePackageLabel(rawValue) {
  if (!rawValue) return ''
  const raw = String(rawValue).toUpperCase().replace(/_/g, '-')

  const patterns = [
    { re: /(LQFP|TQFP|QFP)-?(\d{1,3})/, format: (family, count) => `${family}-${count}` },
    { re: /(QFN|DFN|VQFN|WQFN|TDFN)-?(\d{1,3})/, format: (family, count) => `${family}-${count}` },
    { re: /(BGA|LGA|WLCSP|CSP|UFBGA)-?(\d{1,3})/, format: (family, count) => `${family}-${count}` },
    { re: /(SOIC|SSOP|TSSOP|MSOP|VSSOP|SO)-?(\d{1,3})/, format: (family, count) => `${family}-${count}` },
    { re: /(DIP|PDIP)-?(\d{1,3})/, format: (_, count) => `DIP-${count}` },
    { re: /(SOT)-?23-?(\d{1,2})/, format: (_, count) => `SOT23-${count}` },
    { re: /(SOT)-?(89|223|252|263)/, format: (family, size) => `${family}-${size}` },
    { re: /(TO)-?(92|220|252|263)/, format: (family, size) => `${family}-${size}` },
    { re: /(PLCC)-?(\d{1,3})/, format: (family, count) => `${family}-${count}` },
  ]

  for (const pattern of patterns) {
    const match = raw.match(pattern.re)
    if (match) return pattern.format(match[1], match[2])
  }

  return ''
}

function resolvePackageName(symbolName, footprint) {
  const footprintPart = typeof footprint === 'string' && footprint.includes(':')
    ? footprint.split(':').pop()
    : footprint

  const normalizedFromFootprint = normalizePackageLabel(footprintPart)
  if (normalizedFromFootprint) return normalizedFromFootprint

  const normalizedFromName = normalizePackageLabel(symbolName)
  if (normalizedFromName) return normalizedFromName

  return ''
}

function inferLayoutKind(packageName, pinCount) {
  const pins = Number(pinCount) || 0
  if (pins <= 1) return 'single'

  const pkg = String(packageName || '').toUpperCase()
  if (/(BGA|LGA|WLCSP|CSP)/.test(pkg)) return 'array'
  if (/(QFP|LQFP|TQFP|QFN|DFN|PLCC)/.test(pkg)) return 'quad'
  if (/(SOT|SC70|SOD)/.test(pkg) && pins <= 8) return 'sot'
  return 'dual'
}

function extractSymbols(parsed, category) {
  const chips = []
  const lib = parsed[0]
  if (!Array.isArray(lib) || lib[0] !== 'kicad_symbol_lib') return chips

  const symbols = findAll(lib, 'symbol')
  for (const symbol of symbols) {
    const name = symbol[1]
    if (!name || typeof name !== 'string') continue
    if (name.includes(':')) continue

    const pins = []
    const subSymbols = findAll(symbol, 'symbol')
    for (const subSymbol of subSymbols) {
      const pinDefs = findAll(subSymbol, 'pin')
      for (const pinDef of pinDefs) {
        const pinType = pinDef[1]
        const nameNode = findFirst(pinDef, 'name')
        const numberNode = findFirst(pinDef, 'number')
        if (!nameNode || !numberNode) continue

        const pinName = nameNode[1] || ''
        const pinNumber = numberNode[1] || ''
        let type = PIN_TYPE_MAP[pinType] || 'unknown'
        if (type === 'vcc' && /^(GND|VSS|AGND|DGND|GND\d)/i.test(pinName)) {
          type = 'gnd'
        }

        pins.push({
          number: Number.isNaN(parseInt(pinNumber, 10)) ? pinNumber : parseInt(pinNumber, 10),
          name: pinName,
          type,
          description: '',
        })
      }
    }

    if (pins.length === 0) continue

    pins.sort((a, b) => {
      const left = typeof a.number === 'number' ? a.number : 999
      const right = typeof b.number === 'number' ? b.number : 999
      return left - right
    })

    const properties = readProperties(symbol)
    if (isNonPhysicalSymbol(symbol, properties)) continue

    const description = properties.ki_description || properties.Description || ''
    const datasheet = properties.Datasheet && properties.Datasheet !== '~'
      ? properties.Datasheet
      : ''
    const footprint = properties.Footprint || ''
    const packageName = resolvePackageName(name, footprint)
    const layoutKind = inferLayoutKind(packageName, pins.length)

    chips.push({
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name,
      manufacturer: '',
      description,
      category,
      package: packageName,
      footprint,
      layoutKind,
      datasheet,
      pins,
    })
  }

  return chips
}

function listSymbolFiles(rootDir) {
  const files = []
  const stack = [rootDir]

  while (stack.length > 0) {
    const currentDir = stack.pop()
    const entries = readdirSync(currentDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
        continue
      }
      if (entry.isFile() && entry.name.endsWith('.kicad_sym')) {
        files.push(fullPath)
      }
    }
  }

  return files.sort((a, b) => a.localeCompare(b))
}

function getLibraryName(filePath) {
  const parent = basename(dirname(filePath))
  if (parent.endsWith('.kicad_symdir')) {
    return parent.slice(0, -'.kicad_symdir'.length)
  }
  return basename(filePath, '.kicad_sym')
}

console.log(`Importing KiCad symbols from: ${inputDir}`)
console.log(`Output directory: ${outputDir}`)

mkdirSync(outputDir, { recursive: true })

const symbolFiles = listSymbolFiles(inputDir)
if (symbolFiles.length === 0) {
  console.error(`No .kicad_sym files found under: ${inputDir}`)
  process.exit(1)
}

const index = []
let totalChips = 0
const createdCategoryDirs = new Set()

for (let i = 0; i < symbolFiles.length; i++) {
  const filePath = symbolFiles[i]
  const libName = getLibraryName(filePath)
  const category = CATEGORY_MAP[libName] || 'other'
  const categoryDir = join(outputDir, category)

  if (!createdCategoryDirs.has(category)) {
    mkdirSync(categoryDir, { recursive: true })
    createdCategoryDirs.add(category)
  }

  if (i === 0 || i === symbolFiles.length - 1 || (i + 1) % 500 === 0) {
    console.log(`Processing ${i + 1}/${symbolFiles.length}: ${filePath}`)
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    const parsed = parse(tokenize(content))
    const chips = extractSymbols(parsed, category)

    for (const chip of chips) {
      const chipFile = `${category}/${chip.id}.json`
      writeFileSync(join(outputDir, chipFile), JSON.stringify(chip, null, 2))

      index.push({
        id: chip.id,
        name: chip.name,
        manufacturer: chip.manufacturer,
        description: chip.description,
        category: chip.category,
        package: chip.package,
        pinCount: chip.pins.length,
        file: chipFile,
      })

      totalChips++
    }
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`)
  }
}

index.sort((a, b) => a.name.localeCompare(b.name))
writeFileSync(join(outputDir, 'index.json'), JSON.stringify(index, null, 2))

console.log(`\nDone! Imported ${totalChips} chips from ${symbolFiles.length} symbol files.`)
console.log(`Index: ${join(outputDir, 'index.json')}`)
