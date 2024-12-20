# Sorta

#### A simple yet powerful sortable list for React!

- Works automatically either in a **vertical** or **horizontal** direction with **rtl** support.
- **Doesn't affect the DOM tree** by itself: no styles are applied, and no elements are created or copied: 
  - Provides `{x: number; y: number}`property for you to decide how to apply styles: 
`transform`, `margin` or `left & top`. 
  - Operates within a single container that keeps you safe with CSS cascade dependencies 
(`.container > .item {...}`) that obviously doesn't work with cloning and appending element to `document.body`.
- Supports **scrollable containers** and **virtualized lists**.

<img width="540" height="215" alt="react-sorta" src="https://graverok.github.io/react-sorta/demo.gif" style="border: 1px solid #CCC; border-radius: 8px"/>

**[See Demo](https://graverok.github.io/react-sorta)**


## Basic usage
```
npm install react-sorta
```
```
yarn add react-sorta
```
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
It's easy to use Sorta within the scrolling container. Just pass `RefObject<HTMLElement>` to `containerRef` prop.

```tsx
const containerRef = useRef<HTMLDivElement | null>(null);

return <div ref={containerRef} style={{overflow: "auto"}}>
  <Sorta onSortEnd={onSortEnd} containerRef={containerRef}>
    {list.map((label, index) => (
      <Item index={index} key={label}>{label}</Item>
    ))}
  </Sorta>
</div>
```
Note, that `containerRef` can be used not only for scrolling purposes but to prevent items 
to be dragged outside the parent container.

## Virtualization
Using Sorta with virtualization lists is a bit tricky since the virtualizer skips elements 
that are out of bounds so with default usage dragging element will eventually disappear on scrolling. 
To handle that use `onItemUnmount` prop that passes `translate` and copy of the dragging element 
you can append to the container if needed. 

Also, you need to provide elements count with `count` prop

Example with `react-window` virtualizer:
```tsx
import { FixedSizeList } from "react-window";
import { Sorta } from "react-sorta";

const containerRef = useRef<HTMLDivElement | null>(null);
const contentRef = useRef<HTMLDivElement | null>(null);

<Sorta
  onSortEnd={setList}
  count={list.length}
  containerRef={containerRef}
  onItemUnmount={(element: HTMLElement, translate: {x: number; y: number}) => {
    element.style.transform = `translate(0, ${translate.y}px)`;
    contentRef.current?.appendChild(element);
  }}>
  <FixedSizeList
    height={300}
    width={200}
    itemSize={50}
    itemCount={list.length}
    outerRef={containerRef}
    innerRef={contentRef}>
    {({ index, style }) => (
      <Item key={list[index]} index={index} style={style}>
        {list[index]}
      </Item>
    )}
  </FixedSizeList>
</Sorta>
```

## Types
### SortaProps
Props of Sorta container

|     Property      | Description                                                                                                                         | Type                                                                  |          |
|:-----------------:|:------------------------------------------------------------------------------------------------------------------------------------|:----------------------------------------------------------------------|:--------:|
|   **onSortEnd**   | Event fired after finishing sorting. Provides ordered indices of the current list, source and destination indices.                  | `({ order: number[], from: number; to: number }) => void;`            | Required |
| **containerRef**  | Provides items container. Used to get bounding rect and invoke the '.scrollTo()' method when dragging item.                         | `RefObject<HTMLElement>`                                              | Optional |
|     **count**     | Provides the number of elements in the list in case it's impossible to get this number from `children`, e.g., using virtualization. | `number`                                                              | Optional |
| **onItemUnmount** | Provides callback if dragging element was unmounted, e.g. in virtualized lists, to manually append it container                     | `(element: HTMLElement, translate: { x: number, y: number }) => void` | Optional |

### SortaElementProps
Props of sorting element

|    Property     | Description                                                                      | Type                              |  
|:---------------:|:---------------------------------------------------------------------------------|:----------------------------------|
|    **index**    | Index of the current element                                                     | `number`                          |
|     **ref**     | Used to identify bounds of sorting elements.                                     | `React.ForwardedRef<HTMLElement>` |
| **onSortStart** | Provides event handler to pass on element as `onMouseDown`/`onPointerDown` event | `React.MouseEventHandler`         |
|  **translate**  | Provides `x,y` shift of current element.                                         | `{ x: number; y: number }`        |
| **isDragging**  | Indicates if current element is currently dragging.                              | `boolean`                         |
| **isSortable**  | Indicates if elements are currently sorting except for dragging element.         | `boolean`                         |
