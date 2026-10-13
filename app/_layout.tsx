import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';

import { openDatabase } from '../src/db';
import { syncMaintenanceNotifications } from '../src/notifications/scheduleAlerts';
import { useNotificationObserver } from '../src/notifications/useNotificationObserver';
import { ThemeProvider } from '../src/theme/styled';
import { theme } from '../src/theme/theme';
import { VehicleProvider } from '../src/vehicles/VehicleContext';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useNotificationObserver(isReady);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void syncMaintenanceNotifications();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'background') {
        void syncMaintenanceNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isReady]);

  useEffect(() => {
    let isMounted = true;

    openDatabase()
      .then(() => {
        if (isMounted) {
          setIsReady(true);
        }
      })
      .catch((error) => {
        console.error('Failed to open database', error);
        if (isMounted) {
          setIsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isReady) {
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

  return (
    <ThemeProvider theme={theme}>
      <VehicleProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            animationDuration: 300,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        />
      </VehicleProvider>
    </ThemeProvider>
  );
}
