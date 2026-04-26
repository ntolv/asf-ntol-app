# 🛡️ UTF-8 Protection Guide - ASF-NTOL Project

## 📋 OVERVIEW

This guide ensures complete UTF-8 protection for the ASF-NTOL Next.js project on Windows + VS Code.

## 🔧 FILES CREATED

### 1. `.gitattributes`
- **Purpose**: Git-level UTF-8 enforcement
- **Features**: 
  - Forces UTF-8 encoding for all text files
  - Normalizes line endings to LF (Unix style)
  - Handles binary files correctly
  - Prevents encoding drift across platforms

### 2. `.editorconfig`
- **Purpose**: Editor-independent UTF-8 settings
- **Features**:
  - UTF-8 charset for all file types
  - Consistent indentation (2 spaces)
  - LF line endings
  - Trailing whitespace removal

### 3. `.vscode/settings.json`
- **Purpose**: VS Code-specific UTF-8 configuration
- **Features**:
  - Forces UTF-8 encoding
  - Auto-detection of file encoding
  - Consistent formatting settings
  - File-type specific UTF-8 enforcement

### 4. `scripts/check-utf8.ps1`
- **Purpose**: Non-destructive UTF-8 verification script
- **Features**:
  - Scans all source files for UTF-8 compliance
  - Reports problematic files
  - Optional auto-fix mode
  - Excludes build artifacts and dependencies

## 🚀 IMPLEMENTATION ORDER

### Step 1: Add to Git (Required)
```bash
git add .gitattributes .editorconfig .vscode/settings.json scripts/check-utf8.ps1
git commit -m "feat: add UTF-8 protection files"
```

### Step 2: VS Code Setup (Automatic)
- Restart VS Code
- Install recommended extensions:
  - `EditorConfig.EditorConfig`
  - `ms-vscode.vscode-typescript-next`

### Step 3: Initial UTF-8 Check
```powershell
# Check current state (read-only)
.\scripts\check-utf8.ps1

# Fix any issues (if found)
.\scripts\check-utf8.ps1 -Fix
```

## 📝 USAGE

### Regular Development
- **VS Code**: Automatically handles UTF-8
- **Git**: Automatically normalizes line endings
- **EditorConfig**: Ensures consistency across editors

### Verification Script
```powershell
# Check all files
.\scripts\check-utf8.ps1

# Check specific directory
.\scripts\check-utf8.ps1 -Path "src/app"

# Auto-fix issues
.\scripts\check-utf8.ps1 -Fix
```

## ⚠️ IMPORTANT NOTES

### Windows Specific
- PowerShell script requires execution policy:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### Git Configuration
- Ensure global Git config doesn't override project settings:
  ```bash
  git config --global core.autocrlf input
  git config --global core.eol lf
  ```

### VS Code Extensions
- Install EditorConfig extension for automatic detection
- Consider "Auto Rename Tag" for JSX consistency

## 🔄 MAINTENANCE

### Weekly Check
```powershell
# Quick verification
.\scripts\check-utf8.ps1
```

### After External Changes
```powershell
# Run after pulling changes or switching branches
.\scripts\check-utf8.ps1 -Fix
```

### Before Commits
- VS Code will show encoding in status bar
- Git hooks (if added) can run the script automatically

## 🎯 PREVENTION RULES

### DO ✅
- Use VS Code for all file editing
- Commit `.gitattributes` and `.editorconfig`
- Run verification script after major changes
- Restart VS Code after config changes

### DON'T ❌
- Use Notepad for source files
- Ignore encoding warnings
- Mix editors without EditorConfig
- Commit files with encoding issues

## 🐛 TROUBLESHOOTING

### Common Issues
1. **Files still show as corrupted**: Run script with `-Fix`
2. **Git shows encoding changes**: Commit the new config files first
3. **VS Code ignores settings**: Restart VS Code after adding `.vscode/settings.json`

### Recovery Commands
```bash
# Reset all files to proper encoding
git add . && git reset --hard HEAD
.\scripts\check-utf8.ps1 -Fix
```

## 📞 SUPPORT

If encoding issues persist:
1. Run verification script with `-Fix`
2. Check VS Code status bar for encoding
3. Verify Git configuration
4. Restart development environment

---

**This protection system ensures UTF-8 consistency across the entire ASF-NTOL project lifecycle.**
