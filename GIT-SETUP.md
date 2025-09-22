# Git Configuration Guide

## Repository Setup

This repository has been configured with the following git settings and hooks for optimal development workflow.

### Current Configuration

```bash
# Repository initialized with:
git init
git config user.name "Developer"
git config user.email "developer@example.com"
git config core.autocrlf true  # Windows line ending handling
```

### Files and Configuration

#### `.gitignore`
Excludes:
- Node modules and build artifacts
- Environment files (`.env*`)
- IDE and OS files
- Vercel deployment files
- Test coverage reports

#### `.gitattributes`
Handles:
- Automatic text file detection
- Line ending normalization
- Binary file identification
- Platform-specific file handling

### Git Hooks

#### Pre-commit Hook
Located at `.git/hooks/pre-commit` (Unix) and `.git/hooks/pre-commit.bat` (Windows)

**Checks performed:**
- ✅ Scans for hardcoded API credentials
- ✅ Prevents committing `.env` files
- ✅ Runs deployment verification
- ✅ Validates project configuration

**Usage:**
```bash
git commit -m "Your commit message"
# Hook runs automatically before commit
```

#### Post-commit Hook
Located at `.git/hooks/post-commit`

**Actions performed:**
- ✅ Shows commit information
- ✅ Provides deployment reminders
- ✅ Shows branch and status info
- ✅ Lists untracked files

### Branch Strategy

#### Recommended Branches
- `main` - Production branch (auto-deploys to Vercel)
- `develop` - Development branch
- `feature/*` - Feature branches
- `hotfix/*` - Hotfix branches

#### Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Work on feature
git add .
git commit -m "Add new feature"

# Push feature branch
git push origin feature/new-feature

# Create pull request on GitHub
# After review, merge to main for deployment
```

### Deployment Integration

#### Automatic Deployment
- **Main branch** → Production deployment on Vercel
- **Pull requests** → Preview deployments on Vercel
- **GitHub Actions** → CI/CD pipeline with testing

#### Manual Deployment Commands
```bash
# Deploy preview
npm run deploy:preview

# Deploy production
npm run deploy:production

# Verify deployment setup
npm run verify:deployment
```

### Security Best Practices

#### Environment Variables
- ✅ Never commit `.env` files
- ✅ Use `.env.example` for documentation
- ✅ Set sensitive variables in Vercel dashboard
- ✅ Use `VITE_` prefix for client-side variables

#### Credential Management
- ✅ No hardcoded API keys in source code
- ✅ Pre-commit hooks scan for sensitive data
- ✅ Use placeholder values in examples
- ✅ Document required variables

### Common Git Commands

#### Daily Workflow
```bash
# Check status
git status

# Stage changes
git add .

# Commit with message
git commit -m "Descriptive commit message"

# Push to remote
git push origin branch-name

# Pull latest changes
git pull origin main
```

#### Branch Management
```bash
# List branches
git branch -a

# Switch branch
git checkout branch-name

# Create and switch to new branch
git checkout -b new-branch-name

# Delete branch
git branch -d branch-name
```

#### Deployment Commands
```bash
# Check deployment readiness
npm run verify:deployment

# Build for deployment
npm run build:fast

# Test build locally
npm run preview
```

### Troubleshooting

#### Common Issues

**1. Line Ending Warnings**
```bash
# Configure line endings
git config core.autocrlf true  # Windows
git config core.autocrlf input # Mac/Linux
```

**2. Pre-commit Hook Fails**
```bash
# Check for sensitive data
git diff --cached | grep -E "68a6752b|Basic.*Njhh"

# Fix linting issues
npm run lint:fix

# Verify deployment setup
npm run verify:deployment
```

**3. Merge Conflicts**
```bash
# View conflicts
git status

# Edit conflicted files
# Remove conflict markers (<<<<, ====, >>>>)

# Stage resolved files
git add resolved-file.js

# Complete merge
git commit
```

#### Reset and Recovery
```bash
# Unstage files
git reset HEAD file-name

# Discard changes
git checkout -- file-name

# Reset to last commit
git reset --hard HEAD

# View commit history
git log --oneline
```

### GitHub Integration

#### Repository Setup
1. Create repository on GitHub
2. Add remote origin:
   ```bash
   git remote add origin https://github.com/username/chicken-race-ranking.git
   ```
3. Push initial commit:
   ```bash
   git push -u origin main
   ```

#### Pull Request Workflow
1. Create feature branch
2. Push branch to GitHub
3. Create pull request
4. Review and test preview deployment
5. Merge to main for production deployment

### Vercel Integration

#### Automatic Setup
- Repository connected to Vercel
- Environment variables configured
- Build settings from `vercel.json`
- Preview deployments for PRs

#### Manual Setup
1. Connect GitHub repository to Vercel
2. Set environment variables in dashboard
3. Configure build settings (auto-detected)
4. Deploy and test

### Maintenance

#### Regular Tasks
- [ ] Review and update `.gitignore` as needed
- [ ] Check git hooks are working properly
- [ ] Update environment variable documentation
- [ ] Review branch protection rules
- [ ] Clean up old branches

#### Security Audits
- [ ] Scan for accidentally committed secrets
- [ ] Review access permissions
- [ ] Update API credentials if compromised
- [ ] Verify deployment security settings

---

## Quick Reference

### Essential Commands
```bash
# Setup
git clone <repository-url>
cd chicken-race-ranking
npm install

# Development
git checkout -b feature/my-feature
# ... make changes ...
git add .
git commit -m "Add my feature"
git push origin feature/my-feature

# Deployment
git checkout main
git merge feature/my-feature
git push origin main  # Triggers Vercel deployment
```

### Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Edit with your credentials
# VITE_FUNIFIER_API_KEY=your_key_here
# VITE_FUNIFIER_AUTH_TOKEN=your_token_here

# Verify setup
npm run verify:deployment
```