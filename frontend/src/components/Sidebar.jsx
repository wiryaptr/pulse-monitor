import { REPO } from "../config";
import { ROUTES, STATUS } from "../data";
import Icon from "./Icon";

// Navigasi utama. Di layar sempit tampil sebagai bilah bawah (diatur di CSS).
export default function Sidebar({ route, status, metrics }) {
  const [text, tone] = STATUS[status];
  return (
    <aside className="sidebar">
      <a className="brand" href="#/overview">
        <span className={`live ${tone}`} aria-hidden="true" />pulse<span className="dim"> monitor</span>
      </a>
      <nav aria-label="Navigasi utama">
        <ul>
          {ROUTES.map((r) => (
            <li key={r.id}>
              <a className="nav-item" href={`#/${r.id}`} aria-current={route === r.id ? "page" : undefined}>
                <Icon name={r.id} /><span>{r.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="side-foot">
        <div className="side-status"><span className={`live ${tone}`} aria-hidden="true" />{text}</div>
        {metrics && <div className="dim">{metrics.host.hostname}</div>}
        <a href={REPO} target="_blank" rel="noreferrer">Kode di GitHub</a>
      </div>
    </aside>
  );
}
