import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { exportBackup } from '../src/backup/exportBackup';
import { applyImport, previewImport, type ImportPreview } from '../src/backup/importBackup';
import type { Vehicle } from '../src/db/vehicles';
import styled from '../src/theme/styled';
import { theme } from '../src/theme/theme';
import { useVehicles } from '../src/vehicles/VehicleContext';

const Screen = styled(SafeAreaView)`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const Header = styled.View`
  padding: ${theme.spacing.xl}px ${theme.spacing.xl}px ${theme.spacing.md}px;
`;

const Title = styled.Text`
  color: ${theme.colors.primary};
  font-size: 28px;
  font-weight: 700;
  margin-bottom: ${theme.spacing.sm}px;
`;

const SectionTitle = styled.Text`
  color: ${theme.colors.text};
  font-size: 18px;
  font-weight: 700;
  margin-bottom: ${theme.spacing.sm}px;
`;

const Subtitle = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 16px;
  line-height: 24px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const Card = styled.Pressable`
  background-color: ${theme.colors.surface};
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: #2a2a2a;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const Plate = styled.Text`
  color: ${theme.colors.primary};
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: ${theme.spacing.sm}px;
`;

const Meta = styled.Text`
  color: ${theme.colors.text};
  font-size: 15px;
`;

const Actions = styled.View`
  gap: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.xl}px;
`;

const PrimaryButton = styled.Pressable<{ disabled?: boolean }>`
  background-color: ${theme.colors.primary};
  border-radius: ${theme.radii.md}px;
  padding: ${theme.spacing.md}px;
  align-items: center;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
`;

const SecondaryButton = styled.Pressable<{ disabled?: boolean }>`
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: #2a2a2a;
  padding: ${theme.spacing.md}px;
  align-items: center;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
`;

const PrimaryLabel = styled.Text`
  color: ${theme.colors.background};
  font-size: 16px;
  font-weight: 700;
`;

const SecondaryLabel = styled.Text`
  color: ${theme.colors.text};
  font-size: 16px;
  font-weight: 600;
`;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function downloadOnWeb(filename: string, contents: string): void {
  const webDocument = globalThis.document;
  if (!webDocument) {
    throw new Error('Não foi possível baixar o arquivo neste navegador.');
  }

  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = webDocument.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  webDocument.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function deliverBackup(result: { uri: string; filename: string; contents: string }): Promise<void> {
  if (Platform.OS === 'web') {
    downloadOnWeb(result.filename, result.contents);
    return;
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('O compartilhamento não está disponível neste aparelho.');
  }

  await Sharing.shareAsync(result.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Exportar backup',
    UTI: 'public.json',
  });
}

function importMessage(preview: ImportPreview): string {
  const lines = [
    preview.replacements.length > 0
      ? `Serão substituídos: ${preview.replacements.join(', ')}.`
      : 'Nenhum veículo existente será substituído.',
  ];
  if (preview.additions.length > 0) {
    lines.push(`Novos: ${preview.additions.join(', ')}.`);
  }
  lines.push('O histórico e as fotos das placas substituídas serão trocados pelos dados do arquivo.');
  return lines.join('\n');
}

export default function SettingsScreen() {
  const { vehicles, refresh } = useVehicles();
  const [isBusy, setIsBusy] = useState(false);

  async function handleExport(vehicleId?: number) {
    if (isBusy) {
      return;
    }

    setIsBusy(true);
    try {
      const result = await exportBackup(vehicleId);
      await deliverBackup(result);
    } catch (error) {
      Alert.alert('Não foi possível exportar', errorMessage(error, 'Tente novamente.'));
    } finally {
      setIsBusy(false);
    }
  }

  function confirmImport(preview: ImportPreview, hadVehicles: boolean) {
    Alert.alert('Importar backup', importMessage(preview), [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Importar',
        style: 'destructive',
        onPress: () => {
          void runImport(preview, hadVehicles);
        },
      },
    ]);
  }

  async function runImport(preview: ImportPreview, hadVehicles: boolean) {
    setIsBusy(true);
    try {
      await applyImport(preview.backup);
      await refresh();
      Alert.alert('Importação concluída', 'Os dados foram restaurados.');
      if (!hadVehicles) {
        router.replace('/home');
      }
    } catch (error) {
      Alert.alert('Não foi possível importar', errorMessage(error, 'Tente novamente.'));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleImport() {
    if (isBusy) {
      return;
    }

    setIsBusy(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'public.json'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled) {
        return;
      }

      const asset = picked.assets[0];
      const raw = asset.file ? await asset.file.text() : await new ExpoFile(asset.uri).text();
      const preview = await previewImport(raw);
      confirmImport(preview, vehicles.length > 0);
    } catch (error) {
      Alert.alert('Não foi possível importar', errorMessage(error, 'Tente novamente.'));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        <Header>
          <Title>Configurações</Title>
          <Subtitle>Exporte ou importe o histórico completo dos veículos, incluindo as fotos.</Subtitle>
          <SectionTitle>Exportar</SectionTitle>
          <Subtitle>Gera um arquivo JSON para guardar ou enviar a outro aparelho.</Subtitle>
        </Header>

        <Actions style={{ paddingHorizontal: theme.spacing.xl }}>
          <PrimaryButton disabled={isBusy || vehicles.length === 0} onPress={() => handleExport()}>
            <PrimaryLabel>
              {isBusy ? 'Aguarde...' : 'Exportar todos os veículos'}
            </PrimaryLabel>
          </PrimaryButton>

          {vehicles.map((vehicle) => (
            <VehicleExportCard
              key={vehicle.id}
              vehicle={vehicle}
              disabled={isBusy}
              onPress={() => handleExport(vehicle.id)}
            />
          ))}
        </Actions>

        <Header>
          <SectionTitle>Importar</SectionTitle>
          <Subtitle>
            Se a placa já existir, o veículo e todo o histórico dele são substituídos pelos dados do arquivo.
          </Subtitle>
          <PrimaryButton disabled={isBusy} onPress={handleImport}>
            <PrimaryLabel>{isBusy ? 'Aguarde...' : 'Importar arquivo'}</PrimaryLabel>
          </PrimaryButton>
        </Header>

        <Actions style={{ paddingHorizontal: theme.spacing.xl }}>
          <SecondaryButton disabled={isBusy} onPress={() => router.back()}>
            <SecondaryLabel>Voltar</SecondaryLabel>
          </SecondaryButton>
        </Actions>
      </ScrollView>
    </Screen>
  );
}

function VehicleExportCard({
  vehicle,
  disabled,
  onPress,
}: {
  vehicle: Vehicle;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Card disabled={disabled} onPress={onPress}>
      <Plate>{vehicle.plate}</Plate>
      <Meta>
        Exportar {vehicle.brand} {vehicle.model}
      </Meta>
    </Card>
  );
}
