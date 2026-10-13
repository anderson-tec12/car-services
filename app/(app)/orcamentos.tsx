import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDisplayDate } from '../../src/db/engineOilChanges';
import { formatPriceCents, listQuotes, type QuoteSummary } from '../../src/db/quotes';
import styled from '../../src/theme/styled';
import { theme } from '../../src/theme/theme';
import { useVehicles } from '../../src/vehicles/VehicleContext';

const OPEN_ICON = {
  ios: 'doc.text',
  android: 'request_quote',
  web: 'request_quote',
} as const;

const APPROVED_ICON = {
  ios: 'checkmark.circle.fill',
  android: 'check_circle',
  web: 'check_circle',
} as const;

const APPROVED_COLOR = '#3DDC97';

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

const RowMeta = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 14px;
  margin-top: ${theme.spacing.sm}px;
`;

const RowTotal = styled.Text`
  color: ${theme.colors.text};
  font-size: 15px;
  font-weight: 700;
`;

export default function OrcamentosScreen() {
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
      setItems(await listQuotes(activeVehicle.id));
    } catch (error) {
      console.error('Failed to list quotes', error);
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
        <AddButton onPress={() => router.push('/orcamento')}>
          <AddLabel>Novo orçamento</AddLabel>
        </AddButton>

        {isLoading ? (
          <EmptyText>Carregando...</EmptyText>
        ) : items.length === 0 ? (
          <EmptyText>Nenhum orçamento registrado.</EmptyText>
        ) : (
          items.map((item) => (
            <RowButton
              key={item.id}
              accessibilityLabel={
                item.approved
                  ? `${item.name}, aprovado, ${formatPriceCents(item.totalCents)}`
                  : `${item.name}, ${formatPriceCents(item.totalCents)}`
              }
              onPress={() => router.push({ pathname: '/orcamento', params: { id: String(item.id) } })}
            >
              <SymbolView
                name={item.approved ? APPROVED_ICON : OPEN_ICON}
                tintColor={item.approved ? APPROVED_COLOR : theme.colors.primary}
                size={28}
              />
              <RowText>
                <RowDate>{formatDisplayDate(item.quotedOn)}</RowDate>
                <RowTitle>{item.name}</RowTitle>
                <RowMeta>
                  {item.storeName}
                  {item.approved ? ' · Aprovado' : ''}
                </RowMeta>
              </RowText>
              <RowTotal>{formatPriceCents(item.totalCents)}</RowTotal>
            </RowButton>
          ))
        )}
      </Content>
    </Screen>
  );
}
