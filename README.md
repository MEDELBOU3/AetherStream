# AetherStream Desktop App

A desktop application built with Electron.

## Installation

1. Install dependencies:
```bash
npm install
```

## Development

Start the development server:
```bash
npm start
```

## Building

Build for your platform:
```bash
npm run build
```

Or build for a specific platform:
- Windows: `npm run build:win`
- macOS: `npm run build:mac`
- Linux: `npm run build:linux`

## Structure

- `main.js` - Main Electron process
- `preload.js` - Secure bridge between main and renderer processes
- `index.html` - Application UI
- `css/` - Stylesheets
- `js/` - JavaScript files
