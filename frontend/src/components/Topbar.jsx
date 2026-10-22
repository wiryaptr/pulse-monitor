import { ROUTES, STATUS } from "../data";
import { THEME_NAMES } from "../themes";

export default function Topbar({ route, status, theme, setTheme }) {
  const current = ROUTES.find((r) => r.id === route);
  const [text, tone] = STATUS[status];
  return (
    <header className="topbar">
      <span className="top-brand" aria-hidden="true"><span className={`live ${tone}`} />pulse</span>
      <div className="top-title">
        <h1>{current.label}</h1>
        <p className="dim">{current.hint}</p>
      </div>
      <div className="top-actions">
        <span className={`chip ${tone}`}><i aria-hidden="true" />{text}</span>
        <label className="theme-pick">
          <span>Tema</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            {THEME_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
    </header>
  );
}
