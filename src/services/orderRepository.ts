import { query } from '../config/db';
import { Order, OrderStatus } from '../models/order';

export async function createOrder(order: Order): Promise<void> {
  await query(
    `INSERT INTO orders
      (id, type, base_token, quote_token, side, amount_in, slippage_bps,
       status, selected_dex, executed_price, tx_hash, failure_reason,
       created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      order.id,
      order.type,
      order.baseToken,
      order.quoteToken,
      order.side,
      order.amountIn,
      order.slippageBps,
      order.status,
      order.selectedDex ?? null,
      order.executedPrice ?? null,
      order.txHash ?? null,
      order.failureReason ?? null,
      order.createdAt,
      order.updatedAt
    ]
  );
}

export async function updateOrder(
  id: string,
  fields: Partial<Pick<Order,
    'status' | 'selectedDex' | 'executedPrice' | 'txHash' | 'failureReason'
  >>
): Promise<void> {
  // Only allow these keys to be written to DB
  const allowedMap: Record<string, string> = {
    status: 'status',
    selectedDex: 'selected_dex',
    executedPrice: 'executed_price',
    txHash: 'tx_hash',
    failureReason: 'failure_reason'
  };

  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(fields)) {
    if (!(key in allowedMap)) {
      // ignore unknown keys (this prevents SQL trying to update non-existent columns)
      continue;
    }
    updates.push(`${allowedMap[key]} = $${idx++}`);
    values.push(value);
  }

  // if nothing to update, just return
  if (updates.length === 0) return;

  updates.push(`updated_at = now()`);
  const sql = `UPDATE orders SET ${updates.join(', ')} WHERE id = $${idx}`;
  values.push(id);

  await query(sql, values);
}

function toDbColumn(key: string): string {
  // kept for compatibility if used elsewhere; map only known keys
  switch (key) {
    case 'status':
      return 'status';
    case 'selectedDex':
      return 'selected_dex';
    case 'executedPrice':
      return 'executed_price';
    case 'txHash':
      return 'tx_hash';
    case 'failureReason':
      return 'failure_reason';
    default:
      return ''; // unknown -> empty
  }
}


export async function getOrderById(id: string): Promise<Order | null> {
  const result = await query<Order & {
    base_token: string;
    quote_token: string;
    amount_in: string;
    slippage_bps: number;
    selected_dex: 'raydium' | 'meteora' | null;
    executed_price: string | null;
    tx_hash: string | null;
    failure_reason: string | null;
  }>(`SELECT * FROM orders WHERE id = $1`, [id]);

  if (result.rows.length === 0) return null;
  const row = result.rows[0] as any; // allow access to snake_case DB columns

  return {
    id: row.id,
    type: row.type as any,
    baseToken: row.base_token,
    quoteToken: row.quote_token,
    side: row.side as any,
    amountIn: Number(row.amount_in),
    slippageBps: row.slippage_bps,
    status: row.status as OrderStatus,
    selectedDex: row.selected_dex ?? undefined,
    executedPrice: row.executed_price ? Number(row.executed_price) : undefined,
    txHash: row.tx_hash ?? undefined,
    failureReason: row.failure_reason,
    createdAt: new Date(row['created_at']),
    updatedAt: new Date(row['updated_at'])
  };
}


