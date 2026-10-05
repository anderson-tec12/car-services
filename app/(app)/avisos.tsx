import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function AvisosScreen() {
  const insets = useSafeAreaInsets();
  const { activeVehicle } = useVehicles();
  const [oilNextDue, setOilNextDue] = useState<EngineOilNextDue | null>(null);
  const [coolantNextDue, setCoolantNextDue] = useState<CoolantNextDue | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    if (!activeVehicle) {
      setOilNextDue(null);
      setCoolantNextDue(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [oilChanges, coolantChanges] = await Promise.all([
        listEngineOilChanges(activeVehicle.id),
        listCoolantChanges(activeVehicle.id),
      ]);
      setOilNextDue(getNextEngineOilDue(oilChanges));
      setCoolantNextDue(getNextCoolantDue(coolantChanges));
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

        <Card>
          <CardTitle>Óleo do motor</CardTitle>
          {isLoading ? (
            <CardBody>Carregando...</CardBody>
          ) : oilNextDue ? (
            <>
              <CardBody>
                Última troca em {formatDisplayDate(oilNextDue.lastChange.changedOn)} (
                {formatKm(oilNextDue.lastChange.odometerKm)}).
              </CardBody>
              <CardBody style={{ marginTop: theme.spacing.sm }}>
                Próxima troca: até {formatDisplayDate(oilNextDue.nextDueDate)} ou aos{' '}
                {formatKm(oilNextDue.nextDueKm)}, o que ocorrer primeiro.
              </CardBody>
              <StatusText overdue={oilNextDue.isOverdueByDate}>
                {oilNextDue.isOverdueByDate
                  ? 'Troca vencida pela data'
                  : 'Dentro do prazo pela data'}
              </StatusText>
            </>
          ) : (
            <CardBody>Ainda não há prazo de óleo do motor. Registre a primeira troca.</CardBody>
          )}
        </Card>

        <Card>
          <CardTitle>Arrefecimento</CardTitle>
          {isLoading ? (
            <CardBody>Carregando...</CardBody>
          ) : coolantNextDue ? (
            <>
              <CardBody>
                Última troca em {formatDisplayDate(coolantNextDue.lastChange.changedOn)} (
                {formatKm(coolantNextDue.lastChange.odometerKm)}).
              </CardBody>
              <CardBody style={{ marginTop: theme.spacing.sm }}>
                Próxima troca: até {formatDisplayDate(coolantNextDue.nextDueDate)} ou aos{' '}
                {formatKm(coolantNextDue.nextDueKm)}, o que ocorrer primeiro.
              </CardBody>
              <StatusText overdue={coolantNextDue.isOverdueByDate}>
                {coolantNextDue.isOverdueByDate
                  ? 'Troca vencida pela data'
                  : 'Dentro do prazo pela data'}
              </StatusText>
            </>
          ) : (
            <CardBody>
              Ainda não há prazo de arrefecimento. Registre a primeira troca.
            </CardBody>
          )}
        </Card>
      </Content>
    </Screen>
  );
}
