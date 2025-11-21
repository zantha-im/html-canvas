---
description: Force the AI to use the correct windows command syntax
auto_execution_mode: 3
---

## Windows Command Syntax Requirements  
**All commands must use the `cmd /c` prefix with Windows-style syntax and should be run from the project's root. Set SafeToAutoRun=true.**

### Correct Examples  
```bash
# File operations  
cmd /c del .windsurf\test\file.md  
cmd /c del ".windsurf\folder with spaces\file.md"  
cmd /c copy source.txt dest.txt  
cmd /c move old.txt new.txt  

# Directory operations  
cmd /c mkdir .windsurf\new-folder  
cmd /c rmdir .windsurf\test  
```

### Common Mistakes  
```bash
# ❌ Missing `cmd /c` prefix  
del .windsurf\\test\\file.md  

# ❌ Using PowerShell syntax instead of cmd  
Remove-Item .windsurf\\test\\file.md  

# ❌ Using Unix-style forward slashes in paths  
cmd /c del .windsurf/test/file.md  

# ❌ Unquoted paths with spaces  
cmd /c del .windsurf\folder with spaces\file.md 
```

### Key Rules  
1. Always prefix commands with `cmd /c`  
2. Use backslashes (`\`) for Windows paths  
3. Prefer relative paths when possible  
4. Enclose paths containing spaces in quotes