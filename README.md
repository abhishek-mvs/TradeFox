# TradeFox - Portfolio & PnL Tracker

A backend service for tracking trading portfolios and calculating profit & loss (PnL) using TypeScript, PostgreSQL, and Express.js.

## Features

- ✅ Create and execute trade orders
- ✅ View user portfolio with current holdings
- ✅ Calculate realized and unrealized PnL
- ✅ FIFO-based PnL calculation
- ✅ Real-time price data from Pyth Network
- ✅ Request/response validation using Zod
- ✅ TypeScript for type safety

## Tech Stack

- **Runtime**: Node.js 20
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 16
- **Validation**: Zod
- **Price Data**: Pyth Network Hermes Client
- **Package Manager**: npm

## Prerequisites

- Node.js 20 or higher
- PostgreSQL 16 or higher
- Docker and Docker Compose (optional, for containerized setup)

## Setup Instructions

### Option 1: Using Docker Compose (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd TradeFox
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```
   
   Or create `.env.local` with:
   ```
   DB_HOST=db
   DB_PORT=5432
   DB_NAME=tradefox
   DB_USER=postgres
   DB_PASSWORD=postgres
   PORT=3000
   ```

3. **Start services:**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations:**
   ```bash
   docker-compose exec app npm run migrate
   ```

5. **Seed the database:**
   ```bash
   docker-compose exec app npm run seed
   ```

### Option 2: Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL database:**
   ```bash
   createdb tradefox
   ```

3. **Create environment file:**
   Create `.env.local` in the root directory:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tradefox
   DB_USER=postgres
   DB_PASSWORD=your_password
   PORT=3000
   ```

4. **Run database migrations:**
   ```bash
   npm run migrate
   ```

5. **Seed the database:**
   ```bash
   npm run seed
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

   Or build and run:
   ```bash
   npm run build
   npm start
   ```

## Database Schema

### Users
- `id` (UUID, Primary Key)
- `name` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Assets
- `id` (UUID, Primary Key)
- `name` (VARCHAR)
- `symbol` (VARCHAR, Unique)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Trades
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → Users)
- `base_asset_id` (UUID, Foreign Key → Assets)
- `quote_asset_id` (UUID, Foreign Key → Assets)
- `price` (DECIMAL)
- `base_quantity` (DECIMAL)
- `quote_quantity` (DECIMAL)
- `side` (VARCHAR: 'buy' or 'sell')
- `status` (VARCHAR: 'EXECUTED' or 'CANCELLED')
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Portfolio
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → Users)
- `asset_id` (UUID, Foreign Key → Assets)
- `quantity` (DECIMAL)
- `avg_buying_price` (DECIMAL)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## API Endpoints

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed API documentation.

### Quick Reference

- `GET /health` - Health check
- `POST /create_order` - Create a trade order
- `POST /get_orders` - Get user's orders
- `POST /get_portfolio` - Get user's portfolio
- `POST /get_pnl` - Get user's PnL

## Project Structure

```
TradeFox/
├── public/
│   ├── controllers/      # Request handlers
│   │   ├── health/
│   │   ├── trade/
│   │   ├── portfolio/
│   │   └── pnl/
│   ├── services/         # Business logic
│   │   ├── trade.service.ts
│   │   ├── portfolio.service.ts
│   │   └── pnl.service.ts
│   ├── clients/          # External API clients
│   │   └── pyth.ts
│   ├── pkg/              # Shared packages
│   │   └── db/
│   │       └── db.ts
│   ├── utils/            # Utilities
│   │   └── serializers.ts
│   ├── routes/           # Route definitions
│   │   └── index.ts
│   ├── app.ts            # Express app setup
│   └── server.ts         # Server entry point
├── scripts/
│   ├── migrate.ts        # Database migration
│   └── seed.ts           # Database seeding
├── docker-compose.yml
├── DockerFile
├── tsconfig.json
└── package.json
```

## PnL Calculation

The system uses **FIFO (First In, First Out)** method:

- **Realized PnL**: Calculated when positions are closed (sell orders match against oldest buy orders)
- **Unrealized PnL**: Calculated based on current market prices vs. average entry price

### Example

1. Buy 1 BTC @ $40,000
2. Buy 1 BTC @ $42,000
   - Portfolio: 2 BTC, avg entry = $41,000
3. Sell 1 BTC @ $43,000
   - Realized PnL = +$2,000 (from first BTC bought at $40,000)
   - Portfolio: 1 BTC, avg entry = $41,000
4. If BTC current price = $44,000
   - Unrealized PnL = ($44,000 - $41,000) * 1 = +$3,000

## Testing

After seeding the database, you can test the API using the seeded user IDs. The seed script creates:
- 3 test users
- 3 assets: BTC, ETH, SOL
- USDC as quote asset

## Assumptions

1. **Single User**: The system assumes a single user context (user_id passed in request body)
2. **No Authentication**: No authentication/authorization is implemented
3. **Immediate Execution**: All orders are assumed to be executed immediately (no order book)
4. **FIFO Method**: Realized PnL is calculated using FIFO method
5. **Price Source**: Uses Pyth Network for prices, with fallback to hardcoded values

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with test data

### Environment Variables

Required environment variables (in `.env.local`):
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `PORT` - Server port (default: 3000)

## License

ISC

