import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDisplayDate } from '../../src/db/engineOilChanges';
import { listOccurrences, type OccurrenceSummary } from '../../src/db/occurrences';
import styled from '../../src/theme/styled';
import { theme } from '../../src/theme/theme';
import { useVehicles } from '../../src/vehicles/VehicleContext';

const OPEN_ICON = {
  ios: 'exclamationmark.triangle.fill',
  android: 'warning',
  web: 'warning',
} as const;

const RESOLVED_ICON = {
  ios: 'checkmark.circle.fill',
  android: 'check_circle',
  web: 'check_circle',
} as const;

const RESOLVED_COLOR = '#3DDC97';

const Screen = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const Content = styled.ScrollView`
  flex: 1;
`;

const AddButton = styled.Pressable`
  background-color: ${theme.colors.primary};
  border-radius: ${theme.radii.md}px;
  padding: ${theme.spacing.md}px;
  align-items: center;
  margin-bottom: ${theme.spacing.lg}px;
`;

const AddLabel = styled.Text`
  color: ${theme.colors.background};
  font-size: 16px;
  font-weight: 700;
`;

const EmptyText = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 16px;
  line-height: 24px;
`;

const RowButton = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: #2a2a2a;
  padding-vertical: ${theme.spacing.md}px;
`;

const RowText = styled.View`
  flex: 1;
`;

const RowDate = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 13px;
  margin-bottom: ${theme.spacing.sm}px;
`;

const RowTitle = styled.Text`
  color: ${theme.colors.text};
  font-size: 16px;
  font-weight: 700;
`;

export default function OcorrenciasScreen() {
  const insets = useSafeAreaInsets();
  const { activeVehicle } = useVehicles();
  const [items, setItems] = useState<OccurrenceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeVehicle) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setItems(await listOccurrences(activeVehicle.id));
    } catch (error) {
      console.error('Failed to list occurrences', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeVehicle]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen>
      <Content
        contentContainerStyle={{
          padding: theme.spacing.xl,
          paddingBottom: theme.spacing.xl + insets.bottom,
        }}
      >
        <AddButton onPress={() => router.push('/ocorrencia')}>
          <AddLabel>Nova ocorrência</AddLabel>
        </AddButton>

        {isLoading ? (
          <EmptyText>Carregando...</EmptyText>
        ) : items.length === 0 ? (
          <EmptyText>Nenhuma ocorrência registrada.</EmptyText>
        ) : (
          items.map((item) => (
            <RowButton
              key={item.id}
              accessibilityLabel={item.resolved ? `${item.title}, resolvido` : `${item.title}, em aberto`}
              onPress={() =>
                router.push({ pathname: '/ocorrencia', params: { id: String(item.id) } })
              }
            >
              <SymbolView
                name={item.resolved ? RESOLVED_ICON : OPEN_ICON}
                tintColor={item.resolved ? RESOLVED_COLOR : theme.colors.primary}
                size={28}
              />
              <RowText>
                <RowDate>{formatDisplayDate(item.occurredOn)}</RowDate>
                <RowTitle>{item.title}</RowTitle>
              </RowText>
            </RowButton>
          ))
        )}
      </Content>
    </Screen>
  );
}
