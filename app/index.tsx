import { Redirect, router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { VehicleForm } from '../src/components/VehicleForm';
import styled from '../src/theme/styled';
import { theme } from '../src/theme/theme';
import { useVehicles } from '../src/vehicles/VehicleContext';

const ImportButton = styled(Pressable)`
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: #2a2a2a;
  padding: ${theme.spacing.md}px;
  align-items: center;
`;

const ImportLabel = styled.Text`
  color: ${theme.colors.text};
  font-size: 16px;
  font-weight: 600;
`;

export default function GateScreen() {
  const { vehicles, isLoading } = useVehicles();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (vehicles.length > 0) {
    return <Redirect href="/home" />;
  }

  return (
    <VehicleForm
      title="Cadastre seu veículo"
      subtitle="Informe marca, modelo e placa para começar a usar o Car Services."
      submitLabel="Salvar veículo"
      onSuccess={() => router.replace('/home')}
      footer={
        <ImportButton onPress={() => router.push('/configuracoes')}>
          <ImportLabel>Importar backup</ImportLabel>
        </ImportButton>
      }
    />
  );
}
