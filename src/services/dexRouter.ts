import { sleep } from '../utils/sleep';
import { logger } from '../utils/logger';

export interface DexQuote {
  dex: 'raydium' | 'meteora';
  price: number; // price in quoteToken per 1 baseToken
  fee: number;   // trading fee as fraction (e.g. 0.003)
}

export interface DexExecutionResult {
  dex: 'raydium' | 'meteora';
  txHash: string;
  executedPrice: number;
}

export class MockDexRouter {
  private basePrice: number;

  constructor(basePrice = 100) {
    this.basePrice = basePrice;
  }

  async getRaydiumQuote(baseToken: string, quoteToken: string, amount: number): Promise<DexQuote> {
    await sleep(200 + Math.random() * 200);
    const price = this.basePrice * (0.98 + Math.random() * 0.04); // 2-6% band
    return { dex: 'raydium', price, fee: 0.003 };
  }

  async getMeteoraQuote(baseToken: string, quoteToken: string, amount: number): Promise<DexQuote> {
    await sleep(200 + Math.random() * 200);
    const price = this.basePrice * (0.97 + Math.random() * 0.05); // 3-8% band
    return { dex: 'meteora', price, fee: 0.002 };
  }

  /**
   * For a market SELL of baseToken, we want the highest price.
   * For a market BUY of baseToken, we want the lowest price.
   */
  chooseBestQuote(
    side: 'buy' | 'sell',
    raydium: DexQuote,
    meteora: DexQuote
  ): DexQuote {
    logger.debug('Comparing DEX quotes', { side, raydium, meteora });
    if (side === 'sell') {
      return raydium.price >= meteora.price ? raydium : meteora;
    } else {
      return raydium.price <= meteora.price ? raydium : meteora;
    }
  }

  async executeSwap(
    dex: 'raydium' | 'meteora',
    executedPrice: number
  ): Promise<DexExecutionResult> {
    // DEMO: 10-12 second execution gives time to connect WebSocket and watch updates
    await sleep(10000 + Math.random() * 2000); // 10-12s
    const txHash = `mock-tx-${dex}-${Math.random().toString(36).slice(2, 10)}`;
    logger.info('Executed mock swap', { dex, txHash, executedPrice });
    return { dex, txHash, executedPrice };
  }

}
