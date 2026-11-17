import { useCallback, useMemo } from 'react';
import {
  triggerHaptic,
  getHapticsEnabled,
  setHapticsEnabled,
  type HapticFeedbackType,
} from '../utils/haptics';

/**
 * Хук для удобного вызова тактильной отдачи в UI-компонентах
 */
export function useHaptics() {
  const trigger = useCallback((type: HapticFeedbackType) => {
    triggerHaptic(type);
  }, []);

  const impactLight = useCallback(() => {
    triggerHaptic('light');
  }, []);

  const impactMedium = useCallback(() => {
    triggerHaptic('medium');
  }, []);

  const impactHeavy = useCallback(() => {
    triggerHaptic('heavy');
  }, []);

  const success = useCallback(() => {
    triggerHaptic('success');
  }, []);

  const error = useCallback(() => {
    triggerHaptic('error');
  }, []);

  const turnWarning = useCallback(() => {
    triggerHaptic('turn');
  }, []);

  return useMemo(
    () => ({
      trigger,
      impactLight,
      impactMedium,
      impactHeavy,
      success,
      error,
      turnWarning,
      isEnabled: getHapticsEnabled,
      setEnabled: setHapticsEnabled,
    }),
    [trigger, impactLight, impactMedium, impactHeavy, success, error, turnWarning]
  );
}
