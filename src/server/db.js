import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

// Fallback manual .env loader if needed
if (!process.env.DATABASE_URL) {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const envPath = path.resolve(__dirname, '../../.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            for (const line of envContent.split('\n')) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                    const [key, ...vals] = trimmed.split('=');
                    const val = vals.join('=').trim();
                    if (key.trim() === 'DATABASE_URL' && val) {
                        process.env.DATABASE_URL = val;
                    }
                }
            }
        }
    } catch (e) {}
}

let pool = null;
let initialized = false;

async function getPool() {
    if (initialized) return pool;
    initialized = true;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.log('[Database] No DATABASE_URL set. Running with in-memory leaderboard storage.');
        return null;
    }

    try {
        const pgModule = await import('pg');
        const Pool = pgModule.default?.Pool || pgModule.Pool;
        if (Pool) {
            pool = new Pool({
                connectionString,
                ssl: {
                    rejectUnauthorized: false
                }
            });
            console.log('[Database] Connected to Neon PostgreSQL database.');
        }
    } catch (err) {
        console.warn('[Database] pg module not available, running in-memory mode:', err.message);
    }
    return pool;
}

export async function initDb() {
    const dbPool = await getPool();
    if (!dbPool) return;
    try {
        const client = await dbPool.connect();
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS leaderboard (
                    player_id VARCHAR(64) PRIMARY KEY,
                    player_name VARCHAR(64) NOT NULL,
                    score INT DEFAULT 0,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('[Database] Neon PostgreSQL leaderboard table ready.');
        } finally {
            client.release();
        }
    } catch (err) {
        console.warn('[Database] Database initialization warning:', err.message);
    }
}

export async function getGlobalLeaderboard() {
    const dbPool = await getPool();
    if (!dbPool) return null;
    try {
        const res = await dbPool.query(
            'SELECT player_id as id, player_name as name, score FROM leaderboard ORDER BY score DESC LIMIT 20'
        );
        return res.rows.map(row => ({
            id: row.id,
            name: row.name,
            score: Number(row.score)
        }));
    } catch (err) {
        console.warn('[Database] Failed to fetch leaderboard from DB:', err.message);
        return null;
    }
}

export async function savePlayerScore(playerId, playerName, score) {
    const dbPool = await getPool();
    if (!dbPool) return;
    try {
        await dbPool.query(
            `INSERT INTO leaderboard (player_id, player_name, score, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (player_id)
             DO UPDATE SET score = GREATEST(leaderboard.score, EXCLUDED.score), player_name = EXCLUDED.player_name, updated_at = NOW()`,
            [playerId, playerName || playerId, score]
        );
    } catch (err) {
        console.warn('[Database] Failed to update score in DB:', err.message);
    }
}
