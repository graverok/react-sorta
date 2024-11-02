import React, { useCallback, useState } from "react";
import { Sorta, SortaEvent, useSorta } from "../../src";
import "./number.css";
import "./handle.css";

export const NumberList = () => {
  const [list, setList] = useState(["Apple", "Banana", "Orange", "Kiwi", "Pear"]);

  const handleSortEnd = useCallback(({ order }: SortaEvent) => {
    setList((current) => order.map((index) => current[index]));
  }, []);

  return (
    <div className="list">
      <Sorta onSortEnd={handleSortEnd}>
        {list.map((val, i) => (
          <Item index={i} key={val}>
            {val}
          </Item>
        ))}
      </Sorta>
    </div>
  );
};

const Item = (props: React.PropsWithChildren<{ index: number }>) => {
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
