import MetricsChart from "./MetricsChart";
import About from "./components/About";
import { Line } from "./components/Prompt";
import Reveal from "./components/Reveal";
import { Rows } from "./components/Rows";
import Terminal from "./components/Terminal";
import { REDUCED, REPO } from "./config";
import { FEATURES, STATUS } from "./data";
import { useActiveSection, useMetrics, useTheme, useTyper } from "./hooks";
import "./App.css";

const SECTIONS = ["home", "about"];

export default function App() {
  const { metrics, history, setHistory, status, paused, setPaused } = useMetrics();
  const [theme, setTheme] = useTheme();
  const [active, setActive] = useActiveSection(SECTIONS);
  const [cmd, cmdDone] = useTyper("pulse watch", true);
  const [statusText, tone] = STATUS[status];

  const go = (id) => {
    if (SECTIONS.includes(id)) setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
  };

  return (
    <>
      <nav className="bar">
        <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); go("home"); }}>
          <span className={`live ${tone}`} />pulse
        </a>
        <div className="tabs">
          {SECTIONS.map((id) => (
            <button key={id} className={active === id ? "on" : ""} onClick={() => go(id)}>{id}</button>
          ))}
        </div>
        <span className={`conn ${tone}`}>{statusText}</span>
      </nav>

      <main className="page">
        <div id="home">
          <header className="wrap hero">
            <div className="hero-text">
              <div className="whoami"><span className="dim">$ </span>{cmd}{!cmdDone && <span className="cur" />}</div>
              {cmdDone && (
                <div className="reveal">
                  <h1>Lihat CPU, RAM, dan disk server secara langsung.</h1>
                  <p className="lead">Pulse Monitor membaca metrik mesin yang menjalankannya dan menampilkannya real-time di browser, tanpa database. Coba terminal di sebelah, ketik help untuk melihat perintahnya.</p>
                  <div className="actions">
                    <button className="btn main" onClick={() => go("fitur")}>[lihat fitur]</button>
                    <button className="btn" onClick={() => go("about")}>[cara kerja]</button>
                    <a className="btn" href={REPO} target="_blank" rel="noreferrer">[github]</a>
                  </div>
                </div>
              )}
            </div>
            <Terminal
              metrics={metrics} history={history} setHistory={setHistory}
              status={status} paused={paused} setPaused={setPaused}
              theme={theme} setTheme={setTheme} go={go}
            />
          </header>

          <section id="grafik" className="wrap sec">
            <Reveal>
              <Line>pulse graph --watch</Line>
              <div className="dim">60 pembacaan terakhir, update tiap 2 detik.</div>
              <div className="panel"><MetricsChart history={history} /></div>
            </Reveal>
          </section>

          <section id="fitur" className="wrap sec">
            <Reveal>
              <Line>pulse features</Line>
              <Rows rows={FEATURES} />
            </Reveal>
          </section>
        </div>

        <About />

        <footer className="wrap foot">
          Pulse Monitor, 2026. <a href={REPO} target="_blank" rel="noreferrer">Kode di GitHub</a>.
        </footer>
      </main>
    </>
  );
}
