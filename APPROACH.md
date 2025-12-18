# Approach & Assumptions

## Design Decisions

### 1. Architecture
- **Layered Architecture**: Following the existing project structure with clear separation:
  - Controllers: Handle HTTP requests/responses and validation
  - Services: Business logic and data processing
  - Clients: External API integrations (Pyth Network)
  - Database: PostgreSQL with pg client

### 2. PnL Calculation Method
- **FIFO (First In, First Out)**: Chosen for realized PnL calculation
  - When a sell order is executed, it matches against the oldest buy orders first
  - This provides a clear audit trail and is commonly used in trading systems
  - Average cost method is used for portfolio holdings (weighted average)

### 3. Portfolio Management
- **Automatic Updates**: Portfolio is automatically updated when orders are created
- **Average Price Calculation**: Uses weighted average when buying
- **Position Removal**: Positions are removed from portfolio when quantity reaches zero

### 4. Price Data
- **Pyth Network Integration**: Uses Pyth Network's Hermes API for real-time price data
- **Fallback Mechanism**: Falls back to hardcoded prices if Pyth is unavailable:
  - BTC: $40,000
  - ETH: $2,000
  - SOL: $100
- **Caching**: Prices are cached for 1 minute to reduce API calls

### 5. Request/Response Validation
- **Zod Schemas**: All requests are validated using Zod schemas
- **Type Safety**: TypeScript ensures type safety throughout the application
- **Error Handling**: Consistent error response format with validation details

## Assumptions

1. **Single User Context**: User ID is passed in request body (no authentication)
2. **Immediate Execution**: All orders are assumed to be executed immediately (no order book)
3. **USDC as Quote Asset**: All trades use USDC as the quote asset
4. **No Partial Fills**: Orders are fully executed or rejected
5. **Database in Memory**: As per PRD, can use in-memory storage, but we've implemented PostgreSQL for better data persistence
6. **Price Precision**: Prices and quantities use DECIMAL(20, 8) for precision

## Database Design

### Tables
1. **Users**: Store user information
2. **Assets**: Store asset information (BTC, ETH, SOL, USDC)
3. **Trades**: Store all executed trades
4. **Portfolio**: Store current holdings with average buying price

### Relationships
- Trades reference Users and Assets (base and quote)
- Portfolio references Users and Assets
- Foreign key constraints ensure data integrity

## API Design

### Endpoints
- `POST /create_order`: Create and execute a trade
- `POST /get_orders`: Get all orders for a user
- `POST /get_portfolio`: Get current portfolio holdings
- `POST /get_pnl`: Get realized and unrealized PnL

### Why POST for all endpoints?
- User ID is passed in the request body (not URL parameter)
- Consistent API design
- Easier to extend with additional filters in the future

## Error Handling

- **Validation Errors**: Return 400 with detailed error messages
- **Business Logic Errors**: Return 400 with descriptive messages
- **Server Errors**: Return 500 with generic error message (detailed errors logged server-side)

## Testing Strategy

- **Unit Tests**: Can be added for services (portfolio calculation, PnL calculation)
- **Integration Tests**: Can be added for API endpoints
- **Seed Data**: Script provided to populate database with test users and assets

## Future Enhancements

1. **Authentication**: Add JWT-based authentication
2. **Order Book**: Implement order matching engine
3. **Multiple Users**: Add proper user management
4. **Historical Data**: Add endpoints for historical portfolio/PnL
5. **WebSocket**: Real-time price updates
6. **Rate Limiting**: Add rate limiting for API endpoints
7. **Logging**: Add structured logging
8. **Metrics**: Add monitoring and metrics

## Trade-offs

1. **FIFO vs Average Cost**: Chose FIFO for realized PnL as it's more transparent and commonly used
2. **PostgreSQL vs In-Memory**: Chose PostgreSQL for data persistence, even though PRD allows in-memory
3. **TypeScript vs JavaScript**: Chose TypeScript for better type safety and maintainability
4. **Synchronous vs Asynchronous**: All operations are synchronous for simplicity

