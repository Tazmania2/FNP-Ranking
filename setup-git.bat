@echo off
REM Git Setup Script for Chicken Race Ranking
REM This script helps set up the git repository with proper configuration

echo 🔧 Setting up Git repository for Chicken Race Ranking...
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

REM Check if already in a git repository
if exist .git (
    echo ✅ Git repository already initialized
) else (
    echo 📁 Initializing Git repository...
    git init
    if errorlevel 1 (
        echo ❌ Failed to initialize Git repository
        pause
        exit /b 1
    )
)

REM Set up git configuration (you may want to change these)
echo 👤 Setting up Git user configuration...
git config user.name "Developer"
git config user.email "developer@example.com"
git config core.autocrlf true

echo ✅ Git configuration complete!
echo.

REM Check if there are files to commit
git status --porcelain >nul 2>&1
if not errorlevel 1 (
    echo 📝 Files ready to commit found
    echo.
    echo Would you like to create an initial commit? (y/n)
    set /p choice=
    if /i "%choice%"=="y" (
        echo 📦 Adding all files...
        git add .
        echo 💾 Creating initial commit...
        git commit -m "Initial commit: Chicken Race Ranking application"
        echo ✅ Initial commit created!
    )
)

echo.
echo 🎉 Git setup complete!
echo.
echo Next steps:
echo 1. Create a repository on GitHub
echo 2. Add remote origin: git remote add origin https://github.com/username/repo.git
echo 3. Push to GitHub: git push -u origin main
echo 4. Connect to Vercel for deployment
echo.
echo For detailed instructions, see GIT-SETUP.md
echo.
pause