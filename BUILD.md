# Building Gmail Attachment Downloader

This guide explains how to build executable files for different operating systems.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** (comes with Node.js)
3. All project dependencies installed (`npm install`)

## Build Commands

### Windows Executable (.exe)

```bash
# Build Windows installer and portable executable
npm run build-win

# Build all Windows targets
npm run build -- --win
```

This creates:

- **NSIS Installer**: `dist/Gmail Attachment Downloader Setup x.x.x.exe`
- **Portable App**: `dist/Gmail Attachment Downloader x.x.x.exe`

### macOS Application (.dmg)

```bash
# Build macOS DMG (only works on macOS)
npm run build-mac

# Build all macOS targets
npm run build -- --mac
```

### Linux Application

```bash
# Build Linux packages
npm run build-linux

# Build all Linux targets
npm run build -- --linux
```

This creates:

- **AppImage**: `dist/Gmail Attachment Downloader-x.x.x.AppImage`
- **Debian Package**: `dist/gmail-attachment-downloader_x.x.x_amd64.deb`

### Build All Platforms

```bash
# Build for all platforms (requires platform-specific tools)
npm run build
```

## Cross-Platform Building

### Building Windows EXE on macOS/Linux

To build Windows executables from macOS or Linux, you need Wine:

```bash
# macOS with Homebrew
brew install wine

# Ubuntu/Debian
sudo apt install wine

# Then build Windows targets
npm run build-win
```

### Building for Multiple Platforms

```bash
# Build for specific platforms
npm run build -- --win --mac --linux

# Build with specific configuration
npm run build -- --win --x64
```

## Output Files

All built files are placed in the `dist/` directory:

```
dist/
├── Gmail Attachment Downloader Setup 1.1.1.exe    # Windows Installer
├── Gmail Attachment Downloader 1.1.1.exe          # Windows Portable
├── Gmail Attachment Downloader-1.1.1.dmg          # macOS DMG
├── Gmail Attachment Downloader-1.1.1.AppImage     # Linux AppImage
└── gmail-attachment-downloader_1.1.1_amd64.deb    # Linux Debian Package
```

## Build Configuration

The build is configured in `package.json` under the `"build"` section:

- **App ID**: `com.gmail.attachment-downloader`
- **Product Name**: `Gmail Attachment Downloader`
- **Output Directory**: `dist/`

### Windows Build Features

- **NSIS Installer**: Full installer with desktop shortcuts
- **Portable**: Single executable file, no installation required
- **Architecture**: x64 (64-bit)

### Build Options

```bash
# Clean build (remove dist folder first)
rm -rf dist && npm run build-win

# Debug build information
npm run build-win -- --publish=never

# Build with specific electron version
npm run build-win -- --config.electronVersion=28.0.0
```

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**:

   ```bash
   npm install
   npm run build-win
   ```

2. **Permission errors on macOS/Linux**:

   ```bash
   sudo npm run build-win
   ```

3. **Missing dependencies**:

   ```bash
   npm install --save-dev electron-builder
   ```

4. **Wine errors (for cross-platform builds)**:
   ```bash
   # Reinstall wine
   brew uninstall wine && brew install wine
   ```

### Build Size Optimization

To reduce the executable size:

1. Remove unused dependencies
2. Use `npm run build-win -- --config.compression=maximum`
3. Enable `asar` packaging (default)

## Distribution

### Windows

- **Installer**: Best for general users, handles shortcuts and uninstall
- **Portable**: Best for corporate environments or USB drives

### Pre-build Setup

Before building, ensure:

1. **credentials.json**: Users need to provide their own Google API credentials
2. **Version**: Update version in `package.json`
3. **Testing**: Test the app with `npm run electron` before building

## Security Notes

- Built executables include all source code
- credentials.json is not included in builds (security)
- Users must provide their own Google API credentials
- All builds are unsigned (users may see security warnings)

## Build Scripts Reference

| Command                | Description               |
| ---------------------- | ------------------------- |
| `npm run build`        | Build for all platforms   |
| `npm run build-win`    | Build Windows executables |
| `npm run build-mac`    | Build macOS application   |
| `npm run build-linux`  | Build Linux packages      |
| `npm run electron`     | Run in development mode   |
| `npm run electron-dev` | Run with developer tools  |
