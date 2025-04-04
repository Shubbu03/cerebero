import React from "react";

const PointingArrowIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="animate-spring-bounce"
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
        <path d="M 0 0 L 5 5 L 0 10" stroke="white" strokeWidth="2" />
      </marker>
    </defs>

    <path
      d="M12 10 Q 24 12, 34 34"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      markerEnd="url(#arrowhead)"
    />
  </svg>
);

const AddHintArrow = () => {
  return (
    <div className="fixed bottom-[80px] right-[70px] flex items-center gap-2 z-10 pointer-events-none">
      <span className="text-white text-sm font-medium bg-black/30 px-2 py-1 rounded">
        Add something here...
      </span>
      <PointingArrowIcon />
    </div>
  );
};

export default AddHintArrow;
