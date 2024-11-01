import { useCallback, useState } from "react";
import ReactDOM from "react-dom/client";
import { HandleItem, NumberItem, SimpleItem } from "lists";
import { Title } from "title";
import { Sorta, SortaEvent } from "react-sorta";
import "index.css";

const App = () => {
  const [list, setList] = useState(["Apple", "Banana", "Orange", "Kiwi", "Pear"]);

  const handleSortEnd = useCallback(({ order }: SortaEvent) => {
    setList((current) => order.map((index) => current[index]));
  }, []);

  return (
    <div id="container">
      <Title />
      <div id="lists">
        <div className="list">
          <Sorta onSortEnd={handleSortEnd}>
            {list.map((val, i) => (
              <SimpleItem index={i} key={val}>
                {val}
              </SimpleItem>
            ))}
          </Sorta>
        </div>
        <div className="list">
          <Sorta onSortEnd={handleSortEnd}>
            {list.map((val, i) => (
              <HandleItem index={i} key={val}>
                {val}
              </HandleItem>
            ))}
          </Sorta>
        </div>
        <div className="list">
          <Sorta onSortEnd={handleSortEnd}>
            {list.map((val, i) => (
              <NumberItem index={i} key={val}>
                {val}
              </NumberItem>
            ))}
          </Sorta>
        </div>

        {/*<div className="list">*/}
        {/*  <Sorta onSortEnd={handleListSortEnd}>*/}
        {/*    {list.map((value, index) => (*/}
        {/*      <ItemVertical key={value} index={index} value={value} />*/}
        {/*    ))}*/}
        {/*  </Sorta>*/}
        {/*</div>*/}
        {/*<div className="list -scroll" ref={scrollRef}>*/}
        {/*  <Sorta onSortEnd={handleLongSortEnd} scrollRef={scrollRef}>*/}
        {/*    {long.map((value, index) => (*/}
        {/*      <ItemVerticalHandle key={value} index={index} value={value} />*/}
        {/*    ))}*/}
        {/*  </Sorta>*/}
        {/*</div>*/}

        {/*<Sorta*/}
        {/*  onSortEnd={handleLongSortEnd}*/}
        {/*  count={long.length}*/}
        {/*  scrollRef={virtScrollRef}*/}
        {/*  clone={(*/}
        {/*    translate: {*/}
        {/*      x: number;*/}
        {/*      y: number;*/}
        {/*    },*/}
        {/*    element: HTMLElement,*/}
        {/*  ) => {*/}
        {/*    element.style.marginTop = `${translate.y}px`;*/}
        {/*    element.parentElement !== virtContentRef.current && virtContentRef.current?.appendChild(element);*/}
        {/*  }}>*/}
        {/*  <FixedSizeList*/}
        {/*    height={330}*/}
        {/*    width={200}*/}
        {/*    itemCount={long.length}*/}
        {/*    itemSize={50}*/}
        {/*    outerRef={virtScrollRef}*/}
        {/*    innerRef={virtContentRef}>*/}
        {/*    {({ index, style }) => (*/}
        {/*      <ItemVerticalVirtual value={long[index]} key={long[index]} index={index} style={style} />*/}
        {/*    )}*/}
        {/*  </FixedSizeList>*/}
        {/*</Sorta>*/}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<App />);
