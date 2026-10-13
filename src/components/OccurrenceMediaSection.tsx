import { useEventListener } from 'expo';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  deleteOccurrenceFile,
  persistOccurrenceFile,
  type OccurrenceMediaKind,
} from '../db/occurrences';
import styled from '../theme/styled';
import { theme } from '../theme/theme';

export type DraftMediaItem = {
  key: string;
  id: number | null;
  kind: OccurrenceMediaKind;
  uri: string;
};

type OccurrenceMediaSectionProps = {
  items: DraftMediaItem[];
  onChange: (update: (current: DraftMediaItem[]) => DraftMediaItem[]) => void;
  disabled?: boolean;
  canRecord: boolean;
  onRecordingChange: (recording: boolean) => void;
};

const KIND_LABEL: Record<OccurrenceMediaKind, string> = {
  photo: 'Foto',
  audio: 'Áudio',
  video: 'Vídeo',
};

const Hint = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 13px;
  line-height: 18px;
  margin-bottom: ${theme.spacing.md}px;
`;

const ActionGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const ActionButton = styled.Pressable<{ disabled?: boolean }>`
  flex-grow: 1;
  flex-basis: 46%;
  background-color: ${theme.colors.surface};
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: #2a2a2a;
  padding: ${theme.spacing.md}px;
  align-items: center;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
`;

const ActionLabel = styled.Text`
  color: ${theme.colors.text};
  font-size: 14px;
  font-weight: 700;
  text-align: center;
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
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.sm}px;
`;

const ItemKind = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 13px;
  font-weight: 700;
`;

const RemoveLabel = styled.Text`
  color: #ff6b6b;
  font-size: 13px;
  font-weight: 700;
`;

const PhotoThumb = styled.Image`
  width: 100%;
  height: 180px;
  border-radius: ${theme.radii.md}px;
  background-color: #000000;
`;

const PlayButton = styled.Pressable`
  background-color: ${theme.colors.background};
  border-radius: ${theme.radii.md}px;
  padding: ${theme.spacing.md}px;
  align-items: center;
`;

const PlayLabel = styled.Text`
  color: ${theme.colors.primary};
  font-size: 14px;
  font-weight: 700;
`;

const Timeline = styled.View`
  margin-top: ${theme.spacing.sm}px;
`;

const TimeRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.sm}px;
`;

const TimeLabel = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 12px;
`;

const TrackHit = styled.View`
  height: 28px;
  justify-content: center;
`;

const Track = styled.View`
  height: 4px;
  border-radius: 2px;
  background-color: #2a2a2a;
  overflow: hidden;
`;

const TrackFill = styled.View`
  height: 4px;
  background-color: ${theme.colors.primary};
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
  padding-horizontal: ${theme.spacing.md}px;
`;

const ViewerClose = styled.Text`
  color: ${theme.colors.primary};
  font-size: 16px;
  font-weight: 700;
`;

function createDraft(kind: OccurrenceMediaKind, uri: string): DraftMediaItem {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: null,
    kind,
    uri,
  };
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function isAtEnd(currentTime: number, duration: number): boolean {
  return duration > 0 && currentTime >= duration - 0.05;
}

type MediaTimelineProps = {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
};

function MediaTimeline({ currentTime, duration, onSeek }: MediaTimelineProps) {
  const widthRef = useRef(0);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const durationRef = useRef(duration);
  const onSeekRef = useRef(onSeek);
  const canSeek = Number.isFinite(duration) && duration > 0;

  useEffect(() => {
    durationRef.current = duration;
    onSeekRef.current = onSeek;
  }, [duration, onSeek]);

  useEffect(() => {
    if (pendingSeekRef.current === null) {
      return;
    }
    if (Math.abs(currentTime - pendingSeekRef.current) < 0.4) {
      pendingSeekRef.current = null;
      setScrubTime(null);
    }
  }, [currentTime]);

  function secondsFromX(x: number): number {
    const width = widthRef.current;
    const total = durationRef.current;
    if (width <= 0 || !Number.isFinite(total) || total <= 0) {
      return 0;
    }
    const ratio = Math.min(Math.max(x / width, 0), 1);
    return ratio * total;
  }

  const shown = scrubTime ?? (Number.isFinite(currentTime) ? currentTime : 0);
  const progress = canSeek ? Math.min(Math.max(shown / duration, 0), 1) : 0;

  return (
    <Timeline>
      <TimeRow>
        <TimeLabel>{formatClock(shown)}</TimeLabel>
        <TimeLabel>{formatClock(canSeek ? duration : 0)}</TimeLabel>
      </TimeRow>
      <TrackHit
        onLayout={(event) => {
          widthRef.current = event.nativeEvent.layout.width;
        }}
        onStartShouldSetResponder={() => canSeek}
        onMoveShouldSetResponder={() => canSeek}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => {
          pendingSeekRef.current = null;
          setScrubTime(secondsFromX(event.nativeEvent.locationX));
        }}
        onResponderMove={(event) => {
          setScrubTime(secondsFromX(event.nativeEvent.locationX));
        }}
        onResponderRelease={(event) => {
          const seconds = secondsFromX(event.nativeEvent.locationX);
          pendingSeekRef.current = seconds;
          setScrubTime(seconds);
          onSeekRef.current(seconds);
        }}
        onResponderTerminate={() => {
          if (pendingSeekRef.current === null) {
            setScrubTime(null);
          }
        }}
      >
        <Track>
          <TrackFill style={{ width: `${progress * 100}%` }} />
        </Track>
      </TrackHit>
    </Timeline>
  );
}

