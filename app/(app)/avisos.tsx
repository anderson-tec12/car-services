import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getNextAirFilterDue,
  listAirFilterChanges,
  type AirFilterNextDue,
} from '../../src/db/airFilterChanges';
import {
  getNextBeltDue,
  listBeltChanges,
  type BeltNextDue,
} from '../../src/db/beltChanges';
import {
  BRAKE_PART_KINDS,
  BRAKE_PART_LABELS,
  getNextBrakeDue,
  listBrakeChanges,
  type BrakeNextDue,
  type BrakePartKind,
} from '../../src/db/brakeChanges';
import {
  getNextCoolantDue,
  listCoolantChanges,
  type CoolantNextDue,
} from '../../src/db/coolantChanges';
import {
  formatDisplayDate,
  formatKm,
  getNextEngineOilDue,
  listEngineOilChanges,
  type EngineOilNextDue,
} from '../../src/db/engineOilChanges';
import {
  FRONT_SUSPENSION_PART_KINDS,
  FRONT_SUSPENSION_PART_LABELS,
  getNextFrontSuspensionDue,
  listFrontSuspensionChanges,
  type FrontSuspensionNextDue,
  type FrontSuspensionPartKind,
} from '../../src/db/frontSuspensionChanges';
import {
  getNextFuelFilterDue,
  listFuelFilterChanges,
  type FuelFilterNextDue,
} from '../../src/db/fuelFilterChanges';
import {
  getNextIgnitionCoilDue,
  listIgnitionCoilChanges,
  type IgnitionCoilNextDue,
} from '../../src/db/ignitionCoilChanges';
import {
  getNextRearSuspensionDue,
  listRearSuspensionChanges,
  REAR_SUSPENSION_PART_KINDS,
  REAR_SUSPENSION_PART_LABELS,
  type RearSuspensionNextDue,
  type RearSuspensionPartKind,
} from '../../src/db/rearSuspensionChanges';
import {
  getNextSparkPlugDue,
  listSparkPlugChanges,
  type SparkPlugNextDue,
} from '../../src/db/sparkPlugChanges';
import {
  getNextTransmissionOilDue,
  listTransmissionOilChanges,
  type TransmissionOilNextDue,
} from '../../src/db/transmissionOilChanges';
import styled from '../../src/theme/styled';
import { theme } from '../../src/theme/theme';
import { useVehicles } from '../../src/vehicles/VehicleContext';

const Screen = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const Content = styled.ScrollView`
  flex: 1;
`;

const Title = styled.Text`
  color: ${theme.colors.primary};
  font-size: 24px;
  font-weight: 700;
  margin-bottom: ${theme.spacing.md}px;
`;

const GroupTitle = styled.Text`
  color: ${theme.colors.primary};
  font-size: 18px;
  font-weight: 700;
  margin-top: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const Card = styled.View`
  background-color: ${theme.colors.surface};
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: #2a2a2a;
  padding: ${theme.spacing.lg}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const CardTitle = styled.Text`
  color: ${theme.colors.text};
  font-size: 18px;
  font-weight: 700;
  margin-bottom: ${theme.spacing.sm}px;
`;

const CardBody = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 16px;
  line-height: 24px;
`;

const StatusText = styled.Text<{ overdue?: boolean }>`
  color: ${(props) => (props.overdue ? '#FF6B6B' : theme.colors.primary)};
  font-size: 14px;
  font-weight: 700;
  margin-top: ${theme.spacing.md}px;
