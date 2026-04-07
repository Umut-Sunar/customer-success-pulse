// Development server for API routes
// This allows API routes to work in development mode
import { createServer } from 'http';
import { parse } from 'url';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import busboy from 'busboy';
import { FormData } from 'undici';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3001;

// Import API handlers
async function loadApiHandler(path) {
  try {
    // Try .ts first (for TypeScript files), then .js
    try {
      const handler = await import(`./api/${path}.ts`);
      return handler.default;
    } catch (tsError) {
      const handler = await import(`./api/${path}.js`);
      return handler.default;
    }
  } catch (error) {
    console.error(`Error loading API handler for ${path}:`, error);
    return null;
  }
}

const server = createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  const { pathname, query } = parsedUrl;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'local-api-server' }));
      return;
    }
    try {
      // Convert path to handler path
      // /api/tenants -> tenants/index
      // /api/tenants/import -> tenants/import
      // /api/tenants/123 -> tenants/[id]
      // /api/customers/123/tenants -> customers/[id]/tenants
      
      let handlerPath = pathname.replace('/api/', '').replace(/\//g, '/');
      
      // Handle dynamic routes
      if (handlerPath.includes('/tenants/') && !handlerPath.includes('/import')) {
        handlerPath = handlerPath.replace(/\/tenants\/(\d+)/, '/tenants/[id]');
      }
      if (handlerPath.includes('/customers/') && handlerPath.includes('/tenants')) {
        handlerPath = handlerPath.replace(/\/customers\/[^/]+\/tenants/, '/customers/[id]/tenants');
      }
      
      // Convert to file path
      const filePath = handlerPath
        .replace('/tenants', 'tenants')
        .replace('/customers', 'customers')
        .replace('[id]', '[id]')
        .replace(/\//g, '/');
      
      // Try to load handler
      let handler;
      if (filePath === 'tenants') {
        handler = await loadApiHandler('tenants/index');
      } else if (filePath === 'tenants/import') {
        handler = await loadApiHandler('tenants/import');
      } else if (filePath.startsWith('tenants/')) {
        handler = await loadApiHandler('tenants/[id]');
      } else if (filePath === 'customers') {
        handler = await loadApiHandler('customers/index');
      } else if (filePath === 'customers/import') {
        handler = await loadApiHandler('customers/import');
      } else if (/^customers\/[^/]+\/onboarding$/.test(filePath)) {
        handler = await loadApiHandler('customers/[id]/onboarding');
      } else if (/^customers\/[^/]+\/notes$/.test(filePath)) {
        handler = await loadApiHandler('customers/[id]/notes');
      } else if (filePath.includes('customers') && filePath.includes('tenants')) {
        handler = await loadApiHandler('customers/[id]/tenants');
      } else if (/^customers\/[^/]+$/.test(filePath)) {
        handler = await loadApiHandler('customers/[id]');
      } else if (filePath === 'accounts') {
        handler = await loadApiHandler('accounts/index');
      } else if (filePath === 'accounts/import') {
        handler = await loadApiHandler('accounts/import');
      } else if (/^accounts\/[^/]+$/.test(filePath)) {
        handler = await loadApiHandler('accounts/[id]');
      } else {
        handler = await loadApiHandler(filePath);
      }

      if (handler) {
        const contentType = req.headers['content-type'] || '';
        const requestUrl = `http://localhost:${PORT}${pathname}${query ? '?' + new URLSearchParams(query).toString() : ''}`;
        let response;
        
        if (req.method === 'POST' && contentType.includes('multipart/form-data')) {
          // Parse multipart/form-data using busboy
          const formData = new FormData();
          
          const parsedFormData = await new Promise((resolve, reject) => {
            try {
              const bb = busboy({ headers: req.headers });
              let pendingFiles = 0;
              let finished = false;
              
              const tryResolve = () => {
                if (finished && pendingFiles === 0) {
                  resolve(formData);
                }
              };
              
              bb.on('file', (name, file, info) => {
                const { filename, encoding, mimeType } = info;
                pendingFiles++;
                const chunks = [];
                file.on('data', (chunk) => chunks.push(chunk));
                file.on('end', () => {
                  const buffer = Buffer.concat(chunks);
                  const fileObj = new File([buffer], filename, { type: mimeType });
                  formData.append(name, fileObj);
                  pendingFiles--;
                  tryResolve();
                });
                file.on('error', (err) => {
                  pendingFiles--;
                  reject(err);
                });
              });
              
              bb.on('field', (name, value) => {
                formData.append(name, value);
              });
              
              bb.on('finish', () => {
                finished = true;
                tryResolve();
              });
              
              bb.on('error', (err) => reject(err));
              
              req.pipe(bb);
            } catch (busboyError) {
              console.error('Busboy initialization error:', busboyError);
              reject(busboyError);
            }
          });

          // Create a Request object that directly returns the parsed FormData
          // This avoids the expensive serialize→re-parse roundtrip
          const request = new Request(requestUrl, {
            method: req.method,
            headers: req.headers,
          });
          // Override formData() to return the already-parsed FormData directly
          request.formData = () => Promise.resolve(parsedFormData);

          response = await handler(request, { params: {} });
        } else {
          let requestBody;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            requestBody = await streamToString(req);
          }

          const request = new Request(requestUrl, {
            method: req.method,
            headers: req.headers,
            body: requestBody,
          });

          response = await handler(request, { params: {} });
        }
        
        // Send response
        res.writeHead(response.status, Object.fromEntries(response.headers));
        const body = await response.text();
        res.end(body);
        return;
      } else {
        console.error(`Handler not found for path: ${pathname}, filePath: ${filePath}`);
      }
    } catch (error) {
      console.error('API handler error:', error);
      console.error('Error stack:', error.stack);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', details: error.message }));
      return;
    }
  }

  // 404 for API routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString()));
    stream.on('error', reject);
  });
}

server.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📝 API routes available at http://localhost:${PORT}/api/*`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
});

