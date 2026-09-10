import { useEffect, useRef, useCallback, useState } from "react";
const CDN_SRC = "https://cdn.jsdelivr.net/npm/ascii-globe";

function useAsciiGlobe() {
  const [GlobeLib, setGlobeLib] = useState(() => window.Globe ?? null);

  useEffect(() => {
    if (window.Globe) {
      setGlobeLib(() => window.Globe);
      return;
    }
    const existing = document.querySelector(`script[src="${CDN_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => setGlobeLib(() => window.Globe));
      return;
    }
    const script = document.createElement("script");
    script.src = CDN_SRC;
    script.onload = () => setGlobeLib(() => window.Globe);
    script.onerror = () => console.error("[Globe] Failed to load ascii-globe from CDN.");
    document.head.appendChild(script);
  }, []);

  return GlobeLib;
}

/**
 * <Globe> React component
 *
 * Props (mirrors ascii-globe options + React-specific additions):
 *
 * @param {number}   size         - Scale factor. 1 = 120×60 chars (default: 1)
 * @param {string}   land         - Land character (default: '#')
 * @param {string}   water        - Water character (default: '-')
 * @param {string}   background   - Outside-globe character (default: ' ')
 * @param {number}   margin       - Chars around the globe (default: 0)
 * @param {number}   marginBlock  - Vertical margin override
 * @param {number}   marginInline - Horizontal margin override
 * @param {string}   pin          - Default pin character (default: '@')
 * @param {number}   pinSize      - Default pin size multiplier (default: 1)
 * @param {Array}    pins         - [{lat, long, char?, size?}, …]
 * @param {number}   tilt         - Axial tilt in degrees (default: 0)
 * @param {number}   speed        - Rotation speed degrees/frame (default: 0.7)
 * @param {number|Array} rotation - Initial rotation: number or [h, v]
 * @param {boolean}  animate      - Auto-rotate the globe (default: false)
 * @param {Function} format       - Custom (type, length) => string formatter
 * @param {string}   map          - Base64 map data (defaults to built-in Earth)
 * @param {string}   className    - Extra CSS class on the <pre> element
 * @param {object}   style        - Inline styles for the <pre> element
 * @param {Function} onRender     - Called with the rendered string each frame
 */
export default function Globe({
  size = 1,
  land = "#",
  water = "-",
  background = " ",
  margin = 0,
  marginBlock,
  marginInline,
  pin = "@",
  pinSize = 1,
  pins,
  tilt = 0,
  speed = 0.7,
  rotation = 0,
  animate = false,
  format,
  map,
  className = "",
  style = {},
  onRender,
}) {
  const preRef = useRef(null);
  const rafRef = useRef(null);
  const rotRef = useRef(Array.isArray(rotation) ? rotation[0] : rotation);
  const GlobeLib = useAsciiGlobe();
  const globeRef = useRef(null);

  /* Stabilize pins array — only update the ref when contents change */
  const pinsRef = useRef(pins ?? []);
  const pinsJson = JSON.stringify(pins ?? []);
  useEffect(() => {
    pinsRef.current = pins ?? [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinsJson]);

  /* Build or rebuild the globe instance when options change */
  useEffect(() => {
    if (!GlobeLib) return;

    const opts = {
      size,
      land,
      water,
      background,
      margin,
      pin,
      pinSize,
      pins: pinsRef.current,
      tilt,
      speed,
    };
    if (marginBlock !== undefined) opts.marginBlock = marginBlock;
    if (marginInline !== undefined) opts.marginInline = marginInline;
    if (format) opts.format = format;
    if (map) opts.map = map;

    globeRef.current = new GlobeLib(opts);
  }, [
    GlobeLib,
    size,
    land,
    water,
    background,
    margin,
    marginBlock,
    marginInline,
    pin,
    pinSize,
    pinsJson,
    tilt,
    speed,
    format,
    map,
  ]);

  /* Render a single frame */
  const renderFrame = useCallback(() => {
    if (!globeRef.current || !preRef.current) return;
    const rot = Array.isArray(rotation)
      ? [rotRef.current, rotation[1]]
      : rotRef.current;
    const output = globeRef.current.render(rot);
    preRef.current.textContent = output;
    if (onRender) onRender(output);
  }, [rotation, onRender]);

  /* Animation loop */
  useEffect(() => {
    if (!GlobeLib) return;

    const tick = () => {
      if (!globeRef.current) return;
      rotRef.current = (rotRef.current + globeRef.current.speed) % 360;
      renderFrame();
      rafRef.current = requestAnimationFrame(tick);
    };

    if (animate) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      renderFrame();
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [GlobeLib, animate, renderFrame]);

  /* Sync static rotation when prop changes (non-animated mode) */
  useEffect(() => {
    if (!animate) {
      rotRef.current = Array.isArray(rotation) ? rotation[0] : rotation;
      renderFrame();
    }
  }, [rotation, animate, renderFrame]);

  return (
    <pre
      ref={preRef}
      className={className}
      style={{
        fontFamily: "monospace",
        lineHeight: 1,
        display: "inline-block",
        ...style,
      }}
    />
  );
}