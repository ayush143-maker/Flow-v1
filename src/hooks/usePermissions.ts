import { useCallback, useEffect, useState } from 'react';
import { App, type AppStateChange } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import {
  checkSmsPermission,
  isNotificationListenerEnabled,
  openNotificationSettings,
  requestSmsPermission,
} from '@/services/native/flow-core';
import { useAppStore } from '@/services/store/AppStoreProvider';

/**
 * Real permission state + actions.
 * Native: live Android checks, refreshed automatically when the app resumes
 * (covers returning from system settings). Web: honest simulated state.
 */
export function usePermissions() {
  const { settings, setSmsGranted } = useAppStore();
  const native = Capacitor.isNativePlatform();
  const [sms, setSms] = useState(false);
  const [notif, setNotif] = useState(false);

  const recheck = useCallback(async () => {
    if (!native) return;
    try {
      const [s, n] = await Promise.all([checkSmsPermission(), isNotificationListenerEnabled()]);
      setSms(s);
      setNotif(n);
    } catch {
      /* engine unavailable — statuses stay false */
    }
  }, [native]);

  useEffect(() => {
    void recheck();
  }, [recheck]);

  useEffect(() => {
    if (!native) return;
    let disposed = false;
    let handle: PluginListenerHandle | undefined;
    void App.addListener('appStateChange', (state: AppStateChange) => {
      if (state.isActive) void recheck();
    }).then((h) => {
      if (disposed) h.remove();
      else handle = h;
    });
    return () => {
      disposed = true;
      handle?.remove();
    };
  }, [native, recheck]);

  const grantSms = useCallback(async () => {
    if (!native) {
      setSmsGranted(true); // web preview simulation
      return;
    }
    await requestSmsPermission();
    window.setTimeout(() => void recheck(), 700);
  }, [native, recheck, setSmsGranted]);

  const openNotifSettings = useCallback(async () => {
    if (native) await openNotificationSettings();
  }, [native]);

  return {
    native,
    smsGranted: native ? sms : settings.smsGranted,
    notifEnabled: native ? notif : false,
    grantSms,
    openNotifSettings,
    recheck,
  };
}
