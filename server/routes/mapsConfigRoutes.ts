import { Router, Request, Response } from 'express';
import { authenticateToken } from '../auth.js';

export const mapsConfigRouter = Router();

// Endpoint for frontend to safely retrieve Maps configuration
mapsConfigRouter.get('/config', (req: Request, res: Response) => {
  const apiKey = (process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim();
  res.json({
    hasKey: Boolean(apiKey),
    apiKey,
    defaultCenter: { lat: 37.7749, lng: -122.4194 },
    defaultZoom: 13,
    cityBounds: {
      north: 37.82,
      south: 37.70,
      east: -122.35,
      west: -122.52
    }
  });
});
