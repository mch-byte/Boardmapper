# BoardMapper

**A free, browser-based PCB reverse engineering workbench.**

Map unknown ICs, document pin functions, draw inter-chip connections, and overlay everything on a photo of the actual board. No accounts, no backend, no cost — everything runs in your browser.

Try it here -> https://mch-byte.github.io/Boardmapper/
## Features

### Chip Manager
- Add custom chips or import from a library of thousands of known ICs (sourced from KiCad)
- Visual pin diagrams for DIP, SOIC, SOT23, and QFP packages
- Name pins, assign types, track connections, and add notes
- Export pin mappings as JSON

### Board View *(coming soon)*
- Import a PCB photo as background
- Drag chips onto the board and position them over real ICs
- Draw color-coded connections between pins (I2C, SPI, UART, etc.)
- Freehand annotation layer
- Export board map as PNG/SVG

### Chip Library
- Thousands of ICs auto-imported from [KiCad symbol libraries](https://gitlab.com/kicad/libraries/kicad-symbols)
- On-demand loading — only fetches chip data when you import it
- Updated monthly via GitHub Actions
- Community contributions welcome via PRs

## Getting Started

```bash
git clone https://github.com/mch-byt/boardmapper.git
cd boardmapper
npm install
npm run dev
```

Open http://localhost:5173/boardmapper/ in your browser.

## Building for Production

```bash
npm run build
```

Output is in `dist/` — deploy to GitHub Pages, Netlify, Vercel, or any static host.

## Updating the Chip Library

The chip library is automatically updated monthly via GitHub Actions. To update manually:

```bash
# Clone KiCad symbol libraries
git clone --depth 1 https://gitlab.com/kicad/libraries/kicad-symbols.git /tmp/kicad-symbols

# Run the import script
npm run import-kicad -- /tmp/kicad-symbols public/chips

# Commit the updated chips
git add public/chips/
git commit -m "Update chip library"
```

## Tech Stack

- **React 18** + **Vite** — fast dev, static build
- **Konva.js** — interactive canvas for Board View
- **Zustand** — lightweight state management
- **Tailwind CSS** — styling
- **GitHub Pages** — free hosting

## Contributing

Contributions welcome! Some ideas:
- Add chips to the built-in library
- Improve the KiCad parser
- Build out the Board View canvas
- Add new package types
- Bug fixes and UI improvements

## License

MIT
