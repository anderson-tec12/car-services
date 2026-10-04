import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  createVehicle as createVehicleRecord,
  getActiveVehicle,
  listVehicles,
  setActiveVehicle as setActiveVehicleRecord,
  type Vehicle,
} from '../db/vehicles';

type VehicleContextValue = {
  vehicles: Vehicle[];
  activeVehicle: Vehicle | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  createVehicle: (input: {
    brand: string;
    model: string;
    plate: string;
  }) => Promise<Vehicle>;
  setActiveVehicle: (id: number) => Promise<void>;
};

const VehicleContext = createContext<VehicleContextValue | null>(null);

async function loadVehiclesSnapshot() {
  const [vehicles, activeVehicle] = await Promise.all([
    listVehicles(),
    getActiveVehicle(),
  ]);
  return { vehicles, activeVehicle };
}

export function VehicleProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicle, setActiveVehicleState] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const snapshot = await loadVehiclesSnapshot();
    setVehicles(snapshot.vehicles);
    setActiveVehicleState(snapshot.activeVehicle);
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Initial SQLite read after the database is already open in the root layout.
    void loadVehiclesSnapshot()
      .then((snapshot) => {
        if (!isMounted) {
          return;
        }
        setVehicles(snapshot.vehicles);
        setActiveVehicleState(snapshot.activeVehicle);
      })
      .catch((error) => {
        console.error('Failed to load vehicles', error);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const createVehicle = useCallback(
    async (input: { brand: string; model: string; plate: string }) => {
      const created = await createVehicleRecord(input);
      await refresh();
      return created;
    },
    [refresh],
  );

  const setActiveVehicle = useCallback(
    async (id: number) => {
      await setActiveVehicleRecord(id);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      vehicles,
      activeVehicle,
      isLoading,
      refresh,
      createVehicle,
      setActiveVehicle,
    }),
    [vehicles, activeVehicle, isLoading, refresh, createVehicle, setActiveVehicle],
  );

  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>;
}

export function useVehicles(): VehicleContextValue {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error('useVehicles must be used within a VehicleProvider');
  }
  return context;
}
