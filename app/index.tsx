import { Redirect, router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { VehicleForm } from '../src/components/VehicleForm';
import { theme } from '../src/theme/theme';
import { useVehicles } from '../src/vehicles/VehicleContext';

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
    />
  );
}
