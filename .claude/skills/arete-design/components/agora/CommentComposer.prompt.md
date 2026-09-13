One-line: the box for adding a comment, with a locked state for non-subscribers.

```jsx
<CommentComposer locked onUnlock={() => setPaywall(true)} />
<CommentComposer value={text} onChange={e => setText(e.target.value)} onSubmit={post} />
```

The locked state reuses the dashed gold "add something" affordance rather than a greyed-out field.
