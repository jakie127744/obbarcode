# OB Barcode generator

Browser-based barcode and QR code generator with export tools, batch label workflow, PWA support, and AdSense-ready layout safeguards.

## Features

- Generate:
  - QR Code
  - Code 128
  - Code 39
  - EAN-13 (with checksum handling)
  - UPC-A (with checksum handling)
- Live preview while typing
- Export options:
  - PNG download
  - SVG download
  - Copy image to clipboard
  - Copy SVG markup
- Batch CSV label generation and print view
- ZIP export for generated batch labels
- Presets and recent codes (saved in localStorage)
- Theme modes:
  - System
  - Light
  - Dark
- PWA support:
  - Install prompt
  - Service worker
  - Manifest and icons
- Ad-safe guardrails:
  - Consent controls
  - Guarded ad placement distance checks
  - Resize/orientation re-checks
- Deployment Readiness preflight panel

## Project Structure

- `index.html` - Main UI and page layout
- `styles.css` - Theme, layout, responsive, print styles
- `app.js` - Generation logic, exports, batch flow, preflight checks
- `manifest.webmanifest` - PWA metadata
- `sw.js` - Service worker caching logic
- `privacy.html` - Privacy policy
- `terms.html` - Terms of use
- `about.html` - About page
- `support.html` - Support page
- `ads.txt` - AdSense publisher declaration
- `icons/` - App and brand icons
- `assets/` - Static assets (including mascot)
- `vendor/` - Local barcode/QR libraries

## Quick Start

### Option 1: Open directly

1. Open `index.html` in a browser.
2. Start generating barcodes/QR codes.

### Option 2: Serve locally (recommended)

Use any static server, for example:

```bash
npx serve .
```

Then open the local URL shown in the terminal.

## Usage

1. Choose a format.
2. Enter data.
3. Adjust style options (colors, margin, dimensions).
4. Click Generate (or use Ctrl/Cmd + Enter).
5. Export as PNG/SVG, copy image/SVG, or use batch workflow.

## Batch CSV Format

Header is optional, recommended format:

```csv
format,data
QR,https://example.com
EAN13,5901234123457
UPCA,036000291452
CODE128,OB-ORDER-1001
```

## Deployment Readiness (Run Preflight Checks)

The built-in preflight validates:

- Barcode library availability
- QR library availability
- ZIP library availability
- Manifest presence
- Service worker support
- Secure context availability
- Ad slot ID format
- Consent state presence
- Scanner confidence warnings for current settings

## Privacy and Data Handling

- Generation happens in-browser.
- No backend required for barcode generation.
- App settings and convenience data (presets, recents, consent, local metrics) are stored in localStorage/sessionStorage.

## AdSense Notes

- This project includes ad placeholders and guarded ad logic.
- Keep ad units clearly separated from action controls to reduce accidental clicks.
- Review live behavior after deployment to ensure policy compliance.

## Development Notes

- Keep dependencies local where possible for runtime resilience.
- If changing service worker cache strategy, bump cache version and validate update behavior.
- Test on mobile and desktop for print/layout consistency.

## License

No license file is currently included. Add a LICENSE file if you plan to open source this project publicly.
