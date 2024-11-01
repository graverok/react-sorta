import React from "react";
import { useSorta } from "react-sorta";
import "./number.css";

export const NumberItem = (props: React.PropsWithChildren<{ index: number }>) => {
  const { isActive, ref, isSorting, onSortStart, translate } = useSorta(props.index);
  return (
    <span ref={ref} className="item -handle -number" aria-current={isActive} aria-disabled={isSorting && !isActive}>
      <i
        onMouseDown={onSortStart}
        className="material-symbols-outlined"
        style={{ transform: `translate(${translate.x}px, ${translate.y}px)` }}>
        menu
      </i>
      <strong>{props.index + 1}.</strong>
      <span style={{ transform: `translate(${translate.x}px, ${translate.y}px)` }}>{props.children}</span>
    </span>
  );
};
