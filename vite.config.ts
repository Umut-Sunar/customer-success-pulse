import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Connect } from 'vite';

// IP whitelist middleware factory
function createIpWhitelistMiddleware(allowedIP: string, allowLocalhost: boolean = false): Connect.NextHandleFunction {
  return (req, res, next) => {
    // Get client IP address with multiple fallbacks
    // Priority: x-forwarded-for > x-real-ip > cf-connecting-ip (Cloudflare) > socket.remoteAddress
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    const realIP = req.headers['x-real-ip'] as string;
    const cfConnectingIP = req.headers['cf-connecting-ip'] as string;
    const socketIP = req.socket.remoteAddress;
    
    // Get the first IP from x-forwarded-for (can contain multiple IPs)
    const firstForwardedIP = forwardedFor?.split(',')[0]?.trim();
    
    // Determine the actual client IP
    // IMPORTANT: In production, trust x-forwarded-for only if behind a trusted proxy
    const clientIP = firstForwardedIP || 
                     cfConnectingIP ||
                     realIP || 
                     socketIP ||
                     'unknown';

    // Remove IPv6 prefix if present
    const cleanIP = clientIP.replace(/^::ffff:/, '');

    // Only allow strict localhost if explicitly enabled
    // This prevents private network IP spoofing attacks
    const isStrictLocalhost = allowLocalhost && (
      cleanIP === '127.0.0.1' || 
      cleanIP === '::1' || 
      cleanIP === 'localhost'
    );

    // Debug logging (can be disabled in production)
    console.log(`[IP CHECK] Detected IP: ${cleanIP}`);
    console.log(`[IP CHECK] Headers - x-forwarded-for: ${forwardedFor || 'not set'}, x-real-ip: ${realIP || 'not set'}, cf-connecting-ip: ${cfConnectingIP || 'not set'}, socket: ${socketIP || 'not set'}`);

    // Check if IP is allowed
    if (cleanIP !== allowedIP && !isStrictLocalhost) {
      console.log(`[IP BLOCKED] ${cleanIP} attempted to access the application`);
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Denied</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 600px;
            }
            h1 { color: #dc2626; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>403 - Access Denied</h1>
            <p>Your IP address (<strong>${cleanIP}</strong>) is not authorized to access this application.</p>
            <p>Only IP address <strong>${allowedIP}</strong> is allowed.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    if (isStrictLocalhost) {
      console.log(`[IP ALLOWED - LOCALHOST] ${cleanIP} accessed the application`);
    } else {
      console.log(`[IP ALLOWED] ${cleanIP} accessed the application`);
    }
    next();
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Get allowed IP from environment or use default
    const allowedIP = env.ALLOWED_IP || '188.119.9.106';
    
    // Only allow localhost in development mode or if explicitly enabled
    // In production, set ALLOW_LOCALHOST=false for maximum security
    const allowLocalhost = env.ALLOW_LOCALHOST === 'true' || mode === 'development';
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'ip-whitelist',
          configureServer(server) {
            server.middlewares.use(createIpWhitelistMiddleware(allowedIP, allowLocalhost));
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
