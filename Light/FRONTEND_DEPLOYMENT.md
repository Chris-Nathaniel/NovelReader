# Frontend Deployment Guide

## Setup Instructions

### 1. Install Dependencies

```bash
cd Light
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the `Light/` directory:

```env
# Backend API URL
VITE_API_URL=http://localhost:3001
```

For production:

```env
VITE_API_URL=https://your-backend-domain.com
```

### 3. Development

Run the frontend development server:

```bash
npm run dev
```

This will start Vite at `http://localhost:5173`

The backend should be running on `http://localhost:3001`

### 4. Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

## Deployment Options

### Static Hosting (Recommended)

The frontend is a static React app that can be hosted anywhere.

#### Vercel (Easiest)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add environment variable:
   - `VITE_API_URL` = your backend URL
5. Deploy automatically

#### Netlify

1. Push code to GitHub
2. Connect to [netlify.com](https://netlify.com)
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Add environment variable: `VITE_API_URL`
6. Deploy

#### AWS S3 + CloudFront

1. Build: `npm run build`
2. Upload `dist/` contents to S3
3. Configure CloudFront for HTTPS
4. Point your domain to CloudFront

#### GitHub Pages

1. Update `vite.config.js` with your repo name as base
2. Run: `npm run build`
3. Push `dist/` to `gh-pages` branch

### Docker

Create `Dockerfile` in `Light/` folder:

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Nginx server
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:

```nginx
server {
    listen 80;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://your-backend-url;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

Build and run:
```bash
docker build -t novelreader-frontend .
docker run -p 80:80 novelreader-frontend
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Backend API URL |

## Development vs Production

### Development (.env.local)
```env
VITE_API_URL=http://localhost:3001
```

### Production (.env.local)
```env
VITE_API_URL=https://api.yourdomain.com
```

## API Configuration

The frontend uses the `VITE_API_URL` environment variable for all API calls.

Update your API service to use:
```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
```

## CORS Configuration

Make sure your backend has the correct `CORS_ORIGIN` set to your frontend domain:

Backend `.env.local`:
```env
CORS_ORIGIN=https://your-frontend-domain.com
```

## Performance Optimization

1. **Production Build**: Always use `npm run build` for production
2. **Gzip**: Enable gzip compression on your hosting platform
3. **Caching**: Set proper cache headers for static assets
4. **CDN**: Use a CDN for static files

## Troubleshooting

### CORS Errors
- Check backend's `CORS_ORIGIN` is set to your frontend URL
- Verify both are using HTTPS in production

### API calls failing
- Check `VITE_API_URL` is correct in `.env.local`
- Ensure backend is running and accessible
- Check browser console for network errors

### Build fails
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node version: `node --version` (should be 18+)

## Next Steps

1. Deploy backend first
2. Set `VITE_API_URL` to your backend domain
3. Deploy frontend
4. Test API connectivity
5. Monitor browser console for errors

---

**Related**: See `../backend/DEPLOYMENT.md` for backend deployment instructions.
