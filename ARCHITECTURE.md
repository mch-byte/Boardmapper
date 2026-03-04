# BoardMapper — PCB Reverse Engineering Workbench

## Overview
A free, browser-based tool for hardware hackers to visually reverse engineer PCBs. Map unknown ICs, document pin functions, draw inter-chip connections, and overlay everything on a photo of the actual board.

**Live at**: `https://<username>.github.io/boardmapper`

---

## What Makes This Different
- **Not a schematic tool** (KiCad, Eagle) — too heavy for RE discovery work
- **Not a pinout generator** (ic-pinout-diagram-generator) — only does known, single chips
- **Not an image editor** (GIMP) — no concept of "chips" or "connections"
- **Purpose-built for the RE workflow**: probe → document → connect → share

---

## Core Features

### Tab 1: Chip Manager
- Add/edit IC packages (DIP, SOIC, SOT23, QFP, BGA)
- Name pins, assign types (VCC, GND, Clock, Data, I/O, Debug, etc.)
- Add notes per pin (measurements, observations, guesses)
- Track "connected to" relationships per pin
- Import from built-in chip library (known ICs)
- Create custom chips for unknown/unmarked ICs

### Tab 2: Board View (Canvas Workspace)
- Import a PCB photo as background layer (drag, zoom, rotate)
- Drag chip outlines from Chip Manager onto the board photo
- Position/scale them to overlay the real ICs in the photo
- Draw connections between pins across chips
  - Color-coded by protocol (I2C = green, SPI = blue, UART = orange, power = red, etc.)
  - Labeled with signal names
- Freehand drawing layer for marking traces, test points, annotations
- Text annotations anywhere on the board
- Multiple layers (photo, chips, connections, annotations) that can be toggled

### Chip Library (Community-Maintained)
- JSON file in the repo with common IC definitions
- Categories: MCUs, EEPROMs, voltage regulators, RF receivers, op-amps, etc.
- Each entry: name, package, pin count, pin names, pin types, datasheet URL
- Community contributes via GitHub PRs
- Searchable within the app

### Project Management
- Save/load projects as .json files (download/upload)
- Auto-save to IndexedDB (browser local) so you don't lose work
- Export board view as PNG/SVG for sharing
- Export pin mappings as text/markdown for blog posts

---

## Tech Stack

```
Frontend Framework:  React 18+ (with hooks)
Build Tool:          Vite
Canvas Library:      Konva.js + react-konva (2D canvas with drag/drop, layers, images)
Styling:             Tailwind CSS
Icons:               Lucide React
State Management:    Zustand (lightweight, no boilerplate)
Local Persistence:   IndexedDB via idb library
File Handling:       Native File System API / file download fallback
Export:              html-to-image or Konva's built-in .toDataURL()
```

### Why These Choices
- **Konva.js**: Handles image layers, draggable shapes, freehand drawing, zoom/pan, and hit detection. Battle-tested for exactly this kind of interactive canvas app. Works with React via react-konva.
- **Zustand**: Minimal state management. Single store for all chip data, connections, and canvas state. No Redux boilerplate.
- **Vite**: Fast builds, great dev experience, outputs static files perfect for GitHub Pages.
- **No backend**: Everything runs in the browser. No accounts, no servers, no costs.

---

## Project Structure

```
boardmapper/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── App.jsx              # Main app shell, tab navigation
│   │   │   ├── Header.jsx           # Top bar with project name, save/load/export
│   │   │   └── TabBar.jsx           # Chip Manager | Board View tabs
│   │   ├── chip-manager/
│   │   │   ├── ChipManager.jsx      # Main chip manager view
│   │   │   ├── ChipList.jsx         # Sidebar list of all chips in project
│   │   │   ├── ChipEditor.jsx       # Edit chip name, package, pins
│   │   │   ├── ChipDiagram.jsx      # SVG chip visualization (interactive)
│   │   │   ├── PinEditor.jsx        # Edit individual pin details
│   │   │   ├── PinTable.jsx         # Summary table of all pins
│   │   │   └── ChipLibrary.jsx      # Browse/search/import from library
│   │   ├── board-view/
│   │   │   ├── BoardView.jsx        # Main canvas workspace
│   │   │   ├── BoardCanvas.jsx      # Konva stage with all layers
│   │   │   ├── ChipNode.jsx         # Draggable chip on canvas
│   │   │   ├── ConnectionLine.jsx   # Line between two pins
│   │   │   ├── FreehandLayer.jsx    # Freehand drawing overlay
│   │   │   ├── AnnotationLayer.jsx  # Text labels on canvas
│   │   │   ├── PhotoLayer.jsx       # Background PCB image
│   │   │   ├── Toolbar.jsx          # Canvas tools (select, draw, connect, annotate)
│   │   │   └── LayerPanel.jsx       # Toggle layer visibility
│   │   └── shared/
│   │       ├── PinDot.jsx           # Colored pin indicator
│   │       ├── ProtocolBadge.jsx    # I2C, SPI, UART badges
│   │       └── ExportDialog.jsx     # Export options modal
│   ├── store/
│   │   ├── useProjectStore.js       # Zustand store: chips, connections, canvas state
│   │   └── persistence.js           # IndexedDB auto-save/load
│   ├── data/
│   │   └── chip-library.json        # Built-in chip definitions
│   ├── utils/
│   │   ├── export.js                # PNG/SVG/JSON export helpers
│   │   ├── geometry.js              # Pin position calculations
│   │   └── protocols.js             # Protocol colors and labels
│   ├── main.jsx
│   └── index.css
├── .github/
│   └── workflows/
│       └── deploy.yml               # GitHub Actions → GitHub Pages
├── index.html
├── vite.config.js
├── tailwind.config.js
├── package.json
└── README.md
```

---

## Data Model

```json
{
  "project": {
    "name": "PixMob CEMENT V1.1",
    "created": "2026-03-03T00:00:00Z",
    "modified": "2026-03-03T00:00:00Z"
  },
  "chips": [
    {
      "id": "chip-1",
      "name": "MCU (2402d01314)",
      "package": "SOIC-8",
      "pinCount": 8,
      "isFromLibrary": false,
      "libraryId": null,
      "pins": [
        {
          "number": 1,
          "name": "XTAL_IN",
          "type": "clock",
          "connectedTo": "Crystal 24.8117MHz",
          "notes": "Pin 1 confirmed with continuity test"
        }
      ],
      "boardPosition": { "x": 340, "y": 220, "rotation": 0, "scale": 1.0 }
    },
    {
      "id": "chip-2",
      "name": "CMT2210LH",
      "package": "SOIC-8",
      "pinCount": 8,
      "isFromLibrary": true,
      "libraryId": "cmt2210lh",
      "pins": [],
      "boardPosition": { "x": 120, "y": 220, "rotation": 0, "scale": 1.0 }
    }
  ],
  "connections": [
    {
      "id": "conn-1",
      "fromChip": "chip-1",
      "fromPin": 3,
      "toChip": "chip-2",
      "toPin": 5,
      "protocol": "spi",
      "signalName": "DATA_OUT",
      "notes": "Confirmed with logic analyzer, OOK demodulated data"
    }
  ],
  "boardImage": {
    "dataUrl": "data:image/jpeg;base64,...",
    "position": { "x": 0, "y": 0 },
    "scale": 1.0,
    "rotation": 0,
    "opacity": 0.6
  },
  "annotations": [
    {
      "id": "ann-1",
      "type": "text",
      "content": "Test point TP3 — 3.3V confirmed",
      "position": { "x": 450, "y": 100 }
    },
    {
      "id": "ann-2",
      "type": "freehand",
      "points": [100, 200, 105, 210, 110, 215],
      "color": "#ef4444",
      "strokeWidth": 2
    }
  ]
}
```

