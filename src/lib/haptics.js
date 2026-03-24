/**
 * Triggers native haptic feedback on supported mobile devices.
 * Fallbacks silently on unsupported platforms.
 * 
 * @param {'light' | 'medium' | 'heavy' | 'success' | 'error'} type 
 */
export const triggerHaptic = (type = 'light') => {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  try {
    switch(type) {
      case 'light':
        // A tiny tick
        navigator.vibrate([10]);
        break;
      case 'medium':
        // A solid tap
        navigator.vibrate([20]);
        break;
      case 'heavy':
        // A strong thump
        navigator.vibrate([30]);
        break;
      case 'success':
        // Two quick ticks
        navigator.vibrate([10, 50, 10]);
        break;
      case 'error':
        // Three sharp buzzes
        navigator.vibrate([20, 30, 20, 30, 20]);
        break;
      default:
        navigator.vibrate([10]);
    }
  } catch (error) {
    // Ignore permissions or unsupported browsers
  }
};
