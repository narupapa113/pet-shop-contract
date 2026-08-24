import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

const A4_MM = 210;
const PX_PER_MM = 3.7795;

const A4ScaledPreview = ({ children }) => {
  const wrapperRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(0);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const update = () => setInnerHeight(inner.scrollHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [children]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const compute = () => {
      const available = wrapper.clientWidth;
      if (available <= 0) return;
      const a4Px = A4_MM * PX_PER_MM;
      setScale(Math.min(1, available / a4Px));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(wrapper);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, []);

  const a4Px = A4_MM * PX_PER_MM;
  const scaledWidth = a4Px * scale;
  const scaledHeight = innerHeight * scale;

  return (
    <div
      ref={wrapperRef}
      className="a4-scaled-wrapper w-full overflow-hidden relative mx-auto"
      style={{
        height: scaledHeight > 0 ? scaledHeight : undefined,
        maxWidth: scaledWidth > 0 ? scaledWidth : undefined,
      }}
    >
      <div
        ref={innerRef}
        className="a4-scaled absolute top-0 left-0"
        style={{
          width: `${A4_MM}mm`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default A4ScaledPreview;
