import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getDatabase } from '../db';
import { formatDisplayDate } from '../db/engineOilChanges';
import { collectDueItems, type DueItem } from './collectDueItems';

const WARNING_DAYS = 30;
const HORIZON_DAYS = 365;
const NOTIFY_HOUR = 9;
const NOTIFY_MINUTE = 0;
const CHANNEL_ID = 'manutencao';
const OVERDUE_ID = 'overdue-digest';
const MAX_ONE_SHOTS = 60;
const DIGEST_PREVIEW = 3;
const AVISOS_URL = '/avisos';

type OneShot = {
  identifier: string;
  date: Date;
  title: string;
  body: string;
  recordLog: boolean;
};

let askedThisSession = false;
let syncChain: Promise<void> = Promise.resolve();

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function parseLocalIso(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map((part) => Number(part));
  return new Date(year, month - 1, day);
}

function formatLocalIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(isoDate: string, days: number): string {
  const date = parseLocalIso(isoDate);
  date.setDate(date.getDate() + days);
  return formatLocalIso(date);
}

function atNotifyTime(isoDate: string): Date {
  const date = parseLocalIso(isoDate);
  date.setHours(NOTIFY_HOUR, NOTIFY_MINUTE, 0, 0);
  return date;
}

function lowerFirst(label: string): string {
  return label.charAt(0).toLocaleLowerCase('pt-BR') + label.slice(1);
}

function nextOpportunity(now: Date): Date {
  const todayAtNine = new Date(now);
  todayAtNine.setHours(NOTIFY_HOUR, NOTIFY_MINUTE, 0, 0);
  if (now.getTime() < todayAtNine.getTime()) {
    return todayAtNine;
  }
  return new Date(now.getTime() + 5_000);
}

function soonKey(item: DueItem): string {
  return `soon:${item.key}:${item.nextDueDate}`;
}

function dueKey(item: DueItem): string {
  return `due:${item.key}:${item.nextDueDate}`;
}

function isOwnedIdentifier(identifier: string): boolean {
  return identifier.startsWith('soon:') || identifier.startsWith('due:') || identifier === OVERDUE_ID;
}

async function listLoggedKeys(): Promise<Set<string>> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{ alert_key: string }>(
    'SELECT alert_key FROM alert_notification_log',
  );
  return new Set(rows.map((row) => row.alert_key));
}

async function saveLoggedKeys(keys: Set<string>): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM alert_notification_log');
    for (const key of keys) {
      await db.runAsync('INSERT INTO alert_notification_log (alert_key) VALUES (?)', key);
    }
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Manutenção',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  if (askedThisSession || !current.canAskAgain) {
    return false;
  }

  askedThisSession = true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

function buildOneShots(items: DueItem[], logged: Set<string>, now: Date): OneShot[] {
  const horizon = now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000;
  const shots: OneShot[] = [];

  for (const item of items) {
    if (item.isOverdueByDate) {
      continue;
    }

    const soonAt = atNotifyTime(addDays(item.nextDueDate, -WARNING_DAYS));
    const dueAt = atNotifyTime(item.nextDueDate);
    const soonId = soonKey(item);
    const dueId = dueKey(item);
    const displayDate = formatDisplayDate(item.nextDueDate);

    if (soonAt.getTime() > now.getTime() && soonAt.getTime() <= horizon) {
      shots.push({
        identifier: soonId,
        date: soonAt,
        title: 'Troca próxima',
        body: `${item.label} (${item.plate}) vence em 30 dias, em ${displayDate}.`,
        recordLog: false,
      });
    } else if (
      soonAt.getTime() <= now.getTime() &&
      dueAt.getTime() > now.getTime() &&
      !logged.has(soonId)
    ) {
      shots.push({
        identifier: soonId,
        date: nextOpportunity(now),
        title: 'Troca próxima',
        body: `${item.label} (${item.plate}) vence em ${displayDate}.`,
        recordLog: true,
      });
    }

    if (dueAt.getTime() > now.getTime() && dueAt.getTime() <= horizon) {
      shots.push({
        identifier: dueId,
        date: dueAt,
        title: 'Troca vence hoje',
        body: `O prazo de ${lowerFirst(item.label)} (${item.plate}) vence hoje.`,
        recordLog: false,
      });
    } else if (
      dueAt.getTime() <= now.getTime() &&
      formatLocalIso(dueAt) === formatLocalIso(now) &&
      !logged.has(dueId)
    ) {
      shots.push({
        identifier: dueId,
        date: nextOpportunity(now),
        title: 'Troca vence hoje',
        body: `O prazo de ${lowerFirst(item.label)} (${item.plate}) vence hoje.`,
        recordLog: true,
      });
    }
  }

  shots.sort((left, right) => left.date.getTime() - right.date.getTime());
  return shots;
}