function AudioClip({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  async function toggle() {
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      if (status.playing) {
        player.pause();
        return;
      }
      if (status.didJustFinish || isAtEnd(status.currentTime, status.duration)) {
        await player.seekTo(0);
      }
      player.play();
    } catch (error) {
      console.error('Failed to play occurrence audio', error);
      Alert.alert('Atenção', 'Não foi possível reproduzir o áudio.');
    }
  }

  return (
    <>
      <PlayButton onPress={() => void toggle()}>
        <PlayLabel>{status.playing ? 'Pausar' : 'Ouvir'}</PlayLabel>
      </PlayButton>
      <MediaTimeline
        currentTime={status.currentTime}
        duration={status.duration}
        onSeek={(seconds) => {
          void player.seekTo(seconds);
        }}
      />
    </>
  );
}

type AudioCaptureProps = {
  onFinished: (uri: string | null) => void;
  onFailed: () => void;
};

function AudioCapture({ onFinished, onFailed }: AudioCaptureProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const activeRef = useRef(true);
  const onFinishedRef = useRef(onFinished);
  const onFailedRef = useRef(onFailed);

  useEffect(() => {
    onFinishedRef.current = onFinished;
    onFailedRef.current = onFailed;
  }, [onFinished, onFailed]);

  const finishRecording = useCallback(async () => {
    if (finishedRef.current || !startedRef.current) {
      return;
    }
    finishedRef.current = true;
    try {
      await recorder.stop();
      if (!activeRef.current) {
        return;
      }
      onFinishedRef.current(recorder.uri);
    } catch (error) {
      console.error('Failed to stop occurrence recording', error);
      if (!activeRef.current) {
        return;
      }
      Alert.alert('Atenção', 'Não foi possível salvar a gravação.');
      onFailedRef.current();
    }
  }, [recorder]);

  const finishRef = useRef(finishRecording);

  useEffect(() => {
    finishRef.current = finishRecording;
  }, [finishRecording]);

  useEffect(() => {
    let active = true;

    async function start() {
      try {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!active) {
          return;
        }
        if (!permission.granted) {
          Alert.alert('Atenção', 'Permissão do microfone é necessária para gravar áudio.');
          onFailedRef.current();
          return;
        }

        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
        if (!active) {
          return;
        }

        await recorder.prepareToRecordAsync();
        if (!active) {
          return;
        }

        recorder.record();
        startedRef.current = true;
        if (stopRequestedRef.current) {
          await finishRef.current();
        }
      } catch (error) {
        console.error('Failed to start occurrence recording', error);
        if (!active) {
          return;
        }
        Alert.alert(
          'Atenção',
          'Não foi possível gravar o áudio. Você ainda pode escolher um arquivo.',
        );
        onFailedRef.current();
      }
    }

    void start();

    return () => {
      active = false;
      activeRef.current = false;
      if (finishedRef.current || !startedRef.current) {
        return;
      }
      finishedRef.current = true;
      try {
        void recorder.stop().catch((error: unknown) => {
          console.error('Failed to stop occurrence recording', error);
        });
      } catch (error) {
        console.error('Failed to stop occurrence recording', error);
      }
    };
  }, [recorder]);

  return (
    <ActionButton
      onPress={() => {
        if (!startedRef.current) {
          stopRequestedRef.current = true;
          return;
        }
        void finishRef.current();
      }}
    >
      <ActionLabel>Parar áudio</ActionLabel>
    </ActionButton>
  );
}

