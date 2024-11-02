import ReactDOM from "react-dom/client";
import { HandleList, NumberList, ScrollList, SimpleList, VirtualList } from "./lists";
import { Title } from "./title";
import "./index.css";

const App = () => {
  return (
    <div id="container">
      <div style={{ textAlign: "center" }}>
        <Title />
        <a href="https://github.com/graverok/react-sorta?tab=readme-ov-file#readme">See docs</a>
      </div>
      <div id="lists">
        <SimpleList />
        <HandleList />
        <NumberList />
      </div>
      <div id="lists-scroll">
        <ScrollList />
        <VirtualList />
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<App />);
