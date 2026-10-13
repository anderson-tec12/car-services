import {
  getNextAirFilterDue,
  listAirFilterChanges,
} from '../db/airFilterChanges';
import { getNextBeltDue, listBeltChanges } from '../db/beltChanges';
import {
  BRAKE_PART_KINDS,
  BRAKE_PART_LABELS,
  getNextBrakeDue,
  listBrakeChanges,
} from '../db/brakeChanges';
import { getNextCoolantDue, listCoolantChanges } from '../db/coolantChanges';
import { getNextEngineOilDue, listEngineOilChanges } from '../db/engineOilChanges';
import {
  FRONT_SUSPENSION_PART_KINDS,
  FRONT_SUSPENSION_PART_LABELS,
  getNextFrontSuspensionDue,
  listFrontSuspensionChanges,
} from '../db/frontSuspensionChanges';
import { getNextFuelFilterDue, listFuelFilterChanges } from '../db/fuelFilterChanges';
import { getNextIgnitionCoilDue, listIgnitionCoilChanges } from '../db/ignitionCoilChanges';
import {
  getNextRearSuspensionDue,
  listRearSuspensionChanges,
  REAR_SUSPENSION_PART_KINDS,
  REAR_SUSPENSION_PART_LABELS,
} from '../db/rearSuspensionChanges';
import { getNextSparkPlugDue, listSparkPlugChanges } from '../db/sparkPlugChanges';
import {
  getNextTransmissionOilDue,
  listTransmissionOilChanges,
} from '../db/transmissionOilChanges';
import { listVehicles, type Vehicle } from '../db/vehicles';

export type DueItem = {
  key: string;
  vehicleId: number;
  plate: string;
  label: string;
  nextDueDate: string;
  isOverdueByDate: boolean;
};

type NextDue = {
  nextDueDate: string;
  isOverdueByDate: boolean;
} | null;

function pushDue(
  items: DueItem[],
  vehicle: Vehicle,
  itemKey: string,
  label: string,
  nextDue: NextDue,
) {
  if (!nextDue) {
    return;
  }

  items.push({
    key: `${vehicle.id}:${itemKey}`,
    vehicleId: vehicle.id,
    plate: vehicle.plate,
    label,
    nextDueDate: nextDue.nextDueDate,
    isOverdueByDate: nextDue.isOverdueByDate,
  });
}

async function collectForVehicle(vehicle: Vehicle): Promise<DueItem[]> {
  const items: DueItem[] = [];
  const [
    oilChanges,
    coolantChanges,
    transmissionOilChanges,
    sparkPlugChanges,
    ignitionCoilChanges,
    timingBeltChanges,
    accessoryBeltChanges,
    fuelFilterChanges,
    engineAirFilterChanges,
    cabinAirFilterChanges,
    frontSuspension,
    rearSuspension,
    brakes,
  ] = await Promise.all([
    listEngineOilChanges(vehicle.id),
    listCoolantChanges(vehicle.id),
    listTransmissionOilChanges(vehicle.id),
    listSparkPlugChanges(vehicle.id),
    listIgnitionCoilChanges(vehicle.id),
    listBeltChanges(vehicle.id, 'timing'),
    listBeltChanges(vehicle.id, 'accessory'),
    listFuelFilterChanges(vehicle.id),
    listAirFilterChanges(vehicle.id, 'engine'),
    listAirFilterChanges(vehicle.id, 'cabin'),
    Promise.all(
      FRONT_SUSPENSION_PART_KINDS.map(async (kind) => ({
        kind,
        nextDue: getNextFrontSuspensionDue(
          await listFrontSuspensionChanges(vehicle.id, kind),
        ),
      })),
    ),
    Promise.all(
      REAR_SUSPENSION_PART_KINDS.map(async (kind) => ({
        kind,
        nextDue: getNextRearSuspensionDue(await listRearSuspensionChanges(vehicle.id, kind)),
      })),
    ),
    Promise.all(
      BRAKE_PART_KINDS.map(async (kind) => ({
        kind,
        nextDue: getNextBrakeDue(await listBrakeChanges(vehicle.id, kind)),
      })),
    ),
  ]);

  pushDue(items, vehicle, 'engine-oil', 'Óleo do motor', getNextEngineOilDue(oilChanges));
  pushDue(items, vehicle, 'coolant', 'Arrefecimento', getNextCoolantDue(coolantChanges));
  pushDue(
    items,
    vehicle,
    'transmission-oil',
    'Óleo de câmbio',
    getNextTransmissionOilDue(transmissionOilChanges),
  );
  pushDue(items, vehicle, 'spark-plug', 'Velas', getNextSparkPlugDue(sparkPlugChanges));
  pushDue(items, vehicle, 'ignition-coil', 'Bobinas', getNextIgnitionCoilDue(ignitionCoilChanges));
  pushDue(items, vehicle, 'belt-timing', 'Correia dentada', getNextBeltDue(timingBeltChanges));
  pushDue(
    items,
    vehicle,
    'belt-accessory',
    'Correia de acessórios',
    getNextBeltDue(accessoryBeltChanges),
  );
  pushDue(
    items,
    vehicle,
    'fuel-filter',
    'Filtro de combustível',
    getNextFuelFilterDue(fuelFilterChanges),
  );
  pushDue(
    items,
    vehicle,
    'air-filter-engine',
    'Filtro de ar do motor',
    getNextAirFilterDue(engineAirFilterChanges),
  );
  pushDue(
    items,
    vehicle,
    'air-filter-cabin',
    'Filtro de cabine',
    getNextAirFilterDue(cabinAirFilterChanges),
  );

  for (const entry of frontSuspension) {
    pushDue(
      items,
      vehicle,
      `front-${entry.kind}`,
      `Suspensão dianteira: ${FRONT_SUSPENSION_PART_LABELS[entry.kind]}`,
      entry.nextDue,
    );
  }

  for (const entry of rearSuspension) {
    pushDue(
      items,
      vehicle,
      `rear-${entry.kind}`,
      `Suspensão traseira: ${REAR_SUSPENSION_PART_LABELS[entry.kind]}`,
      entry.nextDue,
    );
  }

  for (const entry of brakes) {
    pushDue(
      items,
      vehicle,
      `brake-${entry.kind}`,
      BRAKE_PART_LABELS[entry.kind],
      entry.nextDue,
    );
  }

  return items;
}

export async function collectDueItems(): Promise<DueItem[]> {
  const vehicles = await listVehicles();
  const groups = await Promise.all(vehicles.map((vehicle) => collectForVehicle(vehicle)));
  return groups.flat();
}
