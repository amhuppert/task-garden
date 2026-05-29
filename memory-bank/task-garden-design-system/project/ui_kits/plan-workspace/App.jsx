// App shell wiring toolbar + canvas + details.
const { useState: useStateApp } = React;

function App() {
  const [state, setState] = useStateApp({
    query: "",
    statusFilter: new Set(),
    priorityFilter: new Set(),
    laneFilter: new Set(),
    scope: "all",
    colorBy: "status",
    overlay: "off",
    selectedId: "analysis-engine",
  });
  return (
    <div
      className="atlas-page"
      style={{ display: "flex", height: "100%", minHeight: "100vh" }}
    >
      <Toolbar state={state} setState={setState} />
      <GraphCanvas state={state} setState={setState} />
      <DetailsPanel state={state} setState={setState} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
