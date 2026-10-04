import { getDatabase } from './index';

export type Vehicle = {
  id: number;
  brand: string;
  model: string;
  plate: string;
  isActive: boolean;
  createdAt: string;
};

type VehicleRow = {
  id: number;
  brand: string;
  model: string;
  plate: string;
  is_active: number;
  created_at: string;
};

function mapRow(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    plate: row.plate,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

export function normalizePlate(plate: string): string {
  return plate.replace(/\s+/g, '').toUpperCase();
}

export async function listVehicles(): Promise<Vehicle[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<VehicleRow>(
    'SELECT id, brand, model, plate, is_active, created_at FROM vehicles ORDER BY created_at ASC',
  );
  return rows.map(mapRow);
}

export async function getActiveVehicle(): Promise<Vehicle | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<VehicleRow>(
    'SELECT id, brand, model, plate, is_active, created_at FROM vehicles WHERE is_active = 1 LIMIT 1',
  );
  return row ? mapRow(row) : null;
}

export async function createVehicle(input: {
  brand: string;
  model: string;
  plate: string;
}): Promise<Vehicle> {
  const db = getDatabase();
  const brand = input.brand.trim();
  const model = input.model.trim();
  const plate = normalizePlate(input.plate);

  if (!brand || !model || !plate) {
    throw new Error('Marca, modelo e placa são obrigatórios.');
  }

  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM vehicles WHERE plate = ? LIMIT 1',
    plate,
  );
  if (existing) {
    throw new Error('Já existe um veículo com esta placa.');
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE vehicles SET is_active = 0 WHERE is_active = 1');
    await db.runAsync(
      'INSERT INTO vehicles (brand, model, plate, is_active) VALUES (?, ?, ?, 1)',
      brand,
      model,
      plate,
    );
  });

  const created = await getActiveVehicle();
  if (!created) {
    throw new Error('Não foi possível criar o veículo.');
  }

  return created;
}

export async function setActiveVehicle(id: number): Promise<Vehicle> {
  const db = getDatabase();

  const target = await db.getFirstAsync<VehicleRow>(
    'SELECT id, brand, model, plate, is_active, created_at FROM vehicles WHERE id = ? LIMIT 1',
    id,
  );
  if (!target) {
    throw new Error('Veículo não encontrado.');
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE vehicles SET is_active = 0 WHERE is_active = 1');
    await db.runAsync('UPDATE vehicles SET is_active = 1 WHERE id = ?', id);
  });

  return mapRow({ ...target, is_active: 1 });
}
