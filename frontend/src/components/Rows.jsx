export const Rows = ({ rows }) => (
  <div className="kv">
    {rows.map(([k, v]) => (
      <div key={k} style={{ display: "contents" }}><span>{k}</span><span>{v}</span></div>
    ))}
  </div>
);

export const Cmds = ({ lines }) => (
  <pre className="code">{lines.map((l) => <div key={l}><span className="dim">$ </span>{l}</div>)}</pre>
);