---

## Chip Library Entry Format

```json
{
  "id": "at24c02",
  "name": "AT24C02",
  "manufacturer": "Microchip",
  "description": "2Kbit I2C EEPROM",
  "category": "eeprom",
  "datasheetUrl": "https://ww1.microchip.com/downloads/en/DeviceDoc/doc0180.pdf",
  "packages": [
    {
      "type": "SOIC-8",
      "pinCount": 8,
      "pins": [
        { "number": 1, "name": "A0", "type": "input", "description": "Address bit 0" },
        { "number": 2, "name": "A1", "type": "input", "description": "Address bit 1" },
        { "number": 3, "name": "A2", "type": "input", "description": "Address bit 2" },
        { "number": 4, "name": "GND", "type": "gnd", "description": "Ground" },
        { "number": 5, "name": "SDA", "type": "data", "description": "Serial Data" },
        { "number": 6, "name": "SCL", "type": "clock", "description": "Serial Clock" },
        { "number": 7, "name": "WP", "type": "input", "description": "Write Protect" },
        { "number": 8, "name": "VCC", "type": "vcc", "description": "Power Supply" }
      ]
    },
    {
      "type": "SOT23-5",
      "pinCount": 5,
      "pins": [
        { "number": 1, "name": "SDA", "type": "data", "description": "Serial Data" },
        { "number": 2, "name": "SCL", "type": "clock", "description": "Serial Clock" },
        { "number": 3, "name": "VCC", "type": "vcc", "description": "Power Supply" },
        { "number": 4, "name": "GND", "type": "gnd", "description": "Ground" },
        { "number": 5, "name": "A0/A1", "type": "input", "description": "Address (hardwired)" }
      ]
    }
  ]
}
```

---

## GitHub Actions Deploy

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
```

---

## Development Roadmap

### v0.1 — MVP (what we build first)
- [ ] Chip Manager with pin editing (port existing work)
- [ ] Built-in chip library (10-20 common ICs)
- [ ] Board View with photo import and chip placement
- [ ] Basic connection drawing between pins
- [ ] Save/load project as JSON
- [ ] Deploy to GitHub Pages

### v0.2 — Usability
- [ ] Freehand drawing layer
- [ ] Text annotations on board
- [ ] Layer visibility toggles
- [ ] Undo/redo
- [ ] Auto-save to IndexedDB
- [ ] Export board view as PNG

### v0.3 — Community
- [ ] Expand chip library (50+ ICs)
- [ ] Chip library search and filter
- [ ] Export as SVG
- [ ] Export pin mappings as markdown
- [ ] Contributing guide for chip library PRs
- [ ] Shareable project links (encode small projects in URL hash?)

### v0.4 — Advanced
- [ ] Protocol decoder annotations (show I2C addresses, SPI modes)
- [ ] Net highlighting (click a connection, highlight all related pins)
- [ ] Multi-board support (e.g. front and back of PCB)
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts
- [ ] Import from KiCad netlist (for partial boards)

---

## Hosting Comparison

| Option        | Cost | Custom Domain | Auto Deploy | Notes                        |
|---------------|------|---------------|-------------|------------------------------|
| GitHub Pages  | Free | Yes           | Yes (Actions) | Best for open source       |
| Vercel        | Free | Yes           | Yes         | Faster builds, preview URLs  |
| Netlify       | Free | Yes           | Yes         | Similar to Vercel            |
| Cloudflare Pages | Free | Yes        | Yes         | Good CDN                     |

**Recommendation**: GitHub Pages. Keeps code + hosting + community (issues/PRs) in one place. The hardware hacking audience lives on GitHub anyway.

---

## Naming Ideas
- BoardMapper
- PinTrace
- ChipMap
- REBoard (Reverse Engineering Board)
- PCBLens
- TraceMap
