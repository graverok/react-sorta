import React, {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

export type SortaEvent = { order: number[]; from: number; to: number };

export interface SortaProps {
  onSortEnd: (event: SortaEvent) => void;
  count?: number;
  containerRef?: React.RefObject<HTMLElement>;
  onItemUnmount?: (element: HTMLElement, translate: SortaElementProps["translate"]) => void;
}

export type SortaElementProps<T extends { index: number } = { index: number }> = T & {
  onSortStart: React.MouseEventHandler<HTMLElement>;
  translate: { x: number; y: number };
  isSortable: boolean;
  isDragging: boolean;
};

const SortaContext = createContext<ContextValue>({} as ContextValue);

export const Sorta = (props: React.PropsWithChildren<SortaProps>) => {
  const { count, onSortEnd, containerRef, children, onItemUnmount } = props;
  const { Provider } = SortaContext;

  const [sortIndex, setSortIndex] = useState(-1);
  const [sortTranslate, setSortTranslate] = useState<Position>({ x: 0, y: 0 });
  const [scroll, setScroll] = useState<Position>();

  const [items] = useState<Map<number, HTMLElement | null>>(new Map());
  const [rects] = useState<Map<number, Rect>>(new Map());

  /** Mutable helper state */
  const [state] = useState<State>({
    dr: 0,
    i: -1,
    tr: { x: 0, y: 0 },
    sc: { x: 0, y: 0 },
    sz: { w: 0, h: 0 },
    o: [],
    f: 0,
    el: null,
    um: onItemUnmount,
  });

  useEffect(() => {
    state.um = onItemUnmount;
  }, [state, onItemUnmount]);

  const handleCleanUp = useCallback(() => {
    window.cancelAnimationFrame(state.f);
    state.dr = 0;
    state.i = -1;
    state.tr = { x: 0, y: 0 };
    state.sc = { x: 0, y: 0 };
    state.sz = { w: 0, h: 0 };
    state.o.sort((a, b) => a - b);
    state.f = 0;
    state.el?.parentElement?.removeChild(state.el);
    state.el = null;
    rects.clear();
    setSortIndex(-1);
    setSortTranslate({ x: 0, y: 0 });
  }, [state, rects]);

  useLayoutEffect(() => {
    state.o = [...new Array(count ?? Children.count(children))].map((_, index) => index);
    return () => handleCleanUp();
  }, [children, count, handleCleanUp]);

  useEffect(() => {
    state.i = sortIndex;
  }, [state, sortIndex]);

  useEffect(() => {
    scroll && containerRef?.current?.scrollTo({ left: scroll.x, top: scroll.y });
  }, [scroll, containerRef]);

  useEffect(() => {
    state.tr = sortTranslate;
    if (state.el && state.um) state.um(state.el, state.tr);
  }, [state, sortTranslate]);

  const getTranslate = useCallback(
    (index: number) => {
      const position = state.o.findIndex((num) => num === index);
      if (index === position) return { x: 0, y: 0 };
      return {
        x: state.dr * (index < position ? state.sz.w : -state.sz.w),
        y: (1 - state.dr) * (index < position ? state.sz.h : -state.sz.h),
      };
    },
    [state],
  );

  const getRect = useCallback(
    (index: number) => {
      const item = items.get(index);
      if (!item) return undefined;
      if (!rects.get(index)) rects.set(index, getItemRect(item, containerRef?.current, state.sc));
      return rects.get(index) as Rect;
    },
    [rects, items, containerRef],
  );

  const onSortStart = useCallback(
    (index: number, e: React.MouseEvent | React.PointerEvent) => {
      let to = index;
      let ts = 0;
      setSortIndex(index);
      state.sc = {
        y: containerRef?.current?.scrollTop ?? 0,
        x: containerRef?.current?.scrollLeft ?? 0,
      };
      state.sz = getDragSize(index, getRect);

      const [startPosition, center, itemBounds, startOffset, containerRect, limits] = initSortParams(
        index,
        e,
        getRect,
        containerRef?.current,
      );
      const currentPosition = { ...startPosition };
      const currentScroll = { ...state.sc };

      const calculate = (time: number) => {
        const [translate, nextScroll] = getDragParams(
          {
            x: currentPosition.x - startPosition.x,
            y: currentPosition.y - startPosition.y,
          },
          time - ts,
          startOffset,
          itemBounds,
          state.sc,
          currentScroll,
          containerRect,
          limits,
        );
        ts = time;

        if (currentScroll.x !== nextScroll.x || currentScroll.y !== nextScroll.y) {
          currentScroll.x = nextScroll.x;
          currentScroll.y = nextScroll.y;
          setScroll({
            x: Math.round(currentScroll.x),
            y: Math.round(currentScroll.y),
          });
          state.f = window.requestAnimationFrame(calculate);
        }
        setSortTranslate(translate);

        const [hover, direction] = getHoveredProps(
          {
            x: center.x + translate.x,
            y: center.y + translate.y,
          },
          state.o.map((_, index) => getRect(index)),
        );
        if (hover === -1) return;
        state.dr = direction as 0 | 1;
        if (state.o.findIndex((num) => num === index) === hover) return;

        to = hover;
        state.o.sort((a, b) => a - b);
        if (to !== index) state.o.splice(hover, 0, state.o.splice(index, 1)[0]);
      };

      const handleMove = (ev: PointerEvent) => {
        ev.preventDefault();
        currentPosition.x = Math.round(ev.pageX);
        currentPosition.y = Math.round(ev.pageY);
        window.cancelAnimationFrame(state.f);
        state.f = window.requestAnimationFrame(calculate);
      };

      const handleEnd = () => {
        document.removeEventListener("pointermove", handleMove);
        to !== index &&
          onSortEnd({
            order: state.o,
            from: index,
            to,
          });
        handleCleanUp();
      };

      document.addEventListener("pointermove", handleMove);
      document.addEventListener("pointerup", handleEnd, { once: true });
    },
    [onSortEnd, handleCleanUp, getRect, containerRef, state],
  );

  const registerElement = useCallback(
    (index: number, el: HTMLElement | null) => {
      if (state.um && index === state.i) {
        if (!el && items.get(index)) {
          state.el = items.get(index) as HTMLElement;
          state.um(state.el, state.tr);
        } else {
          state.el?.parentElement?.removeChild(state.el);
          state.el = null;
        }
      }
      items.set(index, el);
    },
    [items, state],
  );

  return (
    <Provider
      value={{
        sortIndex,
        sortTranslate,
        getTranslate,
        registerElement,
        onSortStart,
      }}>
      {children}
    </Provider>
  );
};

export const useSorta = (index: number) => {
  const { registerElement, sortIndex, sortTranslate, getTranslate, onSortStart } = useContext(SortaContext) ?? {};

  const ref: React.ForwardedRef<HTMLElement> = useCallback(
    (el: HTMLElement | null) => registerElement?.(index, el),
    [registerElement, index],
  );

  const { x, y } = useMemo(
    () => (index === sortIndex ? sortTranslate : getTranslate?.(index) ?? { x: 0, y: 0 }),
    [sortIndex, sortTranslate, getTranslate, index],
  );

  return {
    ref,
    translate: useMemo(() => ({ x, y }), [x, y]),
    onSortStart: useCallback((e: React.MouseEvent) => onSortStart?.(index, e), [onSortStart, index]),
    isSortable: sortIndex >= 0 && sortIndex !== index,
    isDragging: sortIndex === index,
  };
};

export const sortaElement =
  <P extends { index: number }>(Component: React.ExoticComponent<SortaElementProps<P>>) =>
  (props: P) => <Component {...props} {...useSorta(props.index)} />;

/* Types */
type Bounds = { t: number; b: number; l: number; r: number };
type Size = { w: number; h: number };
type Rect = Bounds & Size;
type Position = { x: number; y: number };
type State = {
  sc: Position;
  sz: Size;
  i: number;
  dr: 0 | 1;
  tr: Position;
  o: number[];
  f: number;
  el: HTMLElement | null;
  um?: SortaProps["onItemUnmount"];
};

type ContextValue = {
  sortIndex: number;
  sortTranslate: { x: number; y: number };
  getTranslate: (index: number) => { x: number; y: number };
  registerElement: (index: number, el: HTMLElement | null) => void;
  onSortStart: (index: number, e: React.MouseEvent) => void;
};

/** Lib */
const initSortParams = (
  index: number,
  e: MouseEvent | React.MouseEvent,
  getItemRect: (index: number) => Rect | undefined,
  containerEl: HTMLElement | undefined | null,
): [Position, Position, Bounds, Position, Rect | undefined, Bounds | undefined] => {
  const itemRect = getItemRect(index);
  const itemBounds = { l: itemRect?.l ?? 0, r: itemRect?.r ?? 0, t: itemRect?.t ?? 0, b: itemRect?.b ?? 0 };
  const containerRect = getContainerRect(containerEl);
  const position = {
    x: Math.round(e.pageX),
    y: Math.round(e.pageY),
  };

  return [
    position,
    {
      x: itemRect ? itemRect.l + itemRect.w / 2 : position.x,
      y: itemRect ? itemRect.t + itemRect.h / 2 : position.y,
    },
    itemBounds,
    {
      x: containerRect ? Math.max(Math.min(0, itemBounds.l - containerRect.l), itemBounds.r - containerRect.r) : 0,
      y: containerRect ? Math.max(Math.min(0, itemBounds.t - containerRect.t), itemBounds.b - containerRect.b) : 0,
    },
    containerRect,
    containerRect && containerEl
      ? {
          t: containerRect.t - containerEl.scrollTop,
          b: containerRect.b + containerRect.h - containerEl.scrollTop,
          l: containerRect.l - containerEl.scrollLeft,
          r: containerRect.r + containerRect.w - containerEl.scrollLeft,
        }
      : undefined,
  ];
};

const getDragParams = (
  delta: Position,
  ts: number,
  startOffset: Position,
  itemBounds: Bounds,
  startScroll: Position,
  currentScroll: Position,
  containerRect: Rect | undefined,
  limits?: Bounds,
): [Position, Position] => {
  if (!limits) return [{ x: delta.x, y: delta.y }, currentScroll];

  if (!containerRect)
    return [
      {
        x: delta.x - Math.max(Math.min(0, delta.x - (limits.l - itemBounds.l)), delta.x - (limits.r - itemBounds.r)),
        y: delta.y - Math.max(Math.min(0, delta.y - (limits.t - itemBounds.t)), delta.y - (limits.b - itemBounds.b)),
      },
      currentScroll,
    ];

  const offset: Position = {
    x: Math.max(Math.min(0, delta.x + itemBounds.l - containerRect.l), delta.x + itemBounds.r - containerRect.r),
    y: Math.max(Math.min(0, delta.y + itemBounds.t - containerRect.t), delta.y + itemBounds.b - containerRect.b),
  };

  startOffset.y =
    offset.y < 0 ? Math.min(0, Math.max(offset.y, startOffset.y)) : Math.max(0, Math.min(offset.y, startOffset.y));
  startOffset.x =
    offset.x < 0 ? Math.min(0, Math.max(offset.x, startOffset.x)) : Math.max(0, Math.min(offset.x, startOffset.x));
  offset.x -= startOffset.x;
  offset.y -= startOffset.y;

  const scroll: Position = {
    x: Math.min(containerRect.w, Math.max(0, currentScroll.x + offset.x * (ts / 35))),
    y: Math.min(containerRect.h, Math.max(0, currentScroll.y + offset.y * (ts / 35))),
  };

  const scrollDelta = {
    x: Math.round(scroll.x - startScroll.x),
    y: Math.round(scroll.y - startScroll.y),
  };

  offset.x += Math.max(
    Math.min(0, delta.x - (limits.l - (itemBounds.l + scrollDelta.x - offset.x))),
    delta.x - (limits.r - (itemBounds.r + scrollDelta.x - offset.x)),
  );
  offset.y += Math.max(
    Math.min(0, delta.y - (limits.t - (itemBounds.t + scrollDelta.y - offset.y))),
    delta.y - (limits.b - (itemBounds.b + scrollDelta.y - offset.y)),
  );

  return [
    {
      x: delta.x + scrollDelta.x - offset.x,
      y: delta.y + scrollDelta.y - offset.y,
    },
    scroll,
  ];
};

const getDragSize = (index: number, getItemRect: (index: number) => Rect | undefined): Size => {
  const rect = getItemRect(index);
  if (!rect) return { w: 0, h: 0 };

  const next = getItemRect(index + 1);
  const prev = getItemRect(index - 1);

  if (next) {
    const h: "l" | "r" = next.l > rect.l ? "l" : "r";
    const v: "t" | "b" = next.t > rect.t ? "t" : "b";
    return { w: next[h] - rect[h], h: next[v] - rect[v] };
  }

  if (prev) {
    const h: "l" | "r" = rect.l < prev.l ? "r" : "l";
    const v: "t" | "b" = rect.t < prev.t ? "b" : "t";
    return { w: rect[h] - prev[h], h: rect[v] - prev[v] };
  }

  return { w: rect.r - rect.l, h: rect.b - rect.t };
};

const getCSSProperties = (element: HTMLElement, ...keys: (keyof CSSStyleDeclaration)[]): number => {
  return keys.reduce((acc: number, key: keyof CSSStyleDeclaration) => {
    const value = window.getComputedStyle(element)[key]?.toString();
    return acc + (value ? +value.substring(0, value.length - 2) : 0);
  }, 0);
};

const getContainerRect = (containerEl: HTMLElement | undefined | null): Rect | undefined => {
  if (!containerEl) return undefined;
  const containerRect = containerEl.getBoundingClientRect();

  return {
    t: containerRect.top + getCSSProperties(containerEl, "paddingTop", "borderLeftWidth"),
    b: containerRect.bottom - getCSSProperties(containerEl, "paddingBottom", "borderBottomWidth"),
    l: containerRect.left + getCSSProperties(containerEl, "paddingLeft", "borderLeftWidth"),
    r: containerRect.right - getCSSProperties(containerEl, "paddingRight", "borderRightWidth"),
    w: containerEl.scrollWidth - containerEl.clientWidth,
    h: containerEl.scrollHeight - containerEl.clientHeight,
  };
};

const getItemRect = (
  item: HTMLElement,
  containerEl: HTMLElement | null | undefined,
  initial: { x: number; y: number },
): Rect => {
  const rect = item.getBoundingClientRect();
  const delta = {
    x: containerEl ? containerEl.scrollLeft - initial.x : 0,
    y: containerEl ? containerEl.scrollTop - initial.y : 0,
  };

  return {
    w: rect.width,
    h: rect.height,
    t: rect.top + delta.y,
    b: rect.bottom + delta.y,
    l: rect.left + delta.x,
    r: rect.right + delta.x,
  };
};

const checkY = (y: number, rect?: Rect) => rect && y > rect.t && y < rect.b;
const checkX = (x: number, rect?: Rect) => rect && x > rect.l && x < rect.r;

const getHoveredProps = (position: Position, rects: (Rect | undefined)[]): [number, 0 | 1] => {
  const resX = rects.reduce((acc, rect, index) => (checkX(position.x, rect) ? [...acc, index] : acc), [] as number[]);
  const resY = rects.reduce((acc, rect, index) => (checkY(position.y, rect) ? [...acc, index] : acc), [] as number[]);

  if (!resX.length && !resY.length) return [-1, 0];
  return resY.length === 1 ? [resY[0], 0] : resX.length === 1 ? [resX[0], 1] : [-1, 0];
};
