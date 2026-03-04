import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { PanResponder } from 'react-native';

const TAB_ROUTES = ['/', '/morning', '/evening', '/cabinet', '/journal', '/timer', '/progress'] as const;

const SWIPE_THRESHOLD = 50;

export function useSwipeNavigation(currentRoute: typeof TAB_ROUTES[number]) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const currentIndex = TAB_ROUTES.indexOf(currentRoute);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderRelease: (_, gestureState) => {
        const idx = currentIndexRef.current;
        if (gestureState.dx < -SWIPE_THRESHOLD && idx < TAB_ROUTES.length - 1) {
          routerRef.current.replace(TAB_ROUTES[idx + 1] as any);
        } else if (gestureState.dx > SWIPE_THRESHOLD && idx > 0) {
          routerRef.current.replace(TAB_ROUTES[idx - 1] as any);
        }
      },
    })
  ).current;

  return panResponder.panHandlers;
}