function VideoClip({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.timeUpdateEventInterval = 0.25;
  });
  const { width } = useWindowDimensions();
  const videoWidth = Math.max(width - theme.spacing.xl * 2 - theme.spacing.md * 2, 160);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    setPosition(currentTime);
    if (player.duration > 0) {
      setDuration(player.duration);
    }
  });

  useEventListener(player, 'sourceLoad', ({ duration: loadedDuration }) => {
    if (loadedDuration > 0) {
      setDuration(loadedDuration);
    }
  });

  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    setPlaying(isPlaying);
  });

  useEventListener(player, 'playToEnd', () => {
    setEnded(true);
  });

  function toggle() {
    if (playing) {
      player.pause();
      return;
    }
    if (ended || isAtEnd(position, duration)) {
      // expo-video seeks by assigning currentTime on the native player.
      // eslint-disable-next-line react-hooks/immutability
      player.currentTime = 0;
      setPosition(0);
      setEnded(false);
    }
    player.play();
  }

  function seek(seconds: number) {
    // expo-video seeks by assigning currentTime on the native player.
    // eslint-disable-next-line react-hooks/immutability
    player.currentTime = seconds;
    if (!isAtEnd(seconds, duration)) {
      setEnded(false);
    }
  }

  return (
    <>
      <VideoView
        player={player}
        nativeControls={false}
        contentFit="contain"
        style={{
          width: videoWidth,
          height: 180,
          backgroundColor: '#000000',
          borderRadius: theme.radii.md,
        }}
      />
      <PlayButton onPress={toggle} style={{ marginTop: theme.spacing.sm }}>
        <PlayLabel>{playing ? 'Pausar' : 'Reproduzir'}</PlayLabel>
      </PlayButton>
      <MediaTimeline currentTime={position} duration={duration} onSeek={seek} />
    </>
  );
}

