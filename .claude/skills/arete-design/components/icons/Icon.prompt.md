One-line: the Arete glyph set, outline by default, filled only for state (flame, lock) — use it anywhere an icon is needed instead of hand-drawing SVG.

```jsx
<Icon name="moon" size={18} />
<Icon name="flame" size={14} color="var(--gold)" />
<Icon name="home" size={22} strokeWidth={1.7} />
```

Icons inherit `currentColor`, so set color on the parent. In circular wells use 18px; in the tab bar 22px at strokeWidth 1.7; inside badges 14px. Only `flame`, `checkmark` (as a state check) and `lockClosed` ever appear filled.
