import express from 'express';
import axios from 'axios';
import { redis } from '../index.js';

const router = express.Router();
const STEAM_API_KEY = process.env.STEAM_API_KEY;
const STEAM_STORE_API = 'https://store.steampowered.com/api';

// Search for games
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.json({ games: [] });
    }

    // Get initial search results
    // Check cache first
    const cacheKey = `search:${query.toLowerCase()}`;
    const cachedResults = await redis.get(cacheKey);
    if (cachedResults) {
      return res.json({ games: JSON.parse(cachedResults) });
    }

    const response = await axios.get(`${STEAM_STORE_API}/storesearch/`, {
      params: {
        term: query,
        l: 'english',
        cc: 'US'
      }
    });

    // Filter out non-game content and get details for each item
    const gamesWithDetails = await Promise.all(
      response.data.items.map(async (item) => {
        try {
          const detailsResponse = await axios.get(`${STEAM_STORE_API}/appdetails`, {
            params: {
              appids: item.id,
              l: 'english',
              cc: 'US'
            }
          });

          const details = detailsResponse.data[item.id]?.data;
          // Only include if it's actually a game (not DLC, soundtrack, etc)
          if (details && details.type === 'game') {
            return {
              id: item.id,
              name: item.name,
              imageUrl: item.tiny_image,
              price: item.price ? item.price.final / 100 : null,
              released: item.released
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching details for ${item.id}:`, error);
          return null;
        }
      })
    );

    // Filter out null results and limit to first 10 games
    const games = gamesWithDetails
      .filter(game => game !== null)
      .slice(0, 10);

    // Cache the filtered results (expire after 1 hour)
    await redis.set(cacheKey, JSON.stringify(games), 'EX', 60 * 60);

    res.json({ games });
  } catch (error) {
    console.error('Steam API error:', error);
    res.status(500).json({ error: 'Failed to search games' });
  }
});

export const steamRouter = router;
