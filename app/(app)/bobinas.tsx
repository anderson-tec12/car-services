import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  formatDisplayDate,
  formatKm,
  todayLocalIso,
} from '../../src/db/engineOilChanges';
import {
  createIgnitionCoilChange,
  deleteIgnitionCoilChange,
  getIgnitionCoilChangePhotoUris,
  listIgnitionCoilChanges,
  type IgnitionCoilChange,
} from '../../src/db/ignitionCoilChanges';
import {
  deleteIgnitionCoilPhoto,
  persistIgnitionCoilPhoto,
} from '../../src/db/ignitionCoilPhotos';
import styled from '../../src/theme/styled';
import { theme } from '../../src/theme/theme';
import { useVehicles } from '../../src/vehicles/VehicleContext';

const MAX_PHOTOS = 2;

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

const Hint = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 13px;
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

const PhotoActions = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const SecondaryButton = styled.Pressable<{ disabled?: boolean }>`
  flex: 1;
  background-color: ${theme.colors.surface};
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: #2a2a2a;
  padding: ${theme.spacing.md}px;
  align-items: center;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
`;

const SecondaryButtonLabel = styled.Text`
  color: ${theme.colors.text};
  font-size: 14px;
  font-weight: 700;
`;

const PhotoPreviewRow = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const PhotoPreviewWrap = styled.View`
  width: 96px;
`;

const PhotoThumb = styled.Image`
  width: 96px;
  height: 96px;
  border-radius: ${theme.radii.md}px;
  background-color: ${theme.colors.surface};
`;

const RemovePhotoButton = styled.Pressable`
  margin-top: ${theme.spacing.sm}px;
  align-items: center;
`;

const RemovePhotoLabel = styled.Text`
  color: #ff6b6b;
  font-size: 13px;
  font-weight: 700;
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

const HistoryMeta = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 14px;
  margin-bottom: ${theme.spacing.sm}px;
`;

const HistoryPhotosRow = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const HistoryPhotoThumb = styled.Image`
  width: 72px;
  height: 72px;
  border-radius: ${theme.radii.md}px;
  background-color: ${theme.colors.surface};
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

const ViewerBackdrop = styled.View`
  flex: 1;
  background-color: #000000;
  justify-content: center;
`;

const ViewerImage = styled.Image`
  width: 100%;
  height: 100%;
`;

const ViewerTopBar = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-horizontal: ${theme.spacing.md}px;
`;

const ViewerClose = styled.Text`
  color: ${theme.colors.text};
  font-size: 16px;
  font-weight: 700;
  padding: ${theme.spacing.md}px;
`;

const ViewerCounter = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 14px;
  padding: ${theme.spacing.md}px;
`;

const ViewerNav = styled.View`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  flex-direction: row;
  justify-content: space-between;
  padding: ${theme.spacing.md}px;
`;

const ViewerNavButton = styled.Pressable<{ disabled?: boolean }>`
  opacity: ${(props) => (props.disabled ? 0.3 : 1)};
  padding: ${theme.spacing.md}px;
`;

const ViewerNavLabel = styled.Text`
  color: ${theme.colors.primary};
  font-size: 16px;
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

export default function BobinasScreen() {
  const insets = useSafeAreaInsets();
  const { activeVehicle } = useVehicles();
  const [changedOn, setChangedOn] = useState(todayLocalIso());
  const [odometerKm, setOdometerKm] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [history, setHistory] = useState<IgnitionCoilChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<string[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  const loadHistory = useCallback(async () => {
    if (!activeVehicle) {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await listIgnitionCoilChanges(activeVehicle.id);
      setHistory(rows);
    } catch (error) {
      console.error('Failed to load ignition coil changes', error);
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

  async function appendPhotos(sourceUris: string[]) {
    const remaining = MAX_PHOTOS - photoUris.length;
    if (remaining <= 0) {
      return;
    }

    const selected = sourceUris.slice(0, remaining);
    const persisted: string[] = [];

    try {
      for (const uri of selected) {
        persisted.push(await persistIgnitionCoilPhoto(uri));
      }
      setPhotoUris((current) => [...current, ...persisted]);
    } catch (error) {
      deleteIgnitionCoilPhoto(persisted[0]);
      deleteIgnitionCoilPhoto(persisted[1]);
      console.error('Failed to persist ignition coil photos', error);
      Alert.alert('Atenção', 'Não foi possível salvar a foto selecionada.');
    }
  }

  async function pickFromLibrary() {
    if (isPickingPhoto || photoUris.length >= MAX_PHOTOS) {
      return;
    }

    setIsPickingPhoto(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Atenção', 'Permissão para acessar as fotos é necessária.');
        return;
      }

      const remaining = MAX_PHOTOS - photoUris.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: remaining > 1,
        selectionLimit: remaining,
        quality: 0.8,
      });

      if (!result.canceled) {
        await appendPhotos(result.assets.map((asset) => asset.uri));
      }
    } catch (error) {
      console.error('Failed to pick image from library', error);
      Alert.alert('Atenção', 'Não foi possível abrir a galeria.');
    } finally {
      setIsPickingPhoto(false);
    }
  }

  async function pickFromCamera() {
    if (isPickingPhoto || photoUris.length >= MAX_PHOTOS) {
      return;
    }

    setIsPickingPhoto(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Atenção', 'Permissão para usar a câmera é necessária.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled) {
        await appendPhotos(result.assets.map((asset) => asset.uri));
      }
    } catch (error) {
      console.error('Failed to pick image from camera', error);
      Alert.alert('Atenção', 'Não foi possível abrir a câmera.');
    } finally {
      setIsPickingPhoto(false);
    }
  }

  function removeDraftPhoto(index: number) {
    const uri = photoUris[index];
    if (!uri) {
      return;
    }
    deleteIgnitionCoilPhoto(uri);
    setPhotoUris((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function resetForm() {
    setOdometerKm('');
    setPhotoUris([]);
    setChangedOn(todayLocalIso());
  }

  async function handleSubmit() {
    if (!activeVehicle || isSubmitting) {
      return;
    }

    const km = Number(odometerKm.replace(/\D/g, ''));
    setIsSubmitting(true);
    try {
      await createIgnitionCoilChange({
        vehicleId: activeVehicle.id,
        changedOn,
        odometerKm: km,
        photoUri1: photoUris[0] ?? null,
        photoUri2: photoUris[1] ?? null,
      });
      resetForm();
      await loadHistory();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar a troca de bobinas.';
      Alert.alert('Atenção', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openPhotoViewer(photos: string[], index: number) {
    setViewerPhotos(photos);
    setViewerIndex(index);
  }

  function closePhotoViewer() {
    setViewerPhotos(null);
    setViewerIndex(0);
  }

  function handleDelete(item: IgnitionCoilChange) {
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
                await deleteIgnitionCoilChange(item.id, activeVehicle.id);
                await loadHistory();
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : 'Não foi possível apagar a troca de bobinas.';
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

  const canAddPhotos = photoUris.length < MAX_PHOTOS && !isSubmitting && !isPickingPhoto;

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

          <Label>Fotos (opcional)</Label>
          <Hint>Até 2 fotos. Você pode tirar da câmera ou escolher da galeria.</Hint>

          {photoUris.length > 0 ? (
            <PhotoPreviewRow>
              {photoUris.map((uri, index) => (
                <PhotoPreviewWrap key={uri}>
                  <PhotoThumb source={{ uri }} resizeMode="cover" />
                  <RemovePhotoButton
                    disabled={isSubmitting}
                    onPress={() => removeDraftPhoto(index)}
                  >
                    <RemovePhotoLabel>Remover</RemovePhotoLabel>
                  </RemovePhotoButton>
                </PhotoPreviewWrap>
              ))}
            </PhotoPreviewRow>
          ) : null}

          {canAddPhotos ? (
            <PhotoActions>
              <SecondaryButton disabled={!canAddPhotos} onPress={pickFromLibrary}>
                <SecondaryButtonLabel>
                  {isPickingPhoto ? 'Abrindo...' : 'Galeria'}
                </SecondaryButtonLabel>
              </SecondaryButton>
              <SecondaryButton disabled={!canAddPhotos} onPress={pickFromCamera}>
                <SecondaryButtonLabel>
                  {isPickingPhoto ? 'Abrindo...' : 'Câmera'}
                </SecondaryButtonLabel>
              </SecondaryButton>
            </PhotoActions>
          ) : null}

          <SubmitButton disabled={isSubmitting || !activeVehicle} onPress={handleSubmit}>
            <SubmitLabel>{isSubmitting ? 'Salvando...' : 'Salvar troca'}</SubmitLabel>
          </SubmitButton>

          <HistoryTitle>Histórico</HistoryTitle>
          {isLoading ? (
            <EmptyText>Carregando...</EmptyText>
          ) : history.length === 0 ? (
            <EmptyText>Nenhuma troca registrada.</EmptyText>
          ) : (
            history.map((item) => {
              const photos = getIgnitionCoilChangePhotoUris(item);
              return (
                <HistoryItem key={item.id}>
                  <HistoryDate>{formatDisplayDate(item.changedOn)}</HistoryDate>
                  <HistoryMeta>{formatKm(item.odometerKm)}</HistoryMeta>
                  {photos.length > 0 ? (
                    <HistoryPhotosRow>
                      {photos.map((uri, index) => (
                        <Pressable key={uri} onPress={() => openPhotoViewer(photos, index)}>
                          <HistoryPhotoThumb source={{ uri }} resizeMode="cover" />
                        </Pressable>
                      ))}
                    </HistoryPhotosRow>
                  ) : null}
                  <DeleteButton
                    disabled={deletingId !== null}
                    onPress={() => handleDelete(item)}
                  >
                    <DeleteLabel>
                      {deletingId === item.id ? 'Apagando...' : 'Apagar'}
                    </DeleteLabel>
                  </DeleteButton>
                </HistoryItem>
              );
            })
          )}
        </Content>
      </KeyboardAvoidingView>

      <Modal
        visible={viewerPhotos !== null}
        transparent
        animationType="fade"
        onRequestClose={closePhotoViewer}
      >
        <ViewerBackdrop>
          <ViewerTopBar style={{ paddingTop: insets.top }}>
            <Pressable onPress={closePhotoViewer}>
              <ViewerClose>Fechar</ViewerClose>
            </Pressable>
            {viewerPhotos && viewerPhotos.length > 1 ? (
              <ViewerCounter>
                {viewerIndex + 1}/{viewerPhotos.length}
              </ViewerCounter>
            ) : (
              <View />
            )}
          </ViewerTopBar>

          {viewerPhotos?.[viewerIndex] ? (
            <ViewerImage
              source={{ uri: viewerPhotos[viewerIndex] }}
              resizeMode="contain"
            />
          ) : null}

          {viewerPhotos && viewerPhotos.length > 1 ? (
            <ViewerNav style={{ paddingBottom: insets.bottom + theme.spacing.md }}>
              <ViewerNavButton
                disabled={viewerIndex === 0}
                onPress={() => setViewerIndex((current) => Math.max(0, current - 1))}
              >
                <ViewerNavLabel>Anterior</ViewerNavLabel>
              </ViewerNavButton>
              <ViewerNavButton
                disabled={viewerIndex >= viewerPhotos.length - 1}
                onPress={() =>
                  setViewerIndex((current) =>
                    Math.min(viewerPhotos.length - 1, current + 1),
                  )
                }
              >
                <ViewerNavLabel>Próxima</ViewerNavLabel>
              </ViewerNavButton>
            </ViewerNav>
          ) : null}
        </ViewerBackdrop>
      </Modal>
    </Screen>
  );
}
