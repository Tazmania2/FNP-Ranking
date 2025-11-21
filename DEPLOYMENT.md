# Deployment Guide

## Vercel Deployment Setup

This guide covers the complete setup process for deploying the Chicken Race Ranking application to Vercel.

### Prerequisites

1. **GitHub Repository**: Ensure your code is pushed to a GitHub repository
2. **Vercel Account**: Create an account at [vercel.com](https://vercel.com)
3. **Funifier API Credentials**: Obtain your API key and auth token from Funifier

### Environment Variables Setup

#### Required Environment Variables

The following environment variables must be configured in Vercel:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `VITE_FUNIFIER_SERVER_URL` | Funifier API server URL with version | `https://service2.funifier.com/v3` |
| `VITE_FUNIFIER_API_KEY` | Your Funifier API key | `your_api_key_here` |
| `VITE_FUNIFIER_AUTH_TOKEN` | Your Funifier Basic auth token | `Basic your_base64_encoded_token_here` |

#### Setting Environment Variables in Vercel

1. Go to your project dashboard in Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with the following settings:
   - **Name**: Variable name (e.g., `VITE_FUNIFIER_API_KEY`)
   - **Value**: Your actual credential value
   - **Environments**: Select "Production", "Preview", and "Development"

#### Environment Variable Security

- **Production**: Use your production Funifier credentials
- **Preview**: Use staging/test credentials if available, or production with caution
- **Development**: Use development credentials or production with limited scope

### GitHub Integration Setup
ll
#### Automatic Deployments

1. **Connect Repository**:
   - In Vercel dashboard, click "New Project"
   - Select "Import Git Repository"
   - Choose your GitHub repository
   - Select the `chicken-race-ranking` folder as the root directory

2. **Configure Build Settings**:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `chicken-race-ranking`
   - **Build Command**: `npm run build` (auto-configured)
   - **Output Directory**: `dist` (auto-configured)

3. **Deploy**:
   - Click "Deploy" to trigger the first deployment
   - Vercel will automatically detect the `vercel.json` configuration

#### Branch Configuration

- **Production Branch**: `main` or `master` (configure in project settings)
- **Preview Deployments**: Automatically created for all pull requests
- **Development**: Local development using `npm run dev`

### Build Optimization Features

The `vercel.json` configuration includes several optimizations:

#### Code Splitting
- **Vendor Bundle**: React and React DOM
- **Animations Bundle**: Framer Motion
- **Utils Bundle**: Axios and date-fns

#### Caching Strategy
- **Static Assets**: 1 year cache with immutable flag
- **HTML**: No cache for dynamic content
- **API Responses**: Configurable via headers

#### Security Headers
- **Content Security**: X-Content-Type-Options, X-Frame-Options
- **XSS Protection**: X-XSS-Protection header
- **Referrer Policy**: Strict origin policy

### Testing Deployment Pipeline

#### Preview Deployments

1. **Create Pull Request**:
   ```bash
   git checkout -b feature/test-deployment
   git push origin feature/test-deployment
   ```

2. **Automatic Preview**:
   - Vercel automatically creates a preview deployment
   - Preview URL is posted as a comment on the PR
   - Test all functionality in the preview environment

3. **Environment Testing**:
   - Verify API connections work with preview environment variables
   - Test leaderboard loading and data display
   - Confirm animations and interactions work correctly

#### Production Deployment

1. **Merge to Main**:
   ```bash
   git checkout main
   git merge feature/test-deployment
   git push origin main
   ```

2. **Automatic Production Deploy**:
   - Vercel automatically deploys to production
   - Monitor deployment logs in Vercel dashboard
   - Verify production functionality

### Monitoring and Maintenance

#### Deployment Monitoring

- **Build Logs**: Check Vercel dashboard for build success/failure
- **Runtime Logs**: Monitor function execution and errors
- **Performance**: Use Vercel Analytics for performance insights

#### Environment Variable Updates

1. Update variables in Vercel dashboard
2. Redeploy by pushing a commit or manual redeploy
3. Test changes in preview environment first

#### Rollback Procedure

1. Go to Vercel project dashboard
2. Navigate to "Deployments" tab
3. Find previous successful deployment
4. Click "Promote to Production"

### Troubleshooting

#### Common Issues

1. **Build Failures**:
   - Check environment variables are set correctly
   - Verify all dependencies are in `package.json`
   - Review build logs for specific errors

2. **API Connection Issues**:
   - Verify Funifier credentials are correct
   - Check CORS settings if needed
   - Ensure API endpoints are accessible from Vercel

3. **Environment Variable Issues**:
   - Ensure variables start with `VITE_` prefix
   - Check variable names match exactly
   - Verify values don't contain special characters that need escaping

#### Support Resources

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Vite Deployment Guide**: [vitejs.dev/guide/static-deploy.html](https://vitejs.dev/guide/static-deploy.html)
- **GitHub Integration**: [vercel.com/docs/git](https://vercel.com/docs/git)

### Security Checklist

- [ ] Environment variables are set in Vercel dashboard (not in code)
- [ ] Production credentials are separate from development
- [ ] Security headers are configured in `vercel.json`
- [ ] No sensitive data is committed to repository
- [ ] Preview deployments use appropriate test credentials
- [ ] HTTPS is enforced (automatic with Vercel)

### Performance Optimization

The deployment includes several performance optimizations:

- **Bundle Splitting**: Separate chunks for vendor, animations, and utilities
- **Static Asset Caching**: Long-term caching for immutable assets
- **Compression**: Automatic gzip/brotli compression
- **CDN**: Global edge network distribution
- **Tree Shaking**: Unused code elimination during build

### Next Steps

After successful deployment:

1. **Custom Domain** (optional): Configure custom domain in Vercel settings
2. **Analytics**: Enable Vercel Analytics for performance monitoring
3. **Monitoring**: Set up alerts for deployment failures
4. **Documentation**: Update README with production URL