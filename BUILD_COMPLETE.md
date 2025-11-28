# AetherStream Desktop App

A professional desktop application built with Electron.

## ✅ Completed Setup

- ✅ Electron desktop application configured
- ✅ Windows .exe executable built (portable + installer)
- ✅ GitHub Actions workflow for automated builds
- ✅ Developer menu hidden (DevTools disabled)
- ✅ Git configured with GitHub username (MEDELBOU3)
- ✅ Brand assets structure created

## 📦 Built Files

### Windows
Your Windows executable files are located in `dist/`:

1. **AetherStream.exe** - Standalone portable executable (210MB)
   - Location: `dist/win-unpacked/AetherStream.exe`
   - No installation required, run directly

2. **Installer** - NSIS installer package
   - Location: `dist/aetherstream-1.0.0-x64.nsis.7z`
   - Creates Start Menu shortcut and Desktop shortcut

### How to Distribute

You can now distribute these files:
- Share the portable `.exe` directly
- Or use the installer for an easy installation experience

## 🎨 Branding & Icons

### Current Setup
- Assets folder: `assets/`
- Icon files included for Windows, macOS, and Linux
- Default Electron icon currently in use

### Customize Your Logo
To add your custom app icon:

1. Replace the files in `assets/` with your branding:
   - `icon.svg` - Vector logo (edit this)
   - `icon.png` - PNG version (256x256+)
   - `icon.ico` - Windows icon
   - `icon.icns` - macOS icon

2. Online tools to convert your logo:
   - SVG to PNG: https://convertio.co/svg-png/
   - SVG to ICO: https://convertio.co/svg-ico/
   - SVG to ICNS: https://convertio.co/svg-icns/

3. Rebuild after updating icons:
   ```bash
   npm run build:win
   ```

## 🚀 Quick Start

### Development
```bash
npm install
npm start
```

### Build
```bash
# Windows
npm run build:win

# All platforms
npm run build:all

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 📁 Project Structure

```
AETHER/
├── main.js              - Electron main process (no DevTools)
├── preload.js           - Secure IPC bridge
├── index.html           - App UI
├── css/                 - Stylesheets
├── js/                  - Application scripts
│   ├── firebase/        - Firebase integration
│   └── player/          - Video player
├── assets/              - Branding & icons
├── dist/                - Built executables
└── .github/workflows/   - GitHub Actions (auto-build on release)
```

## 🔐 Security & Settings

- Context isolation enabled
- Node integration disabled
- Sandbox mode active
- No DevTools in production

## 📝 Git & GitHub

- Repository: `https://github.com/MEDELBOU3/AetherStream`
- Git user: `MEDELBOU3`
- Automated releases via GitHub Actions when pushing version tags

### Create a Release
```bash
git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions will automatically build and upload to releases.

## 🔄 Workflow

1. Make code changes
2. Test locally: `npm start`
3. Commit: `git commit -m "Your message"`
4. Push: `git push origin main`
5. Create release tag: `git tag vX.X.X && git push origin vX.X.X`
6. GitHub Actions builds automatically and uploads to releases

## 📋 Next Steps

1. **Add your logo** - Replace SVG/PNG files in `assets/`
2. **Test the .exe** - Run from `dist/win-unpacked/AetherStream.exe`
3. **Create releases** - Use git tags to trigger builds
4. **Share with users** - Download from GitHub Releases

## 📚 Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder](https://www.electron.build/)
- [GitHub Actions](https://github.com/features/actions)

## ✨ Notes

- DevTools are disabled for end users (security)
- App is fully functional as a standalone desktop application
- All your existing HTML, CSS, and JavaScript work seamlessly
- Firebase integration is preserved

---

**App Name:** AetherStream  
**Version:** 1.0.0  
**Author:** MEDELBOU3  
**Repository:** https://github.com/MEDELBOU3/AetherStream
