# Sorta
A simple sortable list for React. It doesn't affect the DOM tree by itself: no styles are applied¹, 
and no elements are created or copied². It just provides `translate: {x: number; y: number}`
property representing the elements offset values and operates only within single container.

Works automatically either in a vertical or horizontal direction.

> ¹ Gives you freedom in applying styles: `transform: translate`, `margin`, `left`/`right`, it's up to you.

> ² Keeps you safe if your CSS has some parent dependency:
> `.container > .item {...}`
> which obviously doesn't work with cloning and appending element to document.body.

## Basic usage
### Container
```tsx
import { useCallback, useState } from "react";
import { Sorta, SortaEvent } from "react-sorta";

const [ list, setList ] = useState([ "Apple", "Banana", "Orange", "Kiwi", "Pear" ])

const onSortEnd = useCallback(({ order, from, to }: SortaEvent) => {
  /**
   order: provides indices of current list in new order
   from: source index
   to: destination index

   EXAMPLE: Move second element to 4th position:
   {
     order: [0,2,3,1,4],
     from: 1,
     to: 3
   }
   **/
  setList(current => order.map(index => current[index]))
}, []);

return <Sorta onSortEnd={onSortEnd}>
  {list.map((label, index) => (
    <Item index={index} key={label}>{label}</Item>
  ))}
</Sorta>
```

### Item
To use sorting item you need only two params: 
- `ref` passed to HTML element to initialize element bounds.
- `onSortStart` event handler passed as `onMouseDown`/`onPointerDown` event to start dragging.
- `translate` prop to get `x,y` shift for each element

All three props can be passed to different elements, so you can use one element as a sorting handle, get bounds from another, and move only the third element.

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
It's easy to use Sorta within the scrolling container. Just pass `RefObject<HTMLElement>` to `scrollRef` prop.

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
Using Sorta with virtualization lists is a bit tricky since the virtualizer skips elements 
that are out of bounds so with default usage dragging element will eventually disappear on scrolling. 
To handle that use `clone` callback prop that passes `translate` and copy of the dragging element 
you can append to the container if needed. 

Also, you need to provide elements count with `count` prop

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
Note that clone callback fires only if the source element is unmounted.
So you won't end up having both source and copy in the DOM tree.

## Types
### SortaProps
Props of Sorta container

| Property | Description                                                                                                                         | Type |          |
|:--------:|:------------------------------------------------------------------------------------------------------------------------------------|:-----|:--------:|
|**onSortEnd**| Event fired after finishing sorting. Provides ordered indices of the current list, source and destination indices.                  | `({ order: number[], from: number; to: number }) => void;` | Required |
|**scrollRef**| Provides scrolling container. Sorta invokes the '.scrollTo()' method on dragging item.                                              | `RefObject<HTMLElement>` | Optional |
|**count**| Provides the number of elements in the list in case it's impossible to get this number from `children`, e.g., using virtualization. | `number` | Optional |
|**clone**| Provides callback if dragging element was unmounted, e.g., on scrolling in virtualizer to manually append it to container.          | `(translate: {x: number, y: number}, element: HTMLElement) => void` | Optional |

### SortaElementProps
Props of sorting element

|     Property      | Description                                                           | Type                              |  
|:-----------------:|:----------------------------------------------------------------------|:----------------------------------|
|     **index**     | Index of the current element                                          | `number`                          |
|      **ref**      | Used to identify bounds of sorting elements.                          | `React.ForwardedRef<HTMLElement>` |
| **onScrollStart** | Provides event handler to pass as `onMouseDown`/`onPointerDown` event | `React.MouseEventHandler`         |
|   **translate**   | Provides `x,y` shift of current element.                              | `{x: number; y: number }`         |
|   **isSorting**   | Indicates if elements are currently sorting                           | `boolean`                         |
|   **isActive**    | Indicates if current element is currently dragging                    | `boolean`                         |
