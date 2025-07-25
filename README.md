# top-tokens
Continuously fetch and display price data for the top tokens by volume, top movers, and most popular tokens.

## Architecture

This project follows Domain-Driven Design (DDD) and SOLID principles to ensure maintainability and scalability.

### Project Structure
```
top-tokens/
├── src/
│   ├── domain/           # Domain entities, repositories interfaces, value objects
│   ├── application/      # Use cases and application services
│   ├── infrastructure/   # Implementation of repositories, API clients, WebSocket
│   ├── interfaces/       # Controllers, WebSocket handlers
│   └── main.ts           # Application entry point
├── client/              # Web client
└── tests/               # Unit and integration tests
```

### Tech Stack
- Node.js
- TypeScript
- Express (API server)
- Socket.IO (WebSocket)
- Bitquery API integration
- React (client)

## Getting Started

### Prerequisites
- Node.js v14 or higher
- Bitquery API key

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/top-tokens.git
cd top-tokens

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Add your Bitquery API key to .env file

# Start the server
npm run dev

# In another terminal, start the client
cd client
npm install
npm start
```
