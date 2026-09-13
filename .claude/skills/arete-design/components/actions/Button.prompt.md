One-line: every tappable action in Arete — use `primary` for the one CTA on a screen, `dashed` for "add a thing".

```jsx
<Button icon={<Icon name="moon" />} fullWidth>Evening reflection</Button>
<Button variant="secondary" size="sm">Retry</Button>
<Button variant="dashed" icon={<Icon name="add" />}>Add a task</Button>
```

One primary per screen. Disabled is 50% opacity, never a grey fill. `pill` is the tiny tracked-uppercase action used inside cards ("Set up").
