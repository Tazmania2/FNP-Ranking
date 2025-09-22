# Deployment Checklist

## Pre-Deployment Verification fROCE pUSH

Run this checklist before deploying to ensure everything is configured correctly:

### ✅ Configuration Files
- [ ] `vercel.json` exists with proper build settings
- [ ] `.env.example` contains all required environment variables
- [ ] `.gitignore` excludes sensitive files (`.env`, `.vercel`)
- [ ] `package.json` has deployment scripts

### ✅ Security Check
- [ ] No hardcoded API credentials in source code
- [ ] Environment variables use `VITE_` prefix for client-side access
- [ ] Sensitive credentials are documented for Vercel dashboard setup

### ✅ Build Verification
- [ ] `npm run build:fast` completes successfully
- [ ] `dist/` directory is created with all assets
- [ ] `npm run verify:deployment` passes all checks

### ✅ GitHub Setup
- [ ] Code is pushed to GitHub repository
- [ ] CI/CD workflow file exists (`.github/workflows/ci.yml`)
- [ ] Repository is ready for Vercel integration

## Vercel Dashboard Setup

### 1. Project Creation
- [ ] Import project from GitHub
- [ ] Set root directory to `chicken-race-ranking`
- [ ] Framework preset: Vite (auto-detected)

### 2. Environment Variables
Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Environment | Value |
|----------|-------------|-------|
| `VITE_FUNIFIER_API_KEY` | Production, Preview, Development | Your Funifier API key |
| `VITE_FUNIFIER_AUTH_TOKEN` | Production, Preview, Development | Your Funifier auth token |

### 3. Build Settings (Auto-configured via vercel.json)
- [ ] Build Command: `npm run build:fast`
- [ ] Output Directory: `dist`
- [ ] Install Command: `npm install`

### 4. Domain Configuration (Optional)
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] DNS records updated

## Post-Deployment Testing

### ✅ Functionality Tests
- [ ] Application loads without errors
- [ ] Funifier API connection works
- [ ] Leaderboard data displays correctly
- [ ] Chicken animations work smoothly
- [ ] Tooltips appear on hover
- [ ] Sidebar shows top 5 players
- [ ] Detailed ranking table loads
- [ ] Leaderboard selector works
- [ ] Auto-cycle functionality works (if enabled)

### ✅ Performance Tests
- [ ] Page load time < 3 seconds
- [ ] Animations run at 60fps
- [ ] No console errors
- [ ] Mobile responsiveness works
- [ ] API polling doesn't cause performance issues

### ✅ Error Handling Tests
- [ ] Network errors display appropriate messages
- [ ] Invalid API credentials show clear error
- [ ] Empty leaderboards handle gracefully
- [ ] Loading states display correctly

## Monitoring Setup

### ✅ Vercel Analytics (Optional)
- [ ] Enable Vercel Analytics in dashboard
- [ ] Monitor Core Web Vitals
- [ ] Track page views and performance

### ✅ Error Monitoring (Optional)
- [ ] Set up error tracking service
- [ ] Configure alerts for deployment failures
- [ ] Monitor API error rates

## Rollback Plan

If deployment fails or issues are discovered:

1. **Immediate Rollback**:
   - Go to Vercel Dashboard → Deployments
   - Find last working deployment
   - Click "Promote to Production"

2. **Fix and Redeploy**:
   - Fix issues in development
   - Test locally with `npm run build:fast && npm run preview`
   - Push to GitHub for automatic redeployment

## Maintenance

### Regular Tasks
- [ ] Monitor deployment logs weekly
- [ ] Update dependencies monthly
- [ ] Review and rotate API credentials quarterly
- [ ] Test backup/restore procedures

### Performance Optimization
- [ ] Review bundle size reports
- [ ] Optimize images and assets
- [ ] Monitor API response times
- [ ] Update caching strategies as needed

## Support Contacts

- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Funifier API**: Check Funifier documentation
- **GitHub Issues**: Use repository issue tracker

---

## Quick Commands

```bash
# Verify deployment setup
npm run verify:deployment

# Build for deployment
npm run build:fast

# Test build locally
npm run preview

# Deploy to preview
npm run deploy:preview

# Deploy to production
npm run deploy:production
```

## Environment Variables Template

Copy this to your Vercel environment variables:

```
VITE_FUNIFIER_API_KEY=your_api_key_here
VITE_FUNIFIER_AUTH_TOKEN=your_auth_token_here
```

**⚠️ Important**: Never commit actual credentials to your repository!