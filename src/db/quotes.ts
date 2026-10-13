import { todayLocalIso } from './engineOilChanges';
import { getDatabase } from './index';

const MAX_PRICE_CENTS = 99_999_999_99;

export type QuoteSummary = {
  id: number;
  vehicleId: number;
  name: string;
  storeName: string;
  quotedOn: string;
  approved: boolean;
  totalCents: number;
  createdAt: string;
};

export type QuoteItem = {
  id: number;
  quoteId: number;
  name: string;
  link: string | null;
  priceCents: number;
  position: number;
};

export type Quote = QuoteSummary & {
  items: QuoteItem[];
};

export type QuoteItemInput = {
  name: string;
  link: string | null;
  priceCents: number;
};

export type SaveQuoteInput = {
  id?: number;
  vehicleId: number;
  name: string;
  storeName: string;
  approved: boolean;
  items: QuoteItemInput[];
};

type QuoteRow = {
  id: number;
  vehicle_id: number;
  name: string;
  store_name: string;
  quoted_on: string;
  approved: number;
  total_cents: number;
  created_at: string;
};

type QuoteItemRow = {
  id: number;
  quote_id: number;
  name: string;
  link: string | null;
  price_cents: number;
  position: number;
};

export function formatPriceCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function centsFromPriceInput(text: string): number {
  const digits = text.replace(/\D/g, '');
  if (digits.length === 0) {
    return 0;
  }
  const value = Number(digits);
  if (!Number.isSafeInteger(value)) {
    return MAX_PRICE_CENTS;
  }
  return Math.min(value, MAX_PRICE_CENTS);
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function mapSummary(row: QuoteRow): QuoteSummary {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    name: row.name,
    storeName: row.store_name,
    quotedOn: row.quoted_on,
    approved: row.approved === 1,
    totalCents: row.total_cents,
    createdAt: row.created_at,
  };
}

function mapItem(row: QuoteItemRow): QuoteItem {
  return {
    id: row.id,
    quoteId: row.quote_id,
    name: row.name,
    link: row.link,
    priceCents: row.price_cents,
    position: row.position,
  };
}

function validateQuoteInput(input: SaveQuoteInput): {
  name: string;
  storeName: string;
  items: QuoteItemInput[];
} {
  const name = input.name.trim();
  const storeName = input.storeName.trim();
  if (name.length === 0) {
    throw new Error('Informe o nome do orçamento.');
  }
  if (storeName.length === 0) {
    throw new Error('Informe a loja.');
  }
  if (input.items.length === 0) {
    throw new Error('Adicione pelo menos um item.');
  }

  const items = input.items.map((item) => {
    const itemName = item.name.trim();
    if (itemName.length === 0) {
      throw new Error('Informe o nome de cada item.');
    }
    if (!Number.isSafeInteger(item.priceCents) || item.priceCents < 0 || item.priceCents > MAX_PRICE_CENTS) {
      throw new Error('Informe um preço válido para cada item.');
    }
    return {
      name: itemName,
      link: normalizeOptionalText(item.link),
      priceCents: item.priceCents,
    };
  });

  return { name, storeName, items };
}

const SUMMARY_SQL = `
  SELECT quotes.id, quotes.vehicle_id, quotes.name, quotes.store_name, quotes.quoted_on,
         quotes.approved, quotes.created_at,
         COALESCE(SUM(quote_items.price_cents), 0) AS total_cents
  FROM quotes
  LEFT JOIN quote_items ON quote_items.quote_id = quotes.id
`;

export async function listQuotes(vehicleId: number): Promise<QuoteSummary[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<QuoteRow>(
    `${SUMMARY_SQL}
     WHERE quotes.vehicle_id = ?
     GROUP BY quotes.id
     ORDER BY quotes.quoted_on DESC, quotes.id DESC`,
    vehicleId,
  );
  return rows.map(mapSummary);
}

export async function listApprovedQuotes(vehicleId: number): Promise<QuoteSummary[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<QuoteRow>(
    `${SUMMARY_SQL}
     WHERE quotes.vehicle_id = ? AND quotes.approved = 1
     GROUP BY quotes.id
     ORDER BY quotes.quoted_on DESC, quotes.id DESC`,
    vehicleId,
  );
  return rows.map(mapSummary);
}

export async function getQuote(id: number, vehicleId: number): Promise<Quote | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<QuoteRow>(
    `${SUMMARY_SQL}
     WHERE quotes.id = ? AND quotes.vehicle_id = ?
     GROUP BY quotes.id`,
    id,
    vehicleId,
  );
  if (!row) {
    return null;
  }

  const items = await db.getAllAsync<QuoteItemRow>(
    `SELECT id, quote_id, name, link, price_cents, position
     FROM quote_items
     WHERE quote_id = ?
     ORDER BY position ASC, id ASC`,
    id,
  );

  return {
    ...mapSummary(row),
    items: items.map(mapItem),
  };
}

export async function saveQuote(input: SaveQuoteInput): Promise<number> {
  const validated = validateQuoteInput(input);
  const db = getDatabase();
  let quoteId = input.id ?? 0;

  await db.withTransactionAsync(async () => {
    let id = input.id;

    if (id == null) {
      const inserted = await db.runAsync(
        `INSERT INTO quotes (vehicle_id, name, store_name, quoted_on, approved)
         VALUES (?, ?, ?, ?, ?)`,
        input.vehicleId,
        validated.name,
        validated.storeName,
        todayLocalIso(),
        input.approved ? 1 : 0,
      );
      id = inserted.lastInsertRowId;
    } else {
      const existing = await db.getFirstAsync<{ id: number; approved: number }>(
        'SELECT id, approved FROM quotes WHERE id = ? AND vehicle_id = ?',
        id,
        input.vehicleId,
      );
      if (!existing) {
        throw new Error('Orçamento não encontrado.');
      }
      if (existing.approved === 1) {
        throw new Error('Orçamento aprovado não pode ser alterado.');
      }

      await db.runAsync(
        `UPDATE quotes
         SET name = ?, store_name = ?, approved = ?
         WHERE id = ? AND vehicle_id = ?`,
        validated.name,
        validated.storeName,
        input.approved ? 1 : 0,
        id,
        input.vehicleId,
      );
      await db.runAsync('DELETE FROM quote_items WHERE quote_id = ?', id);
    }

    if (id == null) {
      throw new Error('Não foi possível salvar o orçamento.');
    }

    for (const [position, item] of validated.items.entries()) {
      await db.runAsync(
        `INSERT INTO quote_items (quote_id, name, link, price_cents, position)
         VALUES (?, ?, ?, ?, ?)`,
        id,
        item.name,
        item.link,
        item.priceCents,
        position,
      );
    }

    quoteId = id;
  });

  return quoteId;
}

export async function deleteQuote(id: number, vehicleId: number): Promise<void> {
  const db = getDatabase();
  const existing = await db.getFirstAsync<{ id: number; approved: number }>(
    'SELECT id, approved FROM quotes WHERE id = ? AND vehicle_id = ?',
    id,
    vehicleId,
  );
  if (!existing) {
    throw new Error('Orçamento não encontrado.');
  }
  if (existing.approved === 1) {
    throw new Error('Orçamento aprovado não pode ser apagado.');
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM quote_items WHERE quote_id = ?', id);
    await db.runAsync('DELETE FROM quotes WHERE id = ? AND vehicle_id = ?', id, vehicleId);
  });
}
