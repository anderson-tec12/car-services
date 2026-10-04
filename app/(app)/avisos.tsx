import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const [nextDue, setNextDue] = useState<EngineOilNextDue | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    if (!activeVehicle) {
      setNextDue(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const changes = await listEngineOilChanges(activeVehicle.id);
      setNextDue(getNextEngineOilDue(changes));
    } catch (error) {
      console.error('Failed to load oil alerts', error);
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
            <CardBody>Ainda não há prazo de óleo do motor. Registre a primeira troca.</CardBody>
          )}
        </Card>
      </Content>
    </Screen>
  );
}
