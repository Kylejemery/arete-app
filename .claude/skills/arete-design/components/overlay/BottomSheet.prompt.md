One-line: a sheet rising from the bottom over a 65% black scrim — surface fill, 18px top radius only.

```jsx
<BottomSheet title="Request a scroll" subtitle="Ask a counselor to write on a theme">
  <Input multiline placeholder="On patience with slow progress" />
  <Button size="md" fullWidth>Send request</Button>
  <div style={{textAlign:'center',fontSize:15,color:'var(--muted)'}}>Cancel</div>
</BottomSheet>
```

Cancel is plain muted text, centered, never a bordered button.
