import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  OccurrenceMediaSection,
  type DraftMediaItem,
} from '../../src/components/OccurrenceMediaSection';
import { formatDisplayDate, todayLocalIso } from '../../src/db/engineOilChanges';
import {
  deleteOccurrence,
  deleteOccurrenceFile,
  getOccurrence,
  saveOccurrence,
  type OccurrenceMediaPurpose,
} from '../../src/db/occurrences';
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

const Area = styled(Field).attrs({
  multiline: true,
  textAlignVertical: 'top',
})`
  min-height: 120px;
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
  margin-bottom: ${theme.spacing.lg}px;
`;

const SectionTitle = styled.Text`
  color: ${theme.colors.primary};
  font-size: 20px;
  font-weight: 700;
  margin-bottom: ${theme.spacing.md}px;
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

const NoteCard = styled.View`
  background-color: ${theme.colors.surface};
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: #2a2a2a;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const NoteWhen = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 12px;
  margin-bottom: ${theme.spacing.sm}px;
`;

const NoteBody = styled.Text`
  color: ${theme.colors.text};
  font-size: 16px;
  line-height: 22px;
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

type SavedNote = {
  key: string;
  id: number;
  body: string;
  createdAt: string;
};

function formatNoteTimestamp(value: string): string {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDraft(item: {
  id: number;
  kind: DraftMediaItem['kind'];
  uri: string;
}): DraftMediaItem {
  return {
    key: `saved-${item.id}`,
    id: item.id,
    kind: item.kind,
    uri: item.uri,
  };
}

export default function OcorrenciaScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string }>();
  const occurrenceId =
    typeof params.id === 'string' && params.id.length > 0 ? Number(params.id) : null;
  const { activeVehicle } = useVehicles();
  const [occurredOn, setOccurredOn] = useState(todayLocalIso());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [title, setTitle] = useState('');
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [draftText, setDraftText] = useState('');
  const [resolved, setResolved] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [reportMedia, setReportMedia] = useState<DraftMediaItem[]>([]);
  const [resolutionMedia, setResolutionMedia] = useState<DraftMediaItem[]>([]);
  const [recordingPurpose, setRecordingPurpose] = useState<OccurrenceMediaPurpose | null>(null);
  const shouldLoad = occurrenceId !== null && Number.isInteger(occurrenceId);
  const [isLoading, setIsLoading] = useState(shouldLoad);
  const [isSaving, setIsSaving] = useState(false);
  const savedRef = useRef(false);
  const draftUrisRef = useRef<string[]>([]);

  useEffect(() => {
    draftUrisRef.current = [...reportMedia, ...resolutionMedia]
      .filter((item) => item.id === null)
      .map((item) => item.uri);
  }, [reportMedia, resolutionMedia]);

  useEffect(() => {
    navigation.setOptions({
      title: occurrenceId ? 'Editar ocorrência' : 'Nova ocorrência',
    });
  }, [navigation, occurrenceId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (savedRef.current) {
        return;
      }
      for (const uri of draftUrisRef.current) {
        deleteOccurrenceFile(uri);
      }
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (occurrenceId !== null && !Number.isInteger(occurrenceId)) {
      Alert.alert('Atenção', 'Ocorrência não encontrada.');
      router.back();
    }
  }, [occurrenceId]);

  useEffect(() => {
    if (!shouldLoad || !activeVehicle || occurrenceId === null) {
      return;
    }

    let active = true;
    void getOccurrence(occurrenceId, activeVehicle.id)
      .then((occurrence) => {
        if (!active) {
          return;
        }
        if (!occurrence) {
          Alert.alert('Atenção', 'Ocorrência não encontrada.');
          router.back();
          return;
        }
        setOccurredOn(occurrence.occurredOn);
        setTitle(occurrence.title);
        setSavedNotes(
          occurrence.notes.map((note) => ({
            key: `saved-${note.id}`,
            id: note.id,
            body: note.body,
            createdAt: note.createdAt,
          })),
        );
        setDraftText('');
        setResolved(occurrence.resolved);
        setResolutionNotes(occurrence.resolutionNotes ?? '');
        setReportMedia(
          occurrence.media.filter((item) => item.purpose === 'report').map(toDraft),
        );
        setResolutionMedia(
          occurrence.media.filter((item) => item.purpose === 'resolution').map(toDraft),
        );
      })
      .catch((error) => {
        console.error('Failed to load occurrence', error);
        if (active) {
          Alert.alert('Atenção', 'Não foi possível abrir a ocorrência.');
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
  }, [activeVehicle, occurrenceId, shouldLoad]);

  const handleRecordingChange = useCallback((purpose: OccurrenceMediaPurpose, active: boolean) => {
    setRecordingPurpose((current) => {
      if (active) {
        return purpose;
      }
      return current === purpose ? null : current;
    });
  }, []);

  function handleDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed' || !selected) {
      return;
    }
    const nextIso = toLocalIso(selected);
    const today = todayLocalIso();
    setOccurredOn(nextIso > today ? today : nextIso);
  }

  function hasResolutionContent() {
    return resolutionNotes.trim().length > 0 || resolutionMedia.length > 0;
  }

  function notesForSave(nextResolved: boolean) {
    const saved = savedNotes.map((note) => ({ id: note.id, body: note.body }));
    const extra = draftText.trim();
    const canAppend = occurrenceId === null || !nextResolved;
    if (canAppend && extra.length > 0) {
      return [...saved, { id: null, body: extra }];
    }
    return saved;
  }

  async function persist(nextResolved: boolean) {
    if (!activeVehicle || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await saveOccurrence({
        id: occurrenceId ?? undefined,
        vehicleId: activeVehicle.id,
        occurredOn,
        title,
        notes: notesForSave(nextResolved),
        resolved: nextResolved,
        resolutionNotes,
        media: [
          ...reportMedia.map((item) => ({
            id: item.id,
            purpose: 'report' as const,
            kind: item.kind,
            uri: item.uri,
          })),
          ...resolutionMedia.map((item) => ({
            id: item.id,
            purpose: 'resolution' as const,
            kind: item.kind,
            uri: item.uri,
          })),
        ],
      });
      savedRef.current = true;
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a ocorrência.';
      Alert.alert('Atenção', message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleSubmit() {
    if (isSaving || recordingPurpose !== null) {
      return;
    }
    if (title.trim().length === 0) {
      Alert.alert('Atenção', 'Informe o título.');
      return;
    }
    if (!resolved && hasResolutionContent()) {
      Alert.alert(
        'Descartar solução',
        'Salvar como não resolvido apaga o texto e as mídias da solução.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salvar', style: 'destructive', onPress: () => void persist(false) },
        ],
      );
      return;
    }
    void persist(resolved);
  }

  function handleDelete() {
    if (!activeVehicle || occurrenceId === null || isSaving) {
      return;
    }

    Alert.alert('Apagar ocorrência', 'Apagar esta ocorrência e os arquivos dela?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setIsSaving(true);
            try {
              await deleteOccurrence(occurrenceId, activeVehicle.id);
              for (const item of [...reportMedia, ...resolutionMedia]) {
                if (item.id === null) {
                  deleteOccurrenceFile(item.uri);
                }
              }
              savedRef.current = true;
              router.back();
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Não foi possível apagar a ocorrência.';
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

  const busy = isSaving || recordingPurpose !== null;

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
          <DateButton onPress={() => setShowDatePicker(true)} disabled={isSaving}>
            <DateButtonText>{formatDisplayDate(occurredOn)}</DateButtonText>
          </DateButton>
          {showDatePicker ? (
            <View style={{ marginBottom: theme.spacing.lg }}>
              <DateTimePicker
                value={parseLocalDate(occurredOn)}
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

          <Label>Título</Label>
          <Field
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Barulho no freio"
            editable={!isSaving}
          />

          {savedNotes.length > 0 ? (
            <>
              <Label>Textos</Label>
              {savedNotes.map((note) => (
                <NoteCard key={note.key}>
                  <NoteWhen>{formatNoteTimestamp(note.createdAt)}</NoteWhen>
                  <NoteBody>{note.body}</NoteBody>
                </NoteCard>
              ))}
            </>
          ) : null}

          {occurrenceId === null || !resolved ? (
            <>
              <Label>{occurrenceId === null ? 'Texto' : 'Nova informação'}</Label>
              <Area
                value={draftText}
                onChangeText={setDraftText}
                placeholder={
                  occurrenceId === null ? 'Descreva o problema' : 'Acrescente o que mudou'
                }
                editable={!isSaving}
              />
            </>
          ) : null}

          <Label>Mídias do relato</Label>
          <OccurrenceMediaSection
            items={reportMedia}
            onChange={setReportMedia}
            disabled={isSaving}
            canRecord={recordingPurpose === null || recordingPurpose === 'report'}
            onRecordingChange={(active) => handleRecordingChange('report', active)}
          />

          <ToggleRow>
            <Label style={{ marginBottom: 0 }}>Problema resolvido</Label>
            <Switch
              value={resolved}
              onValueChange={setResolved}
              disabled={isSaving || recordingPurpose !== null}
              trackColor={{ false: '#2a2a2a', true: theme.colors.primary }}
              thumbColor={theme.colors.text}
            />
          </ToggleRow>

          {resolved ? (
            <>
              <SectionTitle>Solução</SectionTitle>
              <Label>Texto</Label>
              <Area
                value={resolutionNotes}
                onChangeText={setResolutionNotes}
                placeholder="Descreva como foi resolvido"
                editable={!isSaving}
              />
              <Label>Mídias da solução</Label>
              <OccurrenceMediaSection
                items={resolutionMedia}
                onChange={setResolutionMedia}
                disabled={isSaving}
                canRecord={recordingPurpose === null || recordingPurpose === 'resolution'}
                onRecordingChange={(active) => handleRecordingChange('resolution', active)}
              />
            </>
          ) : null}

          <SubmitButton disabled={busy || !activeVehicle} onPress={handleSubmit}>
            <SubmitLabel>{isSaving ? 'Salvando...' : 'Salvar'}</SubmitLabel>
          </SubmitButton>

          {occurrenceId !== null ? (
            <DeleteButton disabled={busy} onPress={handleDelete}>
              <DeleteLabel>Apagar ocorrência</DeleteLabel>
            </DeleteButton>
          ) : null}
        </Content>
      </KeyboardAvoidingView>
    </Screen>
  );
}
