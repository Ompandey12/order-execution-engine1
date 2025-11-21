export type OrderStatus =
  | 'pending'
  | 'routing'
  | 'building'
  | 'submitted'
  | 'confirmed'
  | 'failed';

export type OrderType = 'market';

export interface Order {
  id: string;
  type: OrderType;
  baseToken: string;
  quoteToken: string;
  side: 'buy' | 'sell';
  amountIn: number;
  slippageBps: number;
  status: OrderStatus;
  selectedDex?: 'raydium' | 'meteora';
  executedPrice?: number;
  txHash?: string;
  failureReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
