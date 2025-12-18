# TradeFox API Documentation

## Overview

TradeFox is a trading portfolio and PnL tracker service that allows users to record trades, view their portfolio, and calculate profit & loss.

## Base URL

```
http://localhost:3000
https://tradefox-production.up.railway.app (Deployed in railway)
```

## Authentication

No authentication is required. User ID should be passed in the request body for each endpoint.

## Endpoints

### 1. Health Check

Check if the service is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "OK",
  "message": "Service is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 2. Get All Users

Retrieve a list of all users in the system.

**Endpoint:** `GET /users`

**Request:** No request body required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid-string",
        "name": "Test User 1",
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": "uuid-string",
        "name": "Test User 2",
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 2
  }
}
```

**Response Fields:**
- `users`: Array of user objects
  - `id`: UUID of the user
  - `name`: Name of the user
  - `created_at`: Timestamp when user was created
  - `updated_at`: Timestamp when user was last updated
- `total`: Total number of users

**Error Response (500):**
```json
{
  "success": false,
  "error": "Failed to fetch users"
}
```

---

### 3. Create User

Create a new user in the system.

**Endpoint:** `POST /users`

**Request Body:**
```json
{
  "name": "New User Name"
}
```

**Request Parameters:**
- `name` (string, required): Name of the user (1-255 characters)

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "name": "New User Name",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response Fields:**
- `id`: UUID of the newly created user
- `name`: Name of the user
- `created_at`: Timestamp when user was created
- `updated_at`: Timestamp when user was last updated

**Error Response (400):**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "path": ["name"],
      "message": "Name is required"
    }
  ]
}
```

---

### 4. Create Order

Create a new trade order (assumed to be executed immediately).

**Endpoint:** `POST /create_order`

**Request Body:**
```json
{
  "user_id": "uuid-string",
  "base_symbol": "BTC",
  "quote_symbol": "USDC",
  "price": 90000,
  "base_quantity": 1,
  "side": "buy"
}
```

**Request Parameters:**
- `user_id` (string, required): UUID of the user
- `base_symbol` (string, required): Symbol of the base asset (e.g., "BTC", "ETH", "SOL")
- `quote_symbol` (string, required): Symbol of the quote asset (e.g., "USDC")
- `price` (number, required): Price per unit of base asset (must be positive)
- `base_quantity` (number, required): Quantity of base asset (must be positive)
- `side` (string, required): Either "buy" or "sell"

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "user_id": "uuid-string",
    "base_symbol": "BTC",
    "quote_symbol": "USDC",
    "price": 90000,
    "base_quantity": 1,
    "quote_quantity": 90000,
    "side": "buy",
    "status": "EXECUTED",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "path": ["price"],
      "message": "Price must be positive"
    }
  ]
}
```

---

### 5. Get Orders

Retrieve all orders for a specific user.

**Endpoint:** `POST /get_orders`

**Request Body:**
```json
{
  "user_id": "uuid-string"
}
```

**Request Parameters:**
- `user_id` (string, required): UUID of the user

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid-string",
    "orders": [
      {
        "id": "uuid-string",
        "user_id": "uuid-string",
        "base_symbol": "BTC",
        "quote_symbol": "USDC",
        "price": 90000,
        "base_quantity": 1,
        "quote_quantity": 90000,
        "side": "buy",
        "status": "EXECUTED",
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "path": ["user_id"],
      "message": "Invalid user ID format"
    }
  ]
}
```

---

### 6. Get Portfolio

Get current portfolio holdings for a user.

**Endpoint:** `POST /get_portfolio`

**Request Body:**
```json
{
  "user_id": "uuid-string"
}
```

**Request Parameters:**
- `user_id` (string, required): UUID of the user

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid-string",
    "holdings": [
      {
        "asset_symbol": "BTC",
        "quantity": 2,
        "avg_buying_price": 91000,
        "current_price": 90000,
        "unrealized_pnl": -2000
      }
    ]
  }
}
```

**Response Fields:**
- `asset_symbol`: Symbol of the asset
- `quantity`: Current quantity held
- `avg_buying_price`: Average entry price (calculated using weighted average)
- `current_price`: Current market price (from Pyth Network)
- `unrealized_pnl`: Unrealized profit/loss for this holding

**Error Response (400):**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [...]
}
```

---

### 7. Get PnL

Get profit and loss information for a user.

**Endpoint:** `POST /get_pnl`

**Request Body:**
```json
{
  "user_id": "uuid-string"
}
```

**Request Parameters:**
- `user_id` (string, required): UUID of the user

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid-string",
    "realized_pnl": 2000,
    "unrealized_pnl": 3000,
    "total_pnl": 5000
  }
}
```

**Response Fields:**
- `realized_pnl`: Profit/loss from closed positions (calculated using FIFO method)
- `unrealized_pnl`: Profit/loss from current holdings based on current market prices
- `total_pnl`: Sum of realized and unrealized PnL

**Error Response (400):**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [...]
}
```

---

## PnL Calculation Method

The system uses **FIFO (First In, First Out)** method for calculating realized PnL:
- When a sell order is executed, it matches against the oldest buy orders first
- Realized PnL is calculated as: `(sell_price - buy_price) * quantity`
- Unrealized PnL is calculated as: `(current_price - avg_buying_price) * quantity`

## Portfolio Management

- Portfolio positions are automatically updated when orders are created
- Average buying price is calculated using weighted average method
- When selling, the average price of remaining holdings stays the same (FIFO)

## Supported Assets

Currently supported base assets:
- BTC (Bitcoin)
- ETH (Ethereum)
- SOL (Solana)

Quote asset:
- USDC (USD Coin)

## Price Data

Current prices are fetched from Pyth Network's Hermes client. If Pyth is unavailable, fallback prices are used:
- BTC: $90,000
- ETH: $3,000
- SOL: $120

## Example Workflow

1. **Create a buy order:**
   ```bash
   POST /create_order
   {
     "user_id": "user-uuid",
     "base_symbol": "BTC",
     "quote_symbol": "USDC",
     "price": 90000,
     "base_quantity": 1,
     "side": "buy"
   }
   ```

2. **Create another buy order:**
   ```bash
   POST /create_order
   {
     "user_id": "user-uuid",
     "base_symbol": "BTC",
     "quote_symbol": "USDC",
     "price": 92000,
     "base_quantity": 1,
     "side": "buy"
   }
   ```

3. **Check portfolio:**
   ```bash
   POST /get_portfolio
   {
     "user_id": "user-uuid"
   }
   ```
   Response shows: 2 BTC, avg entry = 91,000

4. **Create a sell order:**
   ```bash
   POST /create_order
   {
     "user_id": "user-uuid",
     "base_symbol": "BTC",
     "quote_symbol": "USDC",
     "price": 93000,
     "base_quantity": 1,
     "side": "sell"
   }
   ```

5. **Check PnL:**
   ```bash
   POST /get_pnl
   {
     "user_id": "user-uuid"
   }
   ```
   - Realized PnL = +3,000 (from selling 1 BTC bought at 90,000: 93,000 - 90,000)
   - Portfolio: 1 BTC, avg entry = 92,000 (remaining position after FIFO)
   - Unrealized PnL = (current_price - 92,000) * 1

## Error Handling

All endpoints return consistent error responses:
- **400 Bad Request**: Validation errors or business logic errors
- **500 Internal Server Error**: Server-side errors

Error response format:
```json
{
  "success": false,
  "error": "Error message",
  "details": [] // Optional, for validation errors
}
```

