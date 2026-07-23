import { registerPlugin } from '@capacitor/core';

// App-local Swift plugins (see ios/App/App/WidgetBridge.swift and
// ios/App/App/TimerBridge.swift); neither has a web implementation — every
// call is guarded by isNative() so the timers still work in a browser.
const WidgetBridge = registerPlugin('WidgetBridge');
const TimerBridge = registerPlugin('TimerBridge');

const warn = (what) => (e) => console.error(`TimerBridge.${what} failed`, e);

export const Native = {
  isNative: () => Boolean(window.Capacitor?.isNativePlatform?.()),

  // Push the latest heatmap/day snapshot to the home-screen widget
  // (App Group container + WidgetKit timeline reload). No-op on web.
  syncWidgetData(payload) {
    if (!Native.isNative()) return;
    WidgetBridge.sync({ json: JSON.stringify(payload) })
      .catch((e) => console.error('WidgetBridge.sync failed', e));
  },

  // Fire a local notification (sound + haptic) at an absolute time, even when
  // the phone is locked or the app is backgrounded. fireAt = epoch ms.
  scheduleAlert({ id, fireAt, title, body, sound }) {
    if (!Native.isNative()) return;
    TimerBridge.scheduleAlert({ id, fireAt, title, body, sound }).catch(warn('scheduleAlert'));
  },
  cancelAlert({ id }) {
    if (!Native.isNative()) return;
    TimerBridge.cancelAlert({ id }).catch(warn('cancelAlert'));
  },

  // Drive a Dynamic Island / Live Activity countdown to an end timestamp.
  // iOS animates the countdown itself; no ticking from JS, no server push.
  // endsAt = epoch ms.
  startLiveActivity({ id, type, endsAt, label, deepLink }) {
    if (!Native.isNative()) return;
    TimerBridge.startLiveActivity({ id, type, endsAt, label, deepLink }).catch(warn('startLiveActivity'));
  },
  updateLiveActivity({ id, endsAt, label, paused, remainingAtPause }) {
    if (!Native.isNative()) return;
    TimerBridge.updateLiveActivity({ id, endsAt, label, paused, remainingAtPause }).catch(warn('updateLiveActivity'));
  },
  endLiveActivity({ id }) {
    if (!Native.isNative()) return;
    TimerBridge.endLiveActivity({ id }).catch(warn('endLiveActivity'));
  },
};
