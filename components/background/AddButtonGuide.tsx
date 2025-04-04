import { useEffect, useState } from "react";

export default function ArrowPointer() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 right-8 flex items-center gap-2 animate-pulse">
      <div className="bg-white/90 text-black px-4 py-2 rounded-lg shadow-lg font-medium">
        Add something here...
      </div>
      <div className="relative">
        <svg
          width="60"
          height="40"
          viewBox="0 0 60 40"
          className="text-white animate-bounce"
        >
          <path
            d="M5 20 L45 20 L35 10 M45 20 L35 30"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
