import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDisplayDate, todayLocalIso } from '../../src/db/engineOilChanges';
import {
  centsFromPriceInput,
  deleteQuote,
  formatPriceCents,
  getQuote,
  saveQuote,
} from '../../src/db/quotes';
import styled from '../../src/theme/styled';
import { theme } from '../../src/theme/theme';
import { useVehicles } from '../../src/vehicles/VehicleContext';

type DraftItem = {
  key: string;
  name: string;
  link: string;
  priceCents: number;
};

let draftSerial = 0;

function createDraftItem(): DraftItem {
  draftSerial += 1;
  return {
    key: `item-${draftSerial}`,
    name: '',
    link: '',
    priceCents: 0,
  };
}

function openLink(link: string) {
  const trimmed = link.trim();
  const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  void Linking.openURL(url).catch(() => {
    Alert.alert('Atenção', 'Não foi possível abrir o link.');
  });
}

const Screen = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const Content = styled.ScrollView.attrs({
  keyboardShouldPersistTaps: 'handled',
})`
  flex: 1;
`;

const Label = styled.Text`
  color: ${theme.colors.text};
  font-size: 14px;
  font-weight: 600;
  margin-bottom: ${theme.spacing.sm}px;
`;

const Field = styled.TextInput.attrs({
  placeholderTextColor: theme.colors.textSecondary,
})`
  background-color: ${theme.colors.surface};
  color: ${theme.colors.text};
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: #2a2a2a;
  padding: ${theme.spacing.md}px;
  font-size: 16px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const ReadOnlyValue = styled.Text`
  color: ${theme.colors.text};
  font-size: 16px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const ItemCard = styled.View`
  background-color: ${theme.colors.surface};
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: #2a2a2a;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const ItemHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.sm}px;
`;

const ItemTitle = styled.Text`
  color: ${theme.colors.text};
  font-size: 15px;
  font-weight: 700;
`;

const RemoveButton = styled.Pressable`
  padding-vertical: ${theme.spacing.sm}px;
`;

const RemoveLabel = styled.Text`
  color: #ff6b6b;
  font-size: 14px;
  font-weight: 700;
`;

const LinkButton = styled.Pressable`
  margin-bottom: ${theme.spacing.md}px;
`;

const LinkLabel = styled.Text`
  color: ${theme.colors.primary};
  font-size: 15px;
  font-weight: 700;
`;

const AddItemButton = styled.Pressable`
  border-width: 1px;
  border-color: ${theme.colors.primary};
  border-radius: ${theme.radii.md}px;
  padding: ${theme.spacing.md}px;
  align-items: center;
  margin-bottom: ${theme.spacing.lg}px;
`;

const AddItemLabel = styled.Text`
  color: ${theme.colors.primary};
  font-size: 16px;
  font-weight: 700;
`;

const TotalCard = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.lg}px;
`;

const TotalLabel = styled.Text`
  color: ${theme.colors.text};
  font-size: 18px;
  font-weight: 700;
`;

const TotalValue = styled.Text`
  color: ${theme.colors.primary};
  font-size: 20px;
  font-weight: 700;
`;

const ToggleRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.lg}px;
`;

const LockedNote = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 14px;
  line-height: 20px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const SubmitButton = styled.Pressable<{ disabled?: boolean }>`
  background-color: ${theme.colors.primary};
  border-radius: ${theme.radii.md}px;
  padding: ${theme.spacing.md}px;
  align-items: center;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
  margin-bottom: ${theme.spacing.md}px;
`;

const SubmitLabel = styled.Text`
  color: ${theme.colors.background};
  font-size: 16px;
  font-weight: 700;
`;

const DeleteButton = styled.Pressable<{ disabled?: boolean }>`
  align-items: center;
  padding: ${theme.spacing.md}px;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
`;

const DeleteLabel = styled.Text`
  color: #ff6b6b;
  font-size: 16px;
  font-weight: 700;
`;

