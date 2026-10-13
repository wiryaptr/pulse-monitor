export const Ps = () => (
  <>
    <span className="usr">tamu@pulse</span><span className="dim">:</span>
    <span className="dir">~</span><span className="dim">$ </span>
  </>
);
export const Line = ({ children }) => <div className="gap"><Ps />{children}</div>;
