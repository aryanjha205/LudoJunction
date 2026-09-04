import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

try {
    await import('dotenv/config');
} catch (err) {
    console.log('[Server] dotenv not loaded, using process.env directly.');
}

import { LudoServer } from './WebSocketServer.js';
import { initDb, getGlobalLeaderboard } from './db.js';

try {
    await initDb();
} catch (err) {
    console.warn('[Server] DB init skipped:', err.message);
}

const port = process.env.PORT ? Number(process.env.PORT) : 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicRoot = path.resolve(__dirname, '../client');

const MIME_TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.txt': 'text/plain; charset=utf-8',
	'.wasm': 'application/wasm',
};

const server = http.createServer(async (req, res) => {
	try {
		const urlPath = (req.url ?? '/').split('?')[0];

		// CORS & Health check
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

		if (req.method === 'OPTIONS') {
			res.writeHead(204);
			res.end();
			return;
		}

		if (urlPath === '/healthz' || urlPath === '/health') {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
			return;
		}

		if (urlPath === '/api/leaderboard') {
			try {
				const leaderboard = await getGlobalLeaderboard();
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ success: true, leaderboard: leaderboard || [] }));
			} catch (err) {
				res.writeHead(500, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ success: false, error: err.message }));
			}
			return;
		}

		const safePath = urlPath === '/' ? '/index.html' : urlPath;
		const resolvedPath = path.join(publicRoot, safePath);

		if (!resolvedPath.startsWith(publicRoot)) {
			res.writeHead(403).end('Forbidden');
			return;
		}

		const data = await fs.readFile(resolvedPath);
		const ext = path.extname(resolvedPath).toLowerCase();
		const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

		res.writeHead(200, { 'Content-Type': contentType });
		res.end(data);
	} catch (error) {
		if (error.code === 'ENOENT') {
			res.writeHead(404).end('Not Found');
			return;
		}
		console.error('Error serving request', error);
		res.writeHead(500).end('Internal Server Error');
	}
});

server.listen(port, () => {
	console.log(`HTTP server listening on http://localhost:${port}`);
});

new LudoServer({ server });