`;

type AlertNextDue =
  | EngineOilNextDue
  | CoolantNextDue
  | TransmissionOilNextDue
  | SparkPlugNextDue
  | IgnitionCoilNextDue
  | BeltNextDue
  | FuelFilterNextDue
  | AirFilterNextDue
  | FrontSuspensionNextDue
  | RearSuspensionNextDue
  | BrakeNextDue;

type AlertCardProps = {
  title: string;
  emptyMessage: string;
  isLoading: boolean;
  nextDue: AlertNextDue | null;
};

function AlertCard({ title, emptyMessage, isLoading, nextDue }: AlertCardProps) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {isLoading ? (
        <CardBody>Carregando...</CardBody>
      ) : nextDue ? (
        <>
          <CardBody>
            Última troca em {formatDisplayDate(nextDue.lastChange.changedOn)} (
            {formatKm(nextDue.lastChange.odometerKm)}).
          </CardBody>
          <CardBody style={{ marginTop: theme.spacing.sm }}>
            Próxima troca: até {formatDisplayDate(nextDue.nextDueDate)} ou aos{' '}
            {formatKm(nextDue.nextDueKm)}, o que ocorrer primeiro.
          </CardBody>
          <StatusText overdue={nextDue.isOverdueByDate}>
            {nextDue.isOverdueByDate
              ? 'Troca vencida pela data'
              : 'Dentro do prazo pela data'}
          </StatusText>
        </>
      ) : (
        <CardBody>{emptyMessage}</CardBody>
      )}
    </Card>
  );
}

function emptyPartMessage(label: string): string {
  return `Ainda não há prazo de ${label.toLowerCase()}. Registre a primeira troca.`;
}

export default function AvisosScreen() {
  const insets = useSafeAreaInsets();
  const { activeVehicle } = useVehicles();
  const [oilNextDue, setOilNextDue] = useState<EngineOilNextDue | null>(null);
  const [coolantNextDue, setCoolantNextDue] = useState<CoolantNextDue | null>(null);
  const [transmissionOilNextDue, setTransmissionOilNextDue] =
    useState<TransmissionOilNextDue | null>(null);
  const [sparkPlugNextDue, setSparkPlugNextDue] = useState<SparkPlugNextDue | null>(null);
  const [ignitionCoilNextDue, setIgnitionCoilNextDue] =
    useState<IgnitionCoilNextDue | null>(null);
  const [timingBeltNextDue, setTimingBeltNextDue] = useState<BeltNextDue | null>(null);
  const [accessoryBeltNextDue, setAccessoryBeltNextDue] = useState<BeltNextDue | null>(null);
  const [fuelFilterNextDue, setFuelFilterNextDue] = useState<FuelFilterNextDue | null>(null);
  const [engineAirFilterNextDue, setEngineAirFilterNextDue] =
    useState<AirFilterNextDue | null>(null);
  const [cabinAirFilterNextDue, setCabinAirFilterNextDue] =
    useState<AirFilterNextDue | null>(null);
  const [frontSuspensionNextDue, setFrontSuspensionNextDue] = useState<
    Partial<Record<FrontSuspensionPartKind, FrontSuspensionNextDue | null>>
  >({});
  const [rearSuspensionNextDue, setRearSuspensionNextDue] = useState<
    Partial<Record<RearSuspensionPartKind, RearSuspensionNextDue | null>>
  >({});
  const [brakeNextDue, setBrakeNextDue] = useState<
    Partial<Record<BrakePartKind, BrakeNextDue | null>>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    if (!activeVehicle) {
      setOilNextDue(null);
      setCoolantNextDue(null);
      setTransmissionOilNextDue(null);
      setSparkPlugNextDue(null);
      setIgnitionCoilNextDue(null);
      setTimingBeltNextDue(null);
      setAccessoryBeltNextDue(null);
      setFuelFilterNextDue(null);
      setEngineAirFilterNextDue(null);
      setCabinAirFilterNextDue(null);
      setFrontSuspensionNextDue({});
      setRearSuspensionNextDue({});
      setBrakeNextDue({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
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
        frontSuspensionChanges,
        rearSuspensionChanges,
        brakeChanges,
      ] = await Promise.all([
        listEngineOilChanges(activeVehicle.id),
        listCoolantChanges(activeVehicle.id),
        listTransmissionOilChanges(activeVehicle.id),
        listSparkPlugChanges(activeVehicle.id),
        listIgnitionCoilChanges(activeVehicle.id),
        listBeltChanges(activeVehicle.id, 'timing'),
        listBeltChanges(activeVehicle.id, 'accessory'),
        listFuelFilterChanges(activeVehicle.id),
        listAirFilterChanges(activeVehicle.id, 'engine'),
        listAirFilterChanges(activeVehicle.id, 'cabin'),
        Promise.all(
          FRONT_SUSPENSION_PART_KINDS.map((kind) =>
            listFrontSuspensionChanges(activeVehicle.id, kind).then((changes) => ({
              kind,
              nextDue: getNextFrontSuspensionDue(changes),
            })),
          ),
        ),
        Promise.all(
          REAR_SUSPENSION_PART_KINDS.map((kind) =>
            listRearSuspensionChanges(activeVehicle.id, kind).then((changes) => ({
              kind,
              nextDue: getNextRearSuspensionDue(changes),
            })),
          ),
        ),
        Promise.all(
          BRAKE_PART_KINDS.map((kind) =>
            listBrakeChanges(activeVehicle.id, kind).then((changes) => ({
              kind,
              nextDue: getNextBrakeDue(changes),
            })),
          ),
        ),
      ]);
      setOilNextDue(getNextEngineOilDue(oilChanges));
      setCoolantNextDue(getNextCoolantDue(coolantChanges));
      setTransmissionOilNextDue(getNextTransmissionOilDue(transmissionOilChanges));
      setSparkPlugNextDue(getNextSparkPlugDue(sparkPlugChanges));
      setIgnitionCoilNextDue(getNextIgnitionCoilDue(ignitionCoilChanges));
      setTimingBeltNextDue(getNextBeltDue(timingBeltChanges));
      setAccessoryBeltNextDue(getNextBeltDue(accessoryBeltChanges));
      setFuelFilterNextDue(getNextFuelFilterDue(fuelFilterChanges));
      setEngineAirFilterNextDue(getNextAirFilterDue(engineAirFilterChanges));
      setCabinAirFilterNextDue(getNextAirFilterDue(cabinAirFilterChanges));
      setFrontSuspensionNextDue(
        Object.fromEntries(
          frontSuspensionChanges.map(({ kind, nextDue }) => [kind, nextDue]),
        ) as Partial<Record<FrontSuspensionPartKind, FrontSuspensionNextDue | null>>,
      );
      setRearSuspensionNextDue(
        Object.fromEntries(
          rearSuspensionChanges.map(({ kind, nextDue }) => [kind, nextDue]),
        ) as Partial<Record<RearSuspensionPartKind, RearSuspensionNextDue | null>>,
      );
      setBrakeNextDue(
        Object.fromEntries(
          brakeChanges.map(({ kind, nextDue }) => [kind, nextDue]),
        ) as Partial<Record<BrakePartKind, BrakeNextDue | null>>,
      );
    } catch (error) {
      console.error('Failed to load alerts', error);
      Alert.alert('Atenção', 'Não foi possível carregar os avisos.');
    } finally {
      setIsLoading(false);
    }
  }, [activeVehicle]);

  useFocusEffect(
    useCallback(() => {
      void loadAlerts();
    }, [loadAlerts]),
  );

  return (
    <Screen>
      <Content
        contentContainerStyle={{
          padding: theme.spacing.xl,
          paddingBottom: theme.spacing.xl + insets.bottom,
        }}
      >
        <Title>Avisos</Title>

        <AlertCard
          title="Óleo do motor"
          emptyMessage="Ainda não há prazo de óleo do motor. Registre a primeira troca."
          isLoading={isLoading}
          nextDue={oilNextDue}
        />
        <AlertCard
          title="Arrefecimento"
          emptyMessage="Ainda não há prazo de arrefecimento. Registre a primeira troca."
          isLoading={isLoading}
          nextDue={coolantNextDue}
        />
        <AlertCard
          title="Óleo de câmbio"
          emptyMessage="Ainda não há prazo de óleo de câmbio. Registre a primeira troca."
          isLoading={isLoading}
          nextDue={transmissionOilNextDue}
        />
        <AlertCard
          title="Velas"
          emptyMessage="Ainda não há prazo de velas. Registre a primeira troca."
          isLoading={isLoading}
          nextDue={sparkPlugNextDue}
        />
        <AlertCard
          title="Bobinas"
          emptyMessage="Ainda não há prazo de bobinas. Registre a primeira troca."
          isLoading={isLoading}
          nextDue={ignitionCoilNextDue}
        />
        <AlertCard
          title="Correia dentada"
          emptyMessage="Ainda não há prazo de correia dentada. Registre a primeira troca."
          isLoading={isLoading}
          nextDue={timingBeltNextDue}
        />
        <AlertCard
          title="Correia de acessórios"
          emptyMessage="Ainda não há prazo de correia de acessórios. Registre a primeira troca."
          isLoading={isLoading}
          nextDue={accessoryBeltNextDue}
        />
        <AlertCard
          title="Filtro de combustível"
          emptyMessage="Ainda não há prazo de filtro de combustível. Registre a primeira troca."
          isLoading={isLoading}
          nextDue={fuelFilterNextDue}
        />
        <AlertCard
          title="Filtro de ar do motor"
          emptyMessage="Ainda não há prazo de filtro de ar do motor. Registre a primeira troca."
          isLoading={isLoading}
          nextDue={engineAirFilterNextDue}
        />
        <AlertCard
          title="Filtro de cabine"
          emptyMessage="Ainda não há prazo de filtro de cabine. Registre a primeira troca."
          isLoading={isLoading}
          nextDue={cabinAirFilterNextDue}
        />

        <GroupTitle>Suspensão dianteira</GroupTitle>
        {FRONT_SUSPENSION_PART_KINDS.map((kind) => {
          const label = FRONT_SUSPENSION_PART_LABELS[kind];
          return (
            <AlertCard
              key={`front-${kind}`}
              title={label}
              emptyMessage={emptyPartMessage(label)}
              isLoading={isLoading}
              nextDue={frontSuspensionNextDue[kind] ?? null}
            />
          );
        })}

        <GroupTitle>Suspensão traseira</GroupTitle>
        {REAR_SUSPENSION_PART_KINDS.map((kind) => {
          const label = REAR_SUSPENSION_PART_LABELS[kind];
          return (
            <AlertCard
              key={`rear-${kind}`}
              title={label}
              emptyMessage={emptyPartMessage(label)}
              isLoading={isLoading}
              nextDue={rearSuspensionNextDue[kind] ?? null}
            />
          );
        })}

        <GroupTitle>Freios</GroupTitle>
        {BRAKE_PART_KINDS.map((kind) => {
          const label = BRAKE_PART_LABELS[kind];
          return (
            <AlertCard
              key={`brake-${kind}`}
              title={label}
              emptyMessage={emptyPartMessage(label)}
              isLoading={isLoading}
              nextDue={brakeNextDue[kind] ?? null}
            />
          );
        })}
      </Content>
    </Screen>
  );
}
