

import { useState } from "react";
import Globe from "../../src/react/Globe";

export default function App() {
  const [animate, setAnimate] = useState(true);
  const [tilt, setTilt] = useState(23.5);

  return (
    <div style={{ fontFamily: "monospace", padding: 24 }}>
      <h2>ascii-globe React component</h2>

      {/* Animated globe with a pin */}
      <Globe
        animate={animate}
        size={1}
        land="#"
        water=" "
        tilt={tilt}
        speed={0.7}
        pins={[{ lat: 52.23, long: 21.01, char: "@" }]}
      />

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button onClick={() => setAnimate((a) => !a)}>
          {animate ? "Pause" : "Play"}
        </button>
        <label>
          Tilt: {tilt}°&nbsp;
          <input
            type="range"
            min={0}
            max={45}
            value={tilt}
            onChange={(e) => setTilt(Number(e.target.value))}
          />
        </label>
      </div>

      {/* Static globe at a fixed rotation */}
      <h3 style={{ marginTop: 32 }}>Static — rotation 250°</h3>
      <Globe rotation={250} size={0.8} land="*" water="-" />
    </div>
  );
}