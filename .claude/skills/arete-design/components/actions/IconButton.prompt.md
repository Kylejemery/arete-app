One-line: circular or square-ish single-glyph buttons — the composer send key, the FAB, and the icon in a screen header.

```jsx
<IconButton variant="gold"><Icon name="send" /></IconButton>
<IconButton variant="header" size={40}><Icon name="library" /></IconButton>
<IconButton variant="gold" size={56} style={{fontSize:28,fontWeight:700}}>+</IconButton>
```

Disabled send drops to a surface fill with a `--faint` border and glyph, not opacity.
