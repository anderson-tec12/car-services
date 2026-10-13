import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { maintenanceAvisosUrl } from './scheduleAlerts';

function openAvisos(notification: Notifications.Notification) {
  const url = notification.request.content.data?.url;
  if (url === maintenanceAvisosUrl) {
    router.push(maintenanceAvisosUrl);
  }
}

export function useNotificationObserver(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') {
      return;
    }

    const response = Notifications.getLastNotificationResponse();
    if (response?.notification) {
      openAvisos(response.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((event) => {
      openAvisos(event.notification);
    });

    return () => {
      subscription.remove();
    };
  }, [enabled]);
}
