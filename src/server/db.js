const connectionString = process.env.DATABASE_URL;

let pool = null;

if (connectionString) {
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
            console.log('[Database] Connecting to Neon PostgreSQL database...');
        }
    } catch (err) {
        console.warn('[Database] pg module not available, running in-memory mode:', err.message);
    }
} else {
    console.log('[Database] No DATABASE_URL set. Running with in-memory leaderboard storage.');
}

export async function initDb() {
    if (!pool) return;
    try {
        const client = await pool.connect();
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS leaderboard (
                    player_id VARCHAR(64) PRIMARY KEY,
                    player_name VARCHAR(64) NOT NULL,
                    score INT DEFAULT 0,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('[Database] Neon PostgreSQL leaderboard table initialized.');
        } finally {
            client.release();
        }
    } catch (err) {
        console.warn('[Database] Database initialization error, proceeding with memory storage:', err.message);
    }
}

export async function getGlobalLeaderboard() {
    if (!pool) return null;
    try {
        const res = await pool.query(
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
    if (!pool) return;
    try {
        await pool.query(
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
