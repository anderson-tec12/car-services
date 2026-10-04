import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createEngineOilChange,
  deleteEngineOilChange,
  formatDisplayDate,
  formatKm,
  listEngineOilChanges,
  todayLocalIso,
  type EngineOilChange,
} from '../../src/db/engineOilChanges';
import styled from '../../src/theme/styled';
import { theme } from '../../src/theme/theme';
import { useVehicles } from '../../src/vehicles/VehicleContext';

const Screen = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const Content = styled.ScrollView.attrs({
  keyboardShouldPersistTaps: 'handled',
})`
  flex: 1;
`;

const SectionTitle = styled.Text`
  color: ${theme.colors.primary};
  font-size: 20px;
  font-weight: 700;
  margin-bottom: ${theme.spacing.md}px;
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

const DateButton = styled.Pressable`
  background-color: ${theme.colors.surface};
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: #2a2a2a;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const DateButtonText = styled.Text`
  color: ${theme.colors.text};
  font-size: 16px;
`;

const DatePickerDone = styled.Text`
  color: ${theme.colors.primary};
  font-size: 16px;
  font-weight: 700;
  margin-top: ${theme.spacing.sm}px;
  text-align: right;
`;

const ToggleRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: ${theme.colors.surface};
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: #2a2a2a;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const ToggleLabel = styled.Text`
  color: ${theme.colors.text};
  font-size: 16px;
  font-weight: 600;
  flex: 1;
  margin-right: ${theme.spacing.md}px;
`;

const SubmitButton = styled.Pressable<{ disabled?: boolean }>`
  background-color: ${theme.colors.primary};
  border-radius: ${theme.radii.md}px;
  padding: ${theme.spacing.md}px;
  align-items: center;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
  margin-bottom: ${theme.spacing.xl}px;
`;

const SubmitLabel = styled.Text`
  color: ${theme.colors.background};
  font-size: 16px;
  font-weight: 700;
`;

const HistoryTitle = styled.Text`
  color: ${theme.colors.primary};
  font-size: 20px;
  font-weight: 700;
  margin-bottom: ${theme.spacing.md}px;
`;

const EmptyText = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 16px;
  line-height: 24px;
`;

const HistoryItem = styled.View`
  border-bottom-width: 1px;
  border-bottom-color: #2a2a2a;
  padding-vertical: ${theme.spacing.md}px;
`;

const HistoryDate = styled.Text`
  color: ${theme.colors.text};
  font-size: 16px;
  font-weight: 600;
  margin-bottom: ${theme.spacing.sm}px;
`;

const HistoryKm = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 14px;
  margin-bottom: ${theme.spacing.sm}px;
`;

const HistoryFilter = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 14px;
  margin-bottom: ${theme.spacing.md}px;
`;

const DeleteButton = styled.Pressable`
  align-self: flex-start;
  padding-vertical: ${theme.spacing.sm}px;
`;

const DeleteLabel = styled.Text`
  color: #ff6b6b;
  font-size: 14px;
  font-weight: 700;
`;

function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toLocalIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function OleoMotorScreen() {
  const insets = useSafeAreaInsets();
  const { activeVehicle } = useVehicles();
  const [changedOn, setChangedOn] = useState(todayLocalIso());
  const [odometerKm, setOdometerKm] = useState('');
  const [filterChanged, setFilterChanged] = useState(false);
  const [history, setHistory] = useState<EngineOilChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!activeVehicle) {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await listEngineOilChanges(activeVehicle.id);
      setHistory(rows);
    } catch (error) {
      console.error('Failed to load engine oil changes', error);
      Alert.alert('Atenção', 'Não foi possível carregar o histórico.');
    } finally {
      setIsLoading(false);
    }
  }, [activeVehicle]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  function handleDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed' || !selected) {
      return;
    }

    const nextIso = toLocalIso(selected);
    const today = todayLocalIso();
    setChangedOn(nextIso > today ? today : nextIso);
  }

  async function handleSubmit() {
    if (!activeVehicle || isSubmitting) {
      return;
    }

    const km = Number(odometerKm.replace(/\D/g, ''));
    setIsSubmitting(true);
    try {
      await createEngineOilChange({
        vehicleId: activeVehicle.id,
        changedOn,
        odometerKm: km,
        filterChanged,
      });
      setOdometerKm('');
      setFilterChanged(false);
      setChangedOn(todayLocalIso());
      await loadHistory();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar a troca de óleo.';
      Alert.alert('Atenção', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDelete(item: EngineOilChange) {
    if (!activeVehicle || deletingId !== null) {
      return;
    }

    Alert.alert(
      'Apagar troca',
      `Apagar a troca de ${formatDisplayDate(item.changedOn)} (${formatKm(item.odometerKm)})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeletingId(item.id);
              try {
                await deleteEngineOilChange(item.id, activeVehicle.id);
                await loadHistory();
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : 'Não foi possível apagar a troca de óleo.';
                Alert.alert('Atenção', message);
              } finally {
                setDeletingId(null);
              }
            })();
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Content
          contentContainerStyle={{
            padding: theme.spacing.xl,
            paddingBottom: theme.spacing.xl + insets.bottom,
          }}
        >
          <SectionTitle>Registrar troca</SectionTitle>

          <Label>Data da troca</Label>
          <DateButton onPress={() => setShowDatePicker(true)} disabled={isSubmitting}>
            <DateButtonText>{formatDisplayDate(changedOn)}</DateButtonText>
          </DateButton>

          {showDatePicker ? (
            <View style={{ marginBottom: theme.spacing.lg }}>
              <DateTimePicker
                value={parseLocalDate(changedOn)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={handleDateChange}
              />
              {Platform.OS === 'ios' ? (
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <DatePickerDone>OK</DatePickerDone>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Label>Quilometragem atual</Label>
          <Field
            value={odometerKm}
            onChangeText={setOdometerKm}
            placeholder="Ex.: 45000"
            keyboardType="number-pad"
            editable={!isSubmitting}
          />

          <ToggleRow>
            <ToggleLabel>Filtro trocado</ToggleLabel>
            <Switch
              value={filterChanged}
              onValueChange={setFilterChanged}
              disabled={isSubmitting}
              trackColor={{ false: '#2a2a2a', true: theme.colors.primary }}
              thumbColor={theme.colors.text}
            />
          </ToggleRow>

          <SubmitButton disabled={isSubmitting || !activeVehicle} onPress={handleSubmit}>
            <SubmitLabel>{isSubmitting ? 'Salvando...' : 'Salvar troca'}</SubmitLabel>
          </SubmitButton>

          <HistoryTitle>Histórico</HistoryTitle>
          {isLoading ? (
            <EmptyText>Carregando...</EmptyText>
          ) : history.length === 0 ? (
            <EmptyText>Nenhuma troca registrada.</EmptyText>
          ) : (
            history.map((item) => (
              <HistoryItem key={item.id}>
                <HistoryDate>{formatDisplayDate(item.changedOn)}</HistoryDate>
                <HistoryKm>{formatKm(item.odometerKm)}</HistoryKm>
                <HistoryFilter>
                  {item.filterChanged ? 'Filtro trocado' : 'Sem troca de filtro'}
                </HistoryFilter>
                <DeleteButton
                  disabled={deletingId !== null}
                  onPress={() => handleDelete(item)}
                >
                  <DeleteLabel>
                    {deletingId === item.id ? 'Apagando...' : 'Apagar'}
                  </DeleteLabel>
                </DeleteButton>
              </HistoryItem>
            ))
          )}
        </Content>
      </KeyboardAvoidingView>
    </Screen>
  );
}
