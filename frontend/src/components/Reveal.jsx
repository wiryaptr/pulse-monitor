import { useRef } from "react";
import { useInView } from "../hooks";

export default function Reveal({ children }) {
  const ref = useRef(null);
  const seen = useInView(ref);
  return <div ref={ref} className={`rv ${seen ? "shown" : ""}`}>{children}</div>;
}
