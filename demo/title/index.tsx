import React, { useCallback, useState } from "react";
import { Sorta, SortaEvent, useSorta } from "react-sorta";
import "./index.css";

export const Title = () => {
  const [list, setList] = useState(["s", "o", "r", "t", "a"]);

  const handleSortEnd = useCallback(({ order }: SortaEvent) => {
    setList((current) => order.map((index) => current[index]));
  }, []);

  return (
    <div id="title">
      <Sorta onSortEnd={handleSortEnd}>
        {list.map((val, i) => (
          <Item key={val} index={i}>
            {list[i]}
          </Item>
        ))}
      </Sorta>
    </div>
  );
};

const Item = (props: React.PropsWithChildren<{ index: number }>) => {
  const { isActive, ref, isSorting, onSortStart, translate } = useSorta(props.index);
  return (
    <span
      ref={ref}
      onMouseDown={onSortStart}
      aria-disabled={isSorting && !isActive}
      aria-current={isActive}
      style={{ left: translate.x }}>
      {props.children}
    </span>
  );
};
