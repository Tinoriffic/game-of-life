import { registerPlugin } from '@capacitor/core';

// App-local Swift plugin (see ios/App/App/WidgetBridge.swift); has no web
// implementation — every call is guarded by isNative().
const WidgetBridge = registerPlugin('WidgetBridge');

export const Native = {
  isNative: () => Boolean(window.Capacitor?.isNativePlatform?.()),

  // Push the latest heatmap/day snapshot to the home-screen widget
  // (App Group container + WidgetKit timeline reload). No-op on web.
  syncWidgetData(payload) {
    if (!Native.isNative()) return;
    WidgetBridge.sync({ json: JSON.stringify(payload) })
      .catch((e) => console.error('WidgetBridge.sync failed', e));
  },

  // Fire a local alert at an absolute time, even backgrounded or closed.
  scheduleAlert({ id, fireAt, title, body }) {},   // fireAt = epoch ms
  cancelAlert({ id }) {},

  // Drive a Dynamic Island / Live Activity countdown to an end timestamp.
  // iOS animates the countdown itself; no ticking from JS, no server push.
  startLiveActivity({ id, type, endsAt, label, deepLink }) {},
  updateLiveActivity({ id, endsAt, label }) {},
  endLiveActivity({ id }) {},
};
