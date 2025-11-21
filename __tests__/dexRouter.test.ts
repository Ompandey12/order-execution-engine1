import { MockDexRouter } from '../src/services/dexRouter';

describe('MockDexRouter', () => {
  it('should choose higher price for sell side', () => {
    const router = new MockDexRouter(100);
    const raydium = { dex: 'raydium' as const, price: 105, fee: 0.003 };
    const meteora = { dex: 'meteora' as const, price: 101, fee: 0.002 };

    const best = router.chooseBestQuote('sell', raydium, meteora);
    expect(best.dex).toBe('raydium');
  });

  it('should choose lower price for buy side', () => {
    const router = new MockDexRouter(100);
    const raydium = { dex: 'raydium' as const, price: 98, fee: 0.003 };
    const meteora = { dex: 'meteora' as const, price: 101, fee: 0.002 };

    const best = router.chooseBestQuote('buy', raydium, meteora);
    expect(best.dex).toBe('raydium');
  });
});