function digestBody(overdue: DueItem[]): string {
  const parts = [...overdue]
    .sort(
      (left, right) =>
        left.nextDueDate.localeCompare(right.nextDueDate) ||
        left.label.localeCompare(right.label, 'pt-BR'),
    )
    .map((item) => `${lowerFirst(item.label)} (${item.plate})`);
  const preview = parts.slice(0, DIGEST_PREVIEW);
  const extra = parts.length - preview.length;
  const list = extra > 0 ? `${preview.join(', ')} e mais ${extra}` : preview.join(', ');
  return `Trocas vencidas: ${list}.`;
}

async function scheduleOneShot(shot: OneShot): Promise<void> {
  const date = shot.date.getTime() <= Date.now() ? new Date(Date.now() + 5_000) : shot.date;
  await Notifications.scheduleNotificationAsync({
    identifier: shot.identifier,
    content: {
      title: shot.title,
      body: shot.body,
      sound: 'default',
      data: { url: AVISOS_URL },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: CHANNEL_ID,
    },
  });
}

async function scheduleOverdueDigest(overdue: DueItem[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = scheduled.find((request) => request.identifier === OVERDUE_ID);
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(OVERDUE_ID);
  }

  if (overdue.length === 0) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: OVERDUE_ID,
    content: {
      title: 'Trocas vencidas',
      body: digestBody(overdue),
      sound: 'default',
      data: { url: AVISOS_URL },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: NOTIFY_HOUR,
      minute: NOTIFY_MINUTE,
      channelId: CHANNEL_ID,
    },
  });
}

async function syncOnce(): Promise<void> {
  const items = await collectDueItems();
  const logged = await listLoggedKeys();
  const currentKeys = new Set(items.flatMap((item) => [soonKey(item), dueKey(item)]));
  const loggedCurrent = new Set([...logged].filter((key) => currentKeys.has(key)));
  const overdue = items.filter((item) => item.isOverdueByDate);
  const needsSchedule =
    buildOneShots(items, loggedCurrent, new Date()).length > 0 || overdue.length > 0;

  if (!needsSchedule) {
    const granted = (await Notifications.getPermissionsAsync()).granted;
    if (granted) {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter((request) => isOwnedIdentifier(request.identifier))
          .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
      );
    }
    await saveLoggedKeys(loggedCurrent);
    return;
  }

  await ensureAndroidChannel();
  const granted = await ensurePermission();
  if (!granted) {
    await saveLoggedKeys(loggedCurrent);
    return;
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const allShots = buildOneShots(items, loggedCurrent, new Date());
  const allShotIds = new Set(allShots.map((shot) => shot.identifier));
  const keptCatchUpCount = scheduled.filter(
    (request) => loggedCurrent.has(request.identifier) && !allShotIds.has(request.identifier),
  ).length;
  const desired = allShots.slice(0, Math.max(0, MAX_ONE_SHOTS - keptCatchUpCount));
  const desiredIds = new Set(desired.map((shot) => shot.identifier));
  const toCancel = scheduled.filter((request) => {
    if (request.identifier === OVERDUE_ID || !isOwnedIdentifier(request.identifier)) {
      return false;
    }
    if (loggedCurrent.has(request.identifier) && !desiredIds.has(request.identifier)) {
      return false;
    }
    return true;
  });

  await Promise.all(
    toCancel.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );

  const stillScheduled = new Set(
    scheduled
      .filter((request) => !toCancel.includes(request))
      .map((request) => request.identifier),
  );
  const recorded = new Set(loggedCurrent);
  for (const shot of desired) {
    if (stillScheduled.has(shot.identifier)) {
      continue;
    }
    await scheduleOneShot(shot);
    if (shot.recordLog) {
      recorded.add(shot.identifier);
    }
  }

  await scheduleOverdueDigest(overdue);
  await saveLoggedKeys(recorded);
}

export function syncMaintenanceNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return Promise.resolve();
  }

  const run = syncChain.then(syncOnce);
  syncChain = run.then(
    () => undefined,
    (error: unknown) => {
      console.error('Failed to sync maintenance notifications', error);
    },
  );
  return syncChain;
}

export const maintenanceAvisosUrl = AVISOS_URL;
