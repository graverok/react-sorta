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
  scrollRef?: React.RefObject<HTMLElement>;
  clone?: (translate: SortaElementProps["translate"], element: HTMLElement) => void;
}

export type SortaElementProps<T = object> = T & {
  index: number;
  ref: React.ForwardedRef<HTMLElement>;
  onSortStart: React.MouseEventHandler<HTMLElement>;
  translate: { x: number; y: number };
  isSorting: boolean;
  isActive: boolean;
};

const SortaContext = createContext<ContextValue>({} as ContextValue);

export const Sorta = (props: React.PropsWithChildren<SortaProps>) => {
  const { count, onSortEnd, scrollRef, children, clone } = props;
  const { Provider } = SortaContext;

  const [sortIndex, setSortIndex] = useState(-1);
  const [sortTranslate, setSortTranslate] = useState<Position>({ x: 0, y: 0 });
  const [scroll, setScroll] = useState<Position>();

  const [items] = useState<Map<number, HTMLElement | null>>(new Map());
  const [rects] = useState<Map<number, Rect>>(new Map());

  /** Mutable helper state */
  const [state] = useState<State>({
    direction: 0,
    index: -1,
    translate: { x: 0, y: 0 },
    scroll: { x: 0, y: 0 },
    size: { w: 0, h: 0 },
    order: [],
    raf: 0,
    clone: {
      element: null,
      callback: clone,
    },
  });

  const handleCleanUp = useCallback(() => {
    window.cancelAnimationFrame(state.raf);
    state.direction = 0;
    state.index = -1;
    state.translate = { x: 0, y: 0 };
    state.scroll = { x: 0, y: 0 };
    state.size = { w: 0, h: 0 };
    state.order.sort((a, b) => a - b);
    state.raf = 0;
    state.clone?.element?.parentElement?.removeChild(state.clone.element);
    state.clone.element = null;
    rects.clear();
    setSortIndex(-1);
    setSortTranslate({ x: 0, y: 0 });
  }, [state, rects]);

  useLayoutEffect(() => {
    state.order = [...new Array(count ?? Children.count(children))].map((_, index) => index);
    return () => handleCleanUp();
  }, [children, count, handleCleanUp]);

  useEffect(() => {
    state.index = sortIndex;
  }, [state, sortIndex]);

  useEffect(() => {
    scroll && scrollRef?.current?.scrollTo({ left: scroll.x, top: scroll.y });
  }, [scroll, scrollRef]);

  useEffect(() => {
    state.translate = sortTranslate;
  }, [state, sortTranslate]);

  const getTranslate = useCallback(
    (index: number) => {
      const position = state.order.findIndex((num) => num === index);
      if (index === position) return { x: 0, y: 0 };
      return {
        x: state.direction * (index < position ? state.size.w : -state.size.w),
        y: (1 - state.direction) * (index < position ? state.size.h : -state.size.h),
      };
    },
    [state],
  );

  const getRect = useCallback(
    (index: number) => {
      const item = items.get(index);
      if (!item) return undefined;
      if (!rects.get(index)) rects.set(index, getItemRect(item, scrollRef?.current, state.scroll));
      return rects.get(index) as Rect;
    },
    [rects, items, scrollRef],
  );

  const onSortStart = useCallback(
    (index: number, e: React.MouseEvent | React.PointerEvent) => {
      let to = index;
      setSortIndex(index);
      state.scroll = {
        y: scrollRef?.current?.scrollTop ?? 0,
        x: scrollRef?.current?.scrollLeft ?? 0,
      };
      state.size = getDragSize(index, getRect);

      const [startPosition, center, itemBounds, startOffset, scrollRect] = initSortParams(
        index,
        e,
        getRect,
        scrollRef?.current,
      );
      const currentPosition = { ...startPosition };
      const currentScroll = { ...state.scroll };

      const limits: Bounds = getLimits(state.order, getRect) ?? {
        t: itemBounds.t - index * state.size.h,
        b: itemBounds.b + (state.order.length - 1 - index) * state.size.h,
        l: itemBounds.l - index * state.size.w,
        r: itemBounds.r + (state.order.length - 1 - index) * state.size.w,
      };

      const calculate = () => {
        const [translate, nextScroll] = getDragParams(
          {
            x: currentPosition.x - startPosition.x,
            y: currentPosition.y - startPosition.y,
          },
          startOffset,
          itemBounds,
          state.scroll,
          currentScroll,
          scrollRect,
          limits,
        );

        if (currentScroll.x !== nextScroll.x || currentScroll.y !== nextScroll.y) {
          currentScroll.x = nextScroll.x;
          currentScroll.y = nextScroll.y;
          setScroll(nextScroll);
          state.raf = window.requestAnimationFrame(calculate);
        }
        setSortTranslate(translate);
        if (state.clone.element && state.clone.callback) state.clone.callback(translate, state.clone.element);

        const [hover, direction] = getHoveredProps(
          {
            x: center.x + translate.x,
            y: center.y + translate.y,
          },
          state.order.map((_, index) => getRect(index)),
        );
        state.direction = direction as 0 | 1;
        if (hover === -1) return;
        if (state.order.findIndex((num) => num === index) === hover) return;

        to = hover;
        state.order.sort((a, b) => a - b);
        if (to !== index) state.order.splice(hover, 0, state.order.splice(index, 1)[0]);
      };

      const handleMove = (ev: PointerEvent) => {
        currentPosition.x = Math.round(ev.pageX);
        currentPosition.y = Math.round(ev.pageY);
        window.cancelAnimationFrame(state.raf);
        state.raf = window.requestAnimationFrame(calculate);
      };

      const handleEnd = () => {
        document.removeEventListener("pointermove", handleMove);
        to !== index &&
          onSortEnd({
            order: state.order,
            from: index,
            to,
          });
        handleCleanUp();
      };

      document.addEventListener("pointermove", handleMove);
      document.addEventListener("pointerup", handleEnd, { once: true });
    },
    [onSortEnd, handleCleanUp, getRect, scrollRef, state],
  );

  const registerElement = useCallback(
    (index: number, el: HTMLElement | null) => {
      if (state.clone.callback && index === state.index) {
        if (!el && items.get(index)) {
          state.clone.element = items.get(index) as HTMLElement;
          state.clone.callback(state.translate, state.clone.element);
        } else {
          state.clone.element?.parentElement?.removeChild(state.clone.element);
          state.clone.element = null;
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
    (el: HTMLElement | null) => {
      registerElement?.(index, el);
    },
    [registerElement, index],
  );

  const translate = useMemo(() => {
    return index === sortIndex ? sortTranslate : getTranslate?.(index) ?? { x: 0, y: 0 };
  }, [sortIndex, sortTranslate, getTranslate, index]);

  const handleSortStart = useCallback(
    (e: React.MouseEvent) => {
      onSortStart?.(index, e);
    },
    [onSortStart, index],
  );

  return {
    ref,
    translate,
    onSortStart: handleSortStart,
    isSorting: sortIndex >= 0,
    isActive: sortIndex === index,
  };
};

export const sortaElement = <T = object,>(Component: React.ComponentType<SortaElementProps<T>>) => {
  return (props: T & { index: number }) => <SortaWrapper Component={Component} {...props} />;
};

const SortaWrapper = <T = object,>(
  props: { Component: React.ComponentType<SortaElementProps<T>> } & T & { index: number },
) => {
  const { Component, ...rest } = props;
  const { onSortStart, isSorting, isActive, translate, ref } = useSorta(props.index);

  return (
    <Component
      ref={ref}
      {...(rest as T & { index: number })}
      translate={translate}
      onSortStart={onSortStart}
      isSorting={isSorting}
      isActive={isActive}
    />
  );
};

/* Types */
type Bounds = { t: number; b: number; l: number; r: number };
type Size = { w: number; h: number };
type Rect = Bounds & Size;
type Position = { x: number; y: number };
type State = {
  scroll: Position;
  size: Size;
  index: number;
  direction: 0 | 1;
  translate: Position;
  order: number[];
  raf: number;
  clone: {
    element: HTMLElement | null;
    callback?: SortaProps["clone"];
  };
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
  scrollEl: HTMLElement | undefined | null,
): [Position, Position, Bounds, Position, Rect | undefined] => {
  const itemRect = getItemRect(index);
  const itemBounds = { l: itemRect?.l ?? 0, r: itemRect?.r ?? 0, t: itemRect?.t ?? 0, b: itemRect?.b ?? 0 };
  const scrollRect = getScrollRect(scrollEl);
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
      x: scrollRect ? Math.max(Math.min(0, itemBounds.l - scrollRect.l), itemBounds.r - scrollRect.r) : 0,
      y: scrollRect ? Math.max(Math.min(0, itemBounds.t - scrollRect.t), itemBounds.b - scrollRect.b) : 0,
    },
    scrollRect,
  ];
};

const getDragParams = (
  delta: Position,
  startOffset: Position,
  itemBounds: Bounds,
  startScroll: Position,
  currentScroll: Position,
  scrollRect: Rect | undefined,
  limits: Bounds,
): [Position, Position] => {
  if (!scrollRect)
    return [
      {
        x: delta.x - Math.max(Math.min(0, delta.x - (limits.l - itemBounds.l)), delta.x - (limits.r - itemBounds.r)),
        y: delta.y - Math.max(Math.min(0, delta.y - (limits.t - itemBounds.t)), delta.y - (limits.b - itemBounds.b)),
      },
      currentScroll,
    ];

  const offset: Position = {
    x: Math.max(Math.min(0, delta.x + itemBounds.l - scrollRect.l), delta.x + itemBounds.r - scrollRect.r),
    y: Math.max(Math.min(0, delta.y + itemBounds.t - scrollRect.t), delta.y + itemBounds.b - scrollRect.b),
  };

  startOffset.y =
    offset.y < 0 ? Math.min(0, Math.max(offset.y, startOffset.y)) : Math.max(0, Math.min(offset.y, startOffset.y));
  startOffset.x =
    offset.x < 0 ? Math.min(0, Math.max(offset.x, startOffset.x)) : Math.max(0, Math.min(offset.x, startOffset.x));
  offset.x -= startOffset.x;
  offset.y -= startOffset.y;

  const scroll: Position = {
    x: Math.min(scrollRect.w, Math.max(0, currentScroll.x + offset.x)),
    y: Math.min(scrollRect.h, Math.max(0, currentScroll.y + offset.y)),
  };

  offset.x += Math.max(
    Math.min(0, delta.x - (limits.l - (itemBounds.l + scroll.x - startScroll.x - offset.x))),
    delta.x - (limits.r - (itemBounds.r + scroll.x - startScroll.x - offset.x)),
  );
  offset.y += Math.max(
    Math.min(0, delta.y - (limits.t - (itemBounds.t + scroll.y - startScroll.y - offset.y))),
    delta.y - (limits.b - (itemBounds.b + scroll.y - startScroll.y - offset.y)),
  );

  return [
    {
      x: delta.x + scroll.x - startScroll.x - offset.x,
      y: delta.y + scroll.y - startScroll.y - offset.y,
    },
    scroll,
  ];
};

const getDragSize = (index: number, getItemRect: (index: number) => Rect | undefined): Size => {
  const rect = getItemRect(index);
  if (!rect) return { w: 0, h: 0 };

  const width = rect.r - rect.l;
  const height = rect.b - rect.t;
  const next = getItemRect(index + 1);
  const prev = getItemRect(index - 1);

  if (next) {
    return { w: width + next.l - rect.r, h: height + next.t - rect.b };
  }

  if (prev) {
    return { w: width + rect.l - prev.r, h: height + rect.t - prev.b };
  }

  return { w: width, h: height };
};

const getCSSProperty = (value: string): number => {
  if (!value) return 0;
  return +value.substring(0, value.length - 2);
};

const getScrollRect = (scrollEl: HTMLElement | undefined | null): Rect | undefined => {
  if (!scrollEl) return undefined;
  const scrollRect = scrollEl.getBoundingClientRect();

  return {
    t: scrollRect.top + getCSSProperty(window.getComputedStyle(scrollEl).paddingTop),
    b: scrollRect.bottom - getCSSProperty(window.getComputedStyle(scrollEl).paddingBottom),
    l: scrollRect.left + getCSSProperty(window.getComputedStyle(scrollEl).paddingLeft),
    r: scrollRect.right - getCSSProperty(window.getComputedStyle(scrollEl).paddingRight),
    w: scrollEl.scrollWidth - scrollEl.offsetWidth,
    h: scrollEl.scrollHeight - scrollEl.offsetHeight,
  };
};

const getItemRect = (
  item: HTMLElement,
  scrollEl: HTMLElement | null | undefined,
  initial: { x: number; y: number },
): Rect => {
  const rect = item.getBoundingClientRect();
  const delta = {
    x: scrollEl ? scrollEl.scrollLeft - initial.x : 0,
    y: scrollEl ? scrollEl.scrollTop - initial.y : 0,
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

const getLimits = (indices: number[], getItemRect: (index: number) => Rect | undefined): Bounds | undefined => {
  const rects = indices.map(getItemRect);
  if (rects.some((rect) => !rect)) return;

  const limits = (rects as Rect[]).reduce(
    (acc, rect) => {
      acc.t.push(rect.t);
      acc.b.push(rect.b);
      acc.l.push(rect.l);
      acc.r.push(rect.r);
      return acc;
    },
    { t: [], l: [], r: [], b: [] } as {
      t: number[];
      b: number[];
      l: number[];
      r: number[];
    },
  );

  return {
    t: Math.min(...limits.t),
    r: Math.max(...limits.r),
    b: Math.max(...limits.b),
    l: Math.min(...limits.l),
  };
};

const checkY = (y: number, rect?: Rect) => rect && y > rect.t && y < rect.b;
const checkX = (x: number, rect?: Rect) => rect && x > rect.l && x < rect.r;

const getHoveredProps = (position: Position, rects: (Rect | undefined)[]): [number, 0 | 1] => {
  let hover: number;
  let direction: 0 | 1;
  const res = rects.reduce((acc, rect, index) => {
    if (checkY(position.y, rect)) acc.push(index);
    return acc;
  }, [] as number[]);

  if (res.length > 1) {
    direction = 1;
    hover = res.find((index) => checkX(position.x, rects[index])) ?? -1;
  } else {
    direction = 0;
    hover = res[0] ?? -1;
  }

  return [hover, direction];
};