const EmptyText = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 16px;
`;

export default function OrcamentoScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string }>();
  const quoteId = typeof params.id === 'string' && params.id.length > 0 ? Number(params.id) : null;
  const { activeVehicle } = useVehicles();
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [quotedOn, setQuotedOn] = useState(todayLocalIso());
  const [approved, setApproved] = useState(false);
  const [locked, setLocked] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([createDraftItem()]);
  const shouldLoad = quoteId !== null && Number.isInteger(quoteId);
  const [isLoading, setIsLoading] = useState(shouldLoad);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: locked ? 'Orçamento aprovado' : quoteId ? 'Editar orçamento' : 'Novo orçamento',
    });
  }, [navigation, quoteId, locked]);

  useEffect(() => {
    if (quoteId !== null && !Number.isInteger(quoteId)) {
      Alert.alert('Atenção', 'Orçamento não encontrado.');
      router.back();
    }
  }, [quoteId]);

  useEffect(() => {
    if (!shouldLoad || !activeVehicle || quoteId === null) {
      return;
    }

    let active = true;
    void getQuote(quoteId, activeVehicle.id)
      .then((quote) => {
        if (!active) {
          return;
        }
        if (!quote) {
          Alert.alert('Atenção', 'Orçamento não encontrado.');
          router.back();
          return;
        }
        setName(quote.name);
        setStoreName(quote.storeName);
        setQuotedOn(quote.quotedOn);
        setApproved(quote.approved);
        setLocked(quote.approved);
        setItems(
          quote.items.length > 0
            ? quote.items.map((item) => {
                draftSerial += 1;
                return {
                  key: `saved-${item.id}-${draftSerial}`,
                  name: item.name,
                  link: item.link ?? '',
                  priceCents: item.priceCents,
                };
              })
            : [createDraftItem()],
        );
      })
      .catch((error) => {
        console.error('Failed to load quote', error);
        if (active) {
          Alert.alert('Atenção', 'Não foi possível abrir o orçamento.');
          router.back();
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [activeVehicle, quoteId, shouldLoad]);

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  async function persist() {
    if (!activeVehicle || isSaving || locked) {
      return;
    }

    setIsSaving(true);
    try {
      await saveQuote({
        id: quoteId ?? undefined,
        vehicleId: activeVehicle.id,
        name,
        storeName,
        approved,
        items: items.map((item) => ({
          name: item.name,
          link: item.link,
          priceCents: item.priceCents,
        })),
      });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o orçamento.';
      Alert.alert('Atenção', message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete() {
    if (!activeVehicle || quoteId === null || isSaving || locked) {
      return;
    }

    Alert.alert('Apagar orçamento', 'Apagar este orçamento e os itens dele?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setIsSaving(true);
            try {
              await deleteQuote(quoteId, activeVehicle.id);
              router.back();
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Não foi possível apagar o orçamento.';
              Alert.alert('Atenção', message);
            } finally {
              setIsSaving(false);
            }
          })();
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <Screen>
        <EmptyText style={{ padding: theme.spacing.xl }}>Carregando...</EmptyText>
      </Screen>
    );
  }

  const totalCents = items.reduce((sum, item) => sum + item.priceCents, 0);

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Content
          contentContainerStyle={{
            padding: theme.spacing.xl,
            paddingBottom: theme.spacing.xl + insets.bottom,
          }}
        >
          <Label>Data</Label>
          <ReadOnlyValue>{formatDisplayDate(quotedOn)}</ReadOnlyValue>

          <Label>Nome</Label>
          <Field
            value={name}
            onChangeText={setName}
            placeholder="Ex.: Revisão dos freios"
            editable={!locked && !isSaving}
          />

          <Label>Loja</Label>
          <Field
            value={storeName}
            onChangeText={setStoreName}
            placeholder="Ex.: Auto Peças Centro"
            editable={!locked && !isSaving}
          />

          <Label>Itens</Label>
          {items.map((item, index) => (
            <ItemCard key={item.key}>
              <ItemHeader>
                <ItemTitle>Item {index + 1}</ItemTitle>
                {!locked && items.length > 1 ? (
                  <RemoveButton
                    onPress={() => setItems((current) => current.filter((entry) => entry.key !== item.key))}
                    disabled={isSaving}
                  >
                    <RemoveLabel>Remover</RemoveLabel>
                  </RemoveButton>
                ) : null}
              </ItemHeader>
              <Label>Nome</Label>
              <Field
                value={item.name}
                onChangeText={(text) => updateItem(item.key, { name: text })}
                placeholder="Ex.: Pastilha de freio"
                editable={!locked && !isSaving}
              />
              <Label>Link</Label>
              {locked && item.link.trim().length > 0 ? (
                <LinkButton onPress={() => openLink(item.link)}>
                  <LinkLabel>{item.link}</LinkLabel>
                </LinkButton>
              ) : (
                <Field
                  value={item.link}
                  onChangeText={(text) => updateItem(item.key, { link: text })}
                  placeholder="Opcional"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!locked && !isSaving}
                />
              )}
              <Label>Preço</Label>
              <Field
                value={formatPriceCents(item.priceCents)}
                onChangeText={(text) => updateItem(item.key, { priceCents: centsFromPriceInput(text) })}
                keyboardType="number-pad"
                editable={!locked && !isSaving}
              />
            </ItemCard>
          ))}

          {!locked ? (
            <AddItemButton onPress={() => setItems((current) => [...current, createDraftItem()])} disabled={isSaving}>
              <AddItemLabel>Adicionar item</AddItemLabel>
            </AddItemButton>
          ) : null}

          <TotalCard>
            <TotalLabel>Total</TotalLabel>
            <TotalValue>{formatPriceCents(totalCents)}</TotalValue>
          </TotalCard>

          <ToggleRow>
            <Label style={{ marginBottom: 0 }}>Aprovado</Label>
            <Switch
              value={approved}
              onValueChange={setApproved}
              disabled={locked || isSaving}
              trackColor={{ false: '#2a2a2a', true: theme.colors.primary }}
              thumbColor={theme.colors.text}
            />
          </ToggleRow>

          {locked ? (
            <LockedNote>Este orçamento foi aprovado e não pode mais ser alterado.</LockedNote>
          ) : (
            <>
              <SubmitButton disabled={isSaving || !activeVehicle} onPress={() => void persist()}>
                <SubmitLabel>{isSaving ? 'Salvando...' : 'Salvar'}</SubmitLabel>
              </SubmitButton>
              {quoteId !== null ? (
                <DeleteButton disabled={isSaving} onPress={handleDelete}>
                  <DeleteLabel>Apagar orçamento</DeleteLabel>
                </DeleteButton>
              ) : null}
            </>
          )}
        </Content>
      </KeyboardAvoidingView>
    </Screen>
  );
}
