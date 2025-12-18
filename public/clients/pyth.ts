// Pyth Network API response types
interface PythPriceData {
  price?: {
    price?: string;
    expo?: number;
    conf?: string;
    publish_time?: number;
  };
  ema_price?: {
    price?: string;
    expo?: number;
    conf?: string;
    publish_time?: number;
  };
  id?: string;
  metadata?: {
    prev_publish_time?: number;
    proof_available_time?: number;
    slot?: number;
  };
}

interface PythResponse {
  parsed?: PythPriceData[];
  binary?: {
    data?: string[];
    encoding?: string;
  };
}

// Pyth Network price feed IDs for the assets
// These are the actual price feed IDs from Pyth Network
const PRICE_FEED_IDS: { [key: string]: string } = {
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', // BTC/USD
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', // ETH/USD
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d', // SOL/USD
};

// Fallback prices (used if Pyth is unavailable or for development)
const FALLBACK_PRICES: { [key: string]: number } = {
  BTC: 90000,
  ETH: 3000,
  SOL: 120,
};

// Pyth Network API endpoint
const PYTH_API_URL = 'https://hermes.pyth.network/v2/updates/price/latest';

export class PythClient {
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private cacheTTL = 60000; // 1 minute cache

  async getPrice(symbol: string): Promise<number> {
    // Check cache first
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.price;
    }

    try {
      const priceFeedId = PRICE_FEED_IDS[symbol];
      if (!priceFeedId) {
        console.warn(`No price feed ID for ${symbol}, using fallback`);
        return FALLBACK_PRICES[symbol] || 0;
      }

      // Fetch price from Pyth Network API
      const response = await fetch(`${PYTH_API_URL}?ids[]=${priceFeedId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Pyth API returned ${response.status}`);
      }

      const data = (await response.json()) as PythResponse;
      
      // Parse the price from Pyth response
      // The response structure may vary, so we handle it gracefully
      if (data.parsed && data.parsed[0] && data.parsed[0].price && data.parsed[0].price.price) {
        const priceData = data.parsed[0].price;
        const priceString = priceData.price;
        const expo = priceData.expo ?? 0; // Default to 0 if expo is not provided
        
        // Calculate actual price: price * 10^expo
        // priceString is guaranteed to be defined due to the if condition above
        const priceValue = parseFloat(priceString!);
        const actualPrice = priceValue * Math.pow(10, expo);
        
        // Cache the price
        this.priceCache.set(symbol, {
          price: actualPrice,
          timestamp: Date.now(),
        });
        
        return actualPrice;
      } else {
        console.warn(`No price data in response for ${symbol}, using fallback`);
        return FALLBACK_PRICES[symbol] || 0;
      }
    } catch (error) {
      console.error(`Error fetching price for ${symbol} from Pyth:`, error);
      // Return fallback price on error (as per PRD requirement)
      return FALLBACK_PRICES[symbol] || 0;
    }
  }

  async getPrices(symbols: string[]): Promise<{ [key: string]: number }> {
    const prices: { [key: string]: number } = {};
    
    await Promise.all(
      symbols.map(async (symbol) => {
        prices[symbol] = await this.getPrice(symbol);
      })
    );
    
    return prices;
  }
}

export const pythClient = new PythClient();

