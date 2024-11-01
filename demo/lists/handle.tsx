import React from "react";
import { useSorta } from "react-sorta";
import "./handle.css";

export const HandleItem = (props: React.PropsWithChildren<{ index: number }>) => {
  const { isActive, ref, isSorting, onSortStart, translate } = useSorta(props.index);
  return (
    <span
      ref={ref}
      className={`item -handle`}
      aria-current={isActive}
      aria-disabled={isSorting && !isActive}
      style={{ transform: `translate(${translate.x}px, ${translate.y}px)` }}>
      <i onMouseDown={onSortStart} className="material-symbols-outlined">
        menu
      </i>
      {props.children}
    </span>
  );
};
