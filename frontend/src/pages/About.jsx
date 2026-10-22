import { Line } from "../components/Prompt";
import { Cmds, Rows } from "../components/Rows";
import { FEATURES, HOW, NOTES, STACK } from "../data";

export default function About() {
  return (
    <div className="about">
      <section className="card">
        <Line>pulse explain</Line>
        <div className="dim gap">psutil → FastAPI /stream → EventSource → React</div>
        <Rows rows={HOW} />
      </section>
      <section className="card">
        <Line>pulse features</Line>
        <Rows rows={FEATURES} />
      </section>
      <section className="card">
        <Line>pulse stack</Line>
        <div className="stack">
          {STACK.map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <span>{k}</span>
              <div>{v.map((x) => <span className="it" key={x}>{x}</span>)}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <Line>cat quickstart.md</Line>
        <p className="dim">Dengan container (Podman atau Docker):</p>
        <Cmds lines={["podman compose up -d --build"]} />
        <p className="dim">Lalu buka localhost:8080. Untuk pengembangan, backend di folder api:</p>
        <Cmds lines={["python3 -m venv venv", "source venv/bin/activate", "pip install -r requirements.txt", "uvicorn main:app --reload"]} />
        <p className="dim">Frontend di terminal lain, lalu buka localhost:5173:</p>
        <Cmds lines={["npm install", "npm run dev"]} />
      </section>
      <section className="card">
        <Line>cat notes.md</Line>
        <Rows rows={NOTES} />
      </section>
    </div>
  );
}
