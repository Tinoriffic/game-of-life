export const Native = {
  isNative: () => Boolean(window.Capacitor?.isNativePlatform?.()),

  // Fire a local alert at an absolute time, even backgrounded or closed.
  scheduleAlert({ id, fireAt, title, body }) {},   // fireAt = epoch ms
  cancelAlert({ id }) {},

  // Drive a Dynamic Island / Live Activity countdown to an end timestamp.
  // iOS animates the countdown itself; no ticking from JS, no server push.
  startLiveActivity({ id, type, endsAt, label, deepLink }) {},
  updateLiveActivity({ id, endsAt, label }) {},
  endLiveActivity({ id }) {},
};
