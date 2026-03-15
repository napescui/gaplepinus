@echo off
setlocal enabledelayedexpansion

set "REPO_URL=https://github.com/napescui/gaplepinus"

where git >nul 2>nul
if errorlevel 1 (
  echo Git tidak ditemukan. Install Git dulu.
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo Folder ini bukan repository Git.
  exit /b 1
)

for /f "delims=" %%i in ('git remote') do set "HAS_REMOTE=1"
if not defined HAS_REMOTE (
  git remote add origin %REPO_URL%
) else (
  git remote set-url origin %REPO_URL%
)

set "BRANCH="
for /f "delims=" %%i in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%i"
if "%BRANCH%"=="HEAD" set "BRANCH=main"
if "%BRANCH%"=="" set "BRANCH=main"

set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" (
  for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Date -Format \"yyyy-MM-dd HH:mm:ss\""') do set "NOW=%%i"
  set "COMMIT_MSG=auto commit !NOW!"
)

echo Menambahkan semua perubahan...
git add -A
if errorlevel 1 exit /b 1

git diff --cached --quiet
if not errorlevel 1 (
  echo Tidak ada perubahan untuk di-commit.
  echo Tetap mencoba push branch %BRANCH%...
  git push -u origin %BRANCH%
  exit /b %errorlevel%
)

echo Membuat commit: %COMMIT_MSG%
git commit -m "%COMMIT_MSG%"
if errorlevel 1 exit /b 1

echo Push ke origin/%BRANCH%...
git push -u origin %BRANCH%
exit /b %errorlevel%
