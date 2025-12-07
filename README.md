# Ultimate Self-Hosting Guide for Next.js on VPS

This guide covers the end-to-end process of deploying a Next.js 15+ application to a self-hosted Linux VPS (Ubuntu/Debian) using **Standalone Output**, **PM2**, and **Nginx**.

---

## Phase 1: Local Project Configuration

Before deploying, ensure your project is configured to produce a server-ready build.

### 1. Enable Standalone Output
In [next.config.ts](file:///Users/mdfasadik/Documents/nextvolt/next.config.ts), add `output: 'standalone'`. This tells Next.js to bundle only the necessary files for production.

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone', // <--- Critical for VPS deployment
  // ... other config
};
export default nextConfig;
```

### 2. Update Metadata Base
In [app/layout.tsx](file:///Users/mdfasadik/Documents/nextvolt/app/layout.tsx), ensure `metadataBase` won't crash if `VERCEL_URL` is missing.

```typescript
// app/layout.tsx
const defaultUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  // ...
};
```

---

## Phase 2: Building for Production

On your local machine (or CI pipeline), run the build command.

```bash
npm run build
```

This generates a `.next` folder. The critical artifact is `.next/standalone`.

---

## Phase 3: Deploying to Server

Connect to your VPS and prepare the directory.

### 1. Prepare Server Directory
```bash
# On your VPS
mkdir -p /var/www/nextvolt
```

### 2. Transfer Files
You need to move specific folders from your local build to the server.

| Source (Local) | Destination (Server) | Description |
| :--- | :--- | :--- |
| `.next/standalone/*` | `/var/www/nextvolt/` | The core server application & `node_modules` |
| `.next/static` | `/var/www/nextvolt/.next/static` | **CRITICAL**: CSS/JS assets needed for the UI |
| `public` | `/var/www/nextvolt/public` | Images, favicon, fonts |
| `.env.local` | `/var/www/nextvolt/.env` | Environment variables (Db keys, etc) |

**Final Directory Structure on Server:**
```text
/var/www/nextvolt/
├── .env                <-- Don't forget this!
├── package.json
├── server.js
├── public/
└── .next/
    └── static/         <-- Must be inside .next/
```

### 3. Verify on Server
Go to the directory and dry-run check if the server starts manually.
```bash
cd /var/www/nextvolt
node server.js
# You should see "Ready in ... ms". 
# Press Ctrl+C to stop it.
```

---

## Phase 4: Process Management (PM2)

Use PM2 to keep the app properly running in the background.

```bash
# Install PM2 globally if not present
npm install -g pm2

# Start the application
cd /var/www/nextvolt
pm2 start server.js --name nextvolt

# Save the process list so it survives reboots
pm2 save
pm2 startup
```

---

## Phase 5: Reverse Proxy (Nginx)

Expose the app to the internet on port 80/443.

### 1. Create Config
Create `/etc/nginx/sites-available/nextvolt`:

```nginx
server {
    listen 80;
    server_name example.com; # <--- Replace with your domain

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Enable and Restart
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/nextvolt /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 3. SSL (HTTPS)
Secure your site with a free certificate.
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d example.com
```

---

## Troubleshooting Checklist
- **`s is not a function`**: You didn't use Standalone mode or copied the wrong `node_modules`. Re-do Phase 3.
- **`502 Bad Gateway`**: The node app isn't running. Check `pm2 status` and `pm2 logs nextvolt`.
- **`500 Internal Server Error`**: Likely missing `.env` file. Check logs.
- **Missing Styles/Images**: You forgot to copy `.next/static` or `public` folders to the correct location in the standalone directory.
