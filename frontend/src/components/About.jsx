import { HOW, NOTES, STACK } from "../data";
import { Line } from "./Prompt";
import Reveal from "./Reveal";
import { Cmds, Rows } from "./Rows";

export default function About() {
  return (
    <section id="about" className="wrap sec about">
      <Reveal>
        <div>
          <Line>pulse explain</Line>
          <div className="dim" style={{ marginBottom: 14 }}>psutil → FastAPI /stream → EventSource → React</div>
          <Rows rows={HOW} />
        </div>
      </Reveal>
      <Reveal>
        <div>
          <Line>pulse stack</Line>
          <div className="stack">
            {STACK.map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}>
                <span>{k}</span>
                <div>{v.map((x) => <span className="it" key={x}>{x}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
      <Reveal>
        <div>
          <Line>cat quickstart.md</Line>
          <p className="dim">Backend, di folder api:</p>
          <Cmds lines={["python3 -m venv venv", "source venv/bin/activate", "pip install -r requirements.txt", "uvicorn main:app --reload"]} />
          <p className="dim">Frontend, di terminal lain:</p>
          <Cmds lines={["npm install", "npm run dev"]} />
          <p className="dim">Lalu buka localhost:5173.</p>
        </div>
      </Reveal>
      <Reveal>
        <div>
          <Line>cat notes.md</Line>
          <Rows rows={NOTES} />
        </div>
      </Reveal>
    </section>
  );
}
