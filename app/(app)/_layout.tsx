import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { PlateHeader } from '../../src/components/PlateHeader';
import { theme } from '../../src/theme/theme';
import { useVehicles } from '../../src/vehicles/VehicleContext';

export default function AppLayout() {
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
    <>
      <PlateHeader />
      <Stack
        initialRouteName="home"
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { color: theme.colors.text, fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="home" options={{ title: 'Car Services', headerShown: false }} />
        <Stack.Screen name="avisos" options={{ title: 'Avisos' }} />
        <Stack.Screen name="oleo-motor" options={{ title: 'Óleo do motor' }} />
        <Stack.Screen name="oleo-cambio" options={{ title: 'Óleo de câmbio' }} />
        <Stack.Screen name="arrefecimento" options={{ title: 'Arrefecimento' }} />
        <Stack.Screen
          name="velas-bobinas-correias"
          options={{ title: 'Velas, bobinas e correias' }}
        />
      </Stack>
    </>
  );
}
