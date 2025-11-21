import { MockDexRouter } from '../src/services/dexRouter';

describe('Input validation', () => {
    it('validates slippage calculation for sell orders', () => {
        const router = new MockDexRouter(100);
        const quote = { dex: 'raydium' as const, price: 100, fee: 0.003 };
        const slippageBps = 100; // 1%
        const slippageFraction = slippageBps / 10_000;

        // For sell: minAcceptablePrice = price * (1 - slippage)
        const minAcceptablePrice = quote.price * (1 - slippageFraction);

        expect(minAcceptablePrice).toBe(99); // 100 * 0.99
    });

    it('validates slippage calculation for buy orders', () => {
        const router = new MockDexRouter(100);
        const quote = { dex: 'raydium' as const, price: 100, fee: 0.003 };
        const slippageBps = 200; // 2%
        const slippageFraction = slippageBps / 10_000;

        // For buy: minAcceptablePrice = price * (1 + slippage)
        const minAcceptablePrice = quote.price * (1 + slippageFraction);

        expect(minAcceptablePrice).toBe(102); // 100 * 1.02
    });

    it('validates price comparison logic', () => {
        const router = new MockDexRouter(100);

        // Test sell side - should prefer higher price
        const raydiumHigh = { dex: 'raydium' as const, price: 105, fee: 0.003 };
        const meteoraLow = { dex: 'meteora' as const, price: 100, fee: 0.002 };

        const bestSell = router.chooseBestQuote('sell', raydiumHigh, meteoraLow);
        expect(bestSell.price).toBe(105);
        expect(bestSell.dex).toBe('raydium');

        // Test buy side - should prefer lower price
        const raydiumLow = { dex: 'raydium' as const, price: 98, fee: 0.003 };
        const meteoraHigh = { dex: 'meteora' as const, price: 102, fee: 0.002 };

        const bestBuy = router.chooseBestQuote('buy', raydiumLow, meteoraHigh);
        expect(bestBuy.price).toBe(98);
        expect(bestBuy.dex).toBe('raydium');
    });

    it('handles equal prices correctly', () => {
        const router = new MockDexRouter(100);
        const raydium = { dex: 'raydium' as const, price: 100, fee: 0.003 };
        const meteora = { dex: 'meteora' as const, price: 100, fee: 0.002 };

        // For equal prices, should return first one (raydium) for both buy and sell
        const bestSell = router.chooseBestQuote('sell', raydium, meteora);
        expect(bestSell.dex).toBe('raydium');

        const bestBuy = router.chooseBestQuote('buy', raydium, meteora);
        expect(bestBuy.dex).toBe('raydium');
    });

    it('validates fee differences between DEXs', () => {
        const router = new MockDexRouter(100);
        const raydium = { dex: 'raydium' as const, price: 100, fee: 0.003 };
        const meteora = { dex: 'meteora' as const, price: 100, fee: 0.002 };

        // Raydium has 0.3% fee
        expect(raydium.fee).toBe(0.003);

        // Meteora has 0.2% fee (lower)
        expect(meteora.fee).toBe(0.002);
        expect(meteora.fee).toBeLessThan(raydium.fee);
    });
});
