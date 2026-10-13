import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlateHeader } from '../../src/components/PlateHeader';
import { theme } from '../../src/theme/theme';
import { useVehicles } from '../../src/vehicles/VehicleContext';

export default function AppLayout() {
  const insets = useSafeAreaInsets();
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

  if (vehicles.length === 0) {
    return <Redirect href="/" />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingBottom: insets.bottom,
      }}
    >
      <PlateHeader />
      <View style={{ flex: 1 }}>
        <Stack
          initialRouteName="home"
          screenOptions={{
            headerShown: true,
            animation: 'fade',
            animationDuration: 300,
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.primary,
            headerTitleStyle: { color: theme.colors.text, fontWeight: '600' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="home" options={{ title: 'Car Services', headerShown: false }} />
          <Stack.Screen name="avisos" options={{ title: 'Avisos' }} />
          <Stack.Screen name="orcamentos" options={{ title: 'Orçamentos' }} />
          <Stack.Screen name="orcamento" options={{ title: 'Orçamento' }} />
          <Stack.Screen name="gastos" options={{ title: 'Gastos' }} />
          <Stack.Screen name="ocorrencias" options={{ title: 'Ocorrências' }} />
          <Stack.Screen name="ocorrencia" options={{ title: 'Ocorrência' }} />
          <Stack.Screen name="oleo-motor" options={{ title: 'Óleo do motor' }} />
          <Stack.Screen name="oleo-cambio" options={{ title: 'Óleo de câmbio' }} />
          <Stack.Screen name="arrefecimento" options={{ title: 'Arrefecimento' }} />
          <Stack.Screen name="velas" options={{ title: 'Velas' }} />
          <Stack.Screen name="bobinas" options={{ title: 'Bobinas' }} />
          <Stack.Screen name="correias" options={{ title: 'Correias' }} />
          <Stack.Screen name="filtro-combustivel" options={{ title: 'Filtro de combustível' }} />
          <Stack.Screen name="filtro-ar" options={{ title: 'Filtro de ar' }} />
          <Stack.Screen name="suspensao-dianteira" options={{ title: 'Suspensão dianteira' }} />
          <Stack.Screen name="suspensao-traseira" options={{ title: 'Suspensão traseira' }} />
          <Stack.Screen name="freios" options={{ title: 'Freios' }} />
        </Stack>
      </View>
    </View>
  );
}
