import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatPriceCents, listApprovedQuotes, type QuoteSummary } from '../../src/db/quotes';
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

const EmptyText = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 16px;
  line-height: 24px;
`;

const RowButton = styled.Pressable`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: #2a2a2a;
  padding-vertical: ${theme.spacing.md}px;
`;

const RowTitle = styled.Text`
  color: ${theme.colors.text};
  font-size: 16px;
  font-weight: 700;
  flex: 1;
`;

const RowTotal = styled.Text`
  color: ${theme.colors.text};
  font-size: 15px;
  font-weight: 700;
`;

const TotalCard = styled.View`
  margin-top: ${theme.spacing.lg}px;
  background-color: ${theme.colors.surface};
  border-radius: ${theme.radii.md}px;
  padding: ${theme.spacing.md}px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const TotalLabel = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 16px;
  font-weight: 600;
`;

const TotalValue = styled.Text`
  color: ${theme.colors.primary};
  font-size: 20px;
  font-weight: 700;
`;

export default function GastosScreen() {
  const insets = useSafeAreaInsets();
  const { activeVehicle } = useVehicles();
  const [items, setItems] = useState<QuoteSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeVehicle) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setItems(await listApprovedQuotes(activeVehicle.id));
    } catch (error) {
      console.error('Failed to list expenses', error);
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

  const totalCents = items.reduce((sum, item) => sum + item.totalCents, 0);

  return (
    <Screen>
      <Content
        contentContainerStyle={{
          padding: theme.spacing.xl,
          paddingBottom: theme.spacing.xl + insets.bottom,
        }}
      >
        {isLoading ? (
          <EmptyText>Carregando...</EmptyText>
        ) : items.length === 0 ? (
          <EmptyText>Nenhum gasto registrado. Aprove um orçamento para ele aparecer aqui.</EmptyText>
        ) : (
          <>
            {items.map((item) => (
              <RowButton
                key={item.id}
                accessibilityLabel={`${item.name}, ${formatPriceCents(item.totalCents)}`}
                onPress={() => router.push({ pathname: '/orcamento', params: { id: String(item.id) } })}
              >
                <RowTitle>{item.name}</RowTitle>
                <RowTotal>{formatPriceCents(item.totalCents)}</RowTotal>
              </RowButton>
            ))}
            <TotalCard>
              <TotalLabel>Total de gastos</TotalLabel>
              <TotalValue>{formatPriceCents(totalCents)}</TotalValue>
            </TotalCard>
          </>
        )}
      </Content>
    </Screen>
  );
}
