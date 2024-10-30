# Sorta
Simple sortable list for React. Doesn't apply any effects on DOM tree by itself: no styles applied¹, no elements are created or copied². It just provides `translate: {x: number; y:number}` property representing the elements offset values and operates only within one single container.

Works automatically either in vertical or horizontal direction.

> ¹ Gives you freedom in applying styles: `transform: translate`, `margin`, `left`/`right`, it's up to you.

> ² Keeps you safe if your CSS has some parent dependency:
> `.container > .item {...}`
> which obviously doesn't work with cloning and appending element to body.

## Basic usage
### Container
```tsx
import { useCallback, useState } from "react";
import { Sorta, SortaEvent } from "react-sorta";

const [ list, setList ] = useState([ "Apple", "Banana", "Orange", "Kiwi" ])

const onSortEnd = useCallback(({ order, from, to }: SortaEvent) => {
  setList(current => order.map(index => current[index]))
}, []);

return <Sorta onSortEnd={onSortEnd}>
  {list.map((label, index) => (
    <Item index={index} key={label}>{label}</Item>
  ))}
</Sorta>
```

### Item
To initialize sorting item you need only two params: 
- `ref` passed to container to initialize element bounds.
- `onSortStart` event handler passed as `onMouseDown`/`onPointerDown` event to start dragging.

#### Using with HOC

```tsx
import { forwardRef, PropsWithChildren } from "react";
import { sortaElement, SortaElementProps } from "react-sorta";

const Item = sortaElement(forwardRef((props: PropsWithChildren<SortaElementProps>, ref) => {
  const { onSortStart, translate: {x, y} } = props;
  return (
    <div
      ref={ref}
      onMouseDown={onSortStart}
      style={{transfrom: `translate(${x}px, ${y}px)`}}
    >
      {props.children}
    </div>
  )
}));
```

#### Using with hook
```tsx
import { useSorta } from "react-sorta";

const Item = (props: PropsWithChildren<{ index: number }>) => {
  const { ref, onSortStart, translate } = useSorta(props.index);
  /*...*/
};
```

## Scroll Container
It's easy to use Sorta within scrolling container. Just pass `RefObject` to `scrollRef` props.

```tsx
const scrollRef = useRef<HTMLDivElement | null>(null);

return <div ref={scrollRef} style={{overflow: "auto"}}>
  <Sorta onSortEnd={onSortEnd} scrollRef={scrollRef}>
    {list.map((label, index) => (
      <Item index={index} key={label}>{label}</Item>
    ))}
  </Sorta>
</div>
```

## Virtualization
Using Sorta with virtualization lists are a bit tricky since virtualizer skips 
elements what are out of bounds so with default usage dragging element will eventually
disappear on scrolling. To handle that use `clone` callback prop what passes `translate` and copy of the dragging 
element you can append to container if needed. Also, you need to provide elements count with `count` prop

Example with `react-window` virtualizer:
```tsx
import { FixedSizeList } from "react-window";
import { Sorta } from "react-sorta";

const scrollRef = useRef<HTMLDivElement | null>(null);
const contentRef = useRef<HTMLDivElement | null>(null);

<Sorta
  onSortEnd={setList}
  count={list.length}
  scrollRef={scrollRef}
  clone={(translate: {x: number; y: number}, element: HTMLElement) => {
    element.style.transform = `translate(0, ${translate.y}px)`;
    contentRef.current?.appendChild(element);
  }}>
  <FixedSizeList
    height={300}
    width={200}
    itemSize={50}
    itemCount={list.length}
    outerRef={scrollRef}
    innerRef={contentRef}>
    {({ index, style }) => (
      <Item key={list[index]} index={index} style={style}>
        {list[index]}
      </Item>
    )}
  </FixedSizeList>
</Sorta>
```
Note, that clone callback fires only if source element was unmounted. 
So you won't end up having both source and copy in the DOM tree.
