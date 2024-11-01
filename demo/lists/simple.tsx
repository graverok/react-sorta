import React from "react";
import { useSorta } from "react-sorta";
import "./simple.css";

export const SimpleItem = (props: React.PropsWithChildren<{ index: number }>) => {
  const { isActive, ref, isSorting, onSortStart, translate } = useSorta(props.index);
  return (
    <span
      ref={ref}
      onMouseDown={onSortStart}
      className="item -simple"
      aria-disabled={isSorting && !isActive}
      aria-current={isActive}
      style={{ transform: `translate(${translate.x}px, ${translate.y}px)` }}>
      {props.children}
    </span>
  );
};
