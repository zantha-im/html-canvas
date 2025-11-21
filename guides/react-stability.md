# React Stability

Prevent re-render loops, stabilize dependencies, and keep effects predictable.

## Stability Rules
- Wrap callbacks with `useCallback` when referenced by children/effects.
- Memoize expensive computations with `useMemo`.
- Avoid inline object/array literals in JSX/props; hoist or memoize them.
- Always provide correct dependency arrays; fix hook warnings.
- Cleanup side effects (subscriptions, timers, observers) in `useEffect`.
- Avoid dual fetching of the same data from multiple layers.

## Minimal Example
```tsx
function Example({ data }: { data: number[] }) {
  const total = useMemo(() => data.reduce((a, b) => a + b, 0), [data])
  const onClick = useCallback(() => {
    // handle click
  }, [])
  const style = useMemo(() => ({ padding: 8 }), [])
  return <button style={style} onClick={onClick}>{total}</button>
}
```