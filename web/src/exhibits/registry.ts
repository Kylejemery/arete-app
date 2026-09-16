// The native exhibit registry, web side.
//
// An exhibit whose kind is 'native' is drawn by a component in this app
// rather than loaded from elsewhere. Its row carries a component_key, and
// this file is the only place a key becomes a component. Adding a native
// exhibit is adding one line to `registry` below.
//
// The mobile app keeps its own registry at exhibits/registry.ts, at the
// same path relative to its source root and with the same shape. It has
// to: React Native components and DOM components are not interchangeable,
// and the two apps are separate TypeScript projects with no shared
// package. A key that is native on both platforms appears in both files;
// a key present in neither is a row the template will refuse to render,
// loudly, rather than showing a blank frame.
//
// Most exhibits are not native. The established pattern in this codebase
// is to build the piece once on the Academy and point a 'web_embed' row at
// it, which keeps one implementation rather than two. Reach for 'native'
// only when a piece genuinely needs to be drawn in this app.
import { createElement, type ComponentType, type ReactElement } from 'react';

/** Every native exhibit component is handed the row's slug and nothing else. */
export interface NativeExhibitProps {
  slug: string;
}

export const registry: Record<string, ComponentType<NativeExhibitProps>> = {
  // 'chrysippus-cylinder': ChrysippusCylinder,
};

/**
 * The rendered exhibit for a key, or null if this app does not implement it.
 * Returns an element rather than a component so callers never bind a
 * component during render.
 */
export function renderNative(key: string | null, props: NativeExhibitProps): ReactElement | null {
  if (!key) return null;
  const Component = registry[key];
  return Component ? createElement(Component, props) : null;
}
