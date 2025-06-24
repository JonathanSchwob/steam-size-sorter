# Steam Size Sorter


## Features

- Sorts all games on Steam account by storage size even if they aren't installed.
- Steam authentication
- Game search 
- Shows total storage size of entire library

## Tech Stack

- Frontend: React + TailwindCSS
- Backend: Node.js + Express
- Authentication: Steam OpenID

## Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Environment Variables

Create `.env` files in both frontend and backend directories:

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

### Backend (.env)
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/pixel-chat
REDIS_URL=redis://localhost:6379
STEAM_API_KEY=your_steam_api_key
STEAM_RETURN_URL=http://localhost:3000/auth/steam/return
```
