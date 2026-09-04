import { getGlobalLeaderboard } from '../src/server/db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const leaderboard = await getGlobalLeaderboard();
        return res.status(200).json({
            success: true,
            leaderboard: leaderboard || []
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
}
