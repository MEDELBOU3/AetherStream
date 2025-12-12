# AetherStream Brand Assets

![Image 1](assets/Ui1.png)

![Image 2](assets/Ui2.png)

![Image 3](assets/Ui3.png)

This folder contains the branding and icon files for the AetherStream application.

## Icon Files Required

To properly build the application for all platforms, you need:

### Windows
- **icon.ico** - Windows icon (256x256 or larger)
- Place in: `assets/icon.ico`

### macOS
- **icon.icns** - macOS icon set
- Place in: `assets/icon.icns`

### Linux
- **icon.png** - PNG icon (512x512 recommended)
- Place in: `assets/icon.png`

## How to Create Icons

You can use online tools to convert your logo:
1. Convert SVG to ICO: https://convertio.co/svg-ico/
2. Convert SVG to ICNS: https://convertio.co/svg-icns/
3. Convert SVG to PNG: https://convertio.co/svg-png/

Or use icon generation tools like:
- ImageMagick
- GIMP
- Photoshop

## Current Files

- `icon.svg` - Base SVG template (replace with your actual logo)

## Building with Icons

Once you add the icon files, run:
```bash
npm run build:win      # Build Windows .exe
npm run build:mac      # Build macOS .dmg
npm run build:linux    # Build Linux AppImage
npm run build:all      # Build all platforms
```

The built executables will be in the `dist/` folder.
