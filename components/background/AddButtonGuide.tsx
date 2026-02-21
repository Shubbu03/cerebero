import React from "react";

const PointingArrowIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="animate-pulse"
    style={{ overflow: "visible" }}
  >
    <defs>
      <marker
        id="arrowhead"
        viewBox="0 0 10 10"
        refX="5"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 5 5 L 0 10" stroke="currentColor" strokeWidth="2" />
      </marker>
    </defs>

    <path
      d="M12 10 Q 24 12, 34 34"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      markerEnd="url(#arrowhead)"
    />
  </svg>
);

const AddHintArrow = () => {
  return (
    <div className="pointer-events-none fixed bottom-[150px] right-3 z-10 hidden items-center gap-2 text-foreground sm:bottom-[92px] sm:right-[72px] sm:flex">
      <span className="rounded-lg border border-border/60 bg-card/80 px-2 py-1 text-sm font-medium text-foreground">
        Add something here...
      </span>
      <PointingArrowIcon />
    </div>
  );
};

export default AddHintArrow;