export function OccurrenceMediaSection({
  items,
  onChange,
  disabled = false,
  canRecord,
  onRecordingChange,
}: OccurrenceMediaSectionProps) {
  const insets = useSafeAreaInsets();
  const [isBusy, setIsBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  async function appendFiles(sourceUris: string[], kind: OccurrenceMediaKind) {
    const created: DraftMediaItem[] = [];
    try {
      for (const uri of sourceUris) {
        const persisted = await persistOccurrenceFile(uri, kind);
        created.push(createDraft(kind, persisted));
      }
      if (created.length > 0) {
        onChange((current) => [...current, ...created]);
      }
    } catch (error) {
      for (const item of created) {
        deleteOccurrenceFile(item.uri);
      }
      console.error('Failed to persist occurrence media', error);
      Alert.alert('Atenção', 'Não foi possível salvar o arquivo.');
    }
  }

  function removeItem(item: DraftMediaItem) {
    if (item.id === null) {
      deleteOccurrenceFile(item.uri);
    }
    onChange((current) => current.filter((entry) => entry.key !== item.key));
  }

  async function pickPhotos(fromCamera: boolean) {
    if (disabled || isBusy || isRecording) {
      return;
    }

    setIsBusy(true);
    try {
      if (fromCamera) {
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
          await appendFiles(
            result.assets.map((asset) => asset.uri),
            'photo',
          );
        }
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Atenção', 'Permissão para acessar as fotos é necessária.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 0,
        quality: 0.8,
      });
      if (!result.canceled) {
        await appendFiles(
          result.assets.map((asset) => asset.uri),
          'photo',
        );
      }
    } catch (error) {
      console.error('Failed to pick occurrence photo', error);
      Alert.alert('Atenção', 'Não foi possível abrir as fotos.');
    } finally {
      setIsBusy(false);
    }
  }

  async function pickVideos(fromCamera: boolean) {
    if (disabled || isBusy || isRecording) {
      return;
    }

    setIsBusy(true);
    try {
      if (fromCamera) {
        const [cameraPermission, microphone] = await Promise.all([
          ImagePicker.requestCameraPermissionsAsync(),
          AudioModule.requestRecordingPermissionsAsync(),
        ]);
        if (!cameraPermission.granted) {
          Alert.alert('Atenção', 'Permissão para usar a câmera é necessária.');
          return;
        }
        if (!microphone.granted && Platform.OS !== 'web') {
          Alert.alert('Atenção', 'Permissão do microfone é necessária para gravar vídeo.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['videos'],
          videoMaxDuration: 0,
        });
        if (!result.canceled) {
          await appendFiles(
            result.assets.map((asset) => asset.uri),
            'video',
          );
        }
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Atenção', 'Permissão para acessar os vídeos é necessária.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: true,
        selectionLimit: 0,
      });
      if (!result.canceled) {
        await appendFiles(
          result.assets.map((asset) => asset.uri),
          'video',
        );
      }
    } catch (error) {
      console.error('Failed to pick occurrence video', error);
      Alert.alert(
        'Atenção',
        fromCamera
          ? 'Não foi possível gravar o vídeo. Você ainda pode escolher um arquivo.'
          : 'Não foi possível abrir os vídeos.',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function pickAudioFile() {
    if (disabled || isBusy || isRecording) {
      return;
    }

    setIsBusy(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'public.audio'],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (picked.canceled) {
        return;
      }
      await appendFiles(
        picked.assets.map((asset) => asset.uri),
        'audio',
      );
    } catch (error) {
      console.error('Failed to pick occurrence audio', error);
      Alert.alert('Atenção', 'Não foi possível escolher o áudio.');
    } finally {
      setIsBusy(false);
    }
  }

  function beginRecording() {
    if (disabled || isBusy || isRecording || !canRecord) {
      return;
    }
    setIsRecording(true);
    onRecordingChange(true);
  }

  async function handleRecordingFinished(uri: string | null) {
    setIsRecording(false);
    onRecordingChange(false);
    if (!uri) {
      Alert.alert('Atenção', 'Não foi possível concluir a gravação.');
      return;
    }

    setIsBusy(true);
    try {
      await appendFiles([uri], 'audio');
    } finally {
      setIsBusy(false);
    }
  }

  function handleRecordingFailed() {
    setIsRecording(false);
    onRecordingChange(false);
  }

  const actionsDisabled = disabled || isBusy;
  const recordDisabled = actionsDisabled || !canRecord;

  return (
    <>
      {Platform.OS === 'web' ? (
        <Hint>
          Neste navegador, gravar pode não estar disponível. Escolher arquivos continua funcionando.
        </Hint>
      ) : (
        <Hint>Grave na hora ou escolha arquivos já existentes. Não há limite de quantidade.</Hint>
      )}

      <ActionGrid>
        <ActionButton disabled={actionsDisabled || isRecording} onPress={() => void pickPhotos(true)}>
          <ActionLabel>Tirar foto</ActionLabel>
        </ActionButton>
        <ActionButton disabled={actionsDisabled || isRecording} onPress={() => void pickPhotos(false)}>
          <ActionLabel>Galeria de fotos</ActionLabel>
        </ActionButton>
        <ActionButton disabled={actionsDisabled || isRecording} onPress={() => void pickVideos(true)}>
          <ActionLabel>Gravar vídeo</ActionLabel>
        </ActionButton>
        <ActionButton disabled={actionsDisabled || isRecording} onPress={() => void pickVideos(false)}>
          <ActionLabel>Galeria de vídeos</ActionLabel>
        </ActionButton>
        {isRecording ? (
          <AudioCapture onFinished={(uri) => void handleRecordingFinished(uri)} onFailed={handleRecordingFailed} />
        ) : (
          <ActionButton disabled={recordDisabled} onPress={beginRecording}>
            <ActionLabel>Gravar áudio</ActionLabel>
          </ActionButton>
        )}
        <ActionButton disabled={actionsDisabled || isRecording} onPress={() => void pickAudioFile()}>
          <ActionLabel>Escolher áudio</ActionLabel>
        </ActionButton>
      </ActionGrid>

      {items.map((item) => (
        <ItemCard key={item.key}>
          <ItemHeader>
            <ItemKind>{KIND_LABEL[item.kind]}</ItemKind>
            <Pressable disabled={disabled || isRecording} onPress={() => removeItem(item)}>
              <RemoveLabel>Remover</RemoveLabel>
            </Pressable>
          </ItemHeader>
          {item.kind === 'photo' ? (
            <Pressable onPress={() => setViewerUri(item.uri)}>
              <PhotoThumb source={{ uri: item.uri }} resizeMode="cover" />
            </Pressable>
          ) : null}
          {item.kind === 'audio' ? <AudioClip uri={item.uri} /> : null}
          {item.kind === 'video' ? <VideoClip uri={item.uri} /> : null}
        </ItemCard>
      ))}

      <Modal visible={viewerUri !== null} transparent animationType="fade" onRequestClose={() => setViewerUri(null)}>
        <ViewerBackdrop>
          <ViewerTopBar style={{ paddingTop: insets.top + theme.spacing.sm }}>
            <Pressable onPress={() => setViewerUri(null)}>
              <ViewerClose>Fechar</ViewerClose>
            </Pressable>
          </ViewerTopBar>
          {viewerUri ? <ViewerImage source={{ uri: viewerUri }} resizeMode="contain" /> : null}
        </ViewerBackdrop>
      </Modal>
    </>
  );
}
