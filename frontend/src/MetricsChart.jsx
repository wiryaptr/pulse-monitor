import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from "recharts";

export default function MetricsChart({ history }) {
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="time" />
          <YAxis domain={[0, 100]} unit="%" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="cpu" stroke="#22d3ee" dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="ram" stroke="#a78bfa" dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="disk" stroke="#f59e0b" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
