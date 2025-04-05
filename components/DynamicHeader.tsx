"use client";

import { useState, useEffect } from "react";

interface DynamicHeaderProps {
  userName: string;
}

const getGreeting = (username: string): string => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) {
    return `Good morning, ${username}!`;
  } else if (currentHour < 18) {
    return `What's good ${username}?`;
  } else {
    return `How was your day, ${username}?`;
  }
};

export function DynamicHeader({ userName }: DynamicHeaderProps) {
  const [greeting, setGreeting] = useState<string>("");

  useEffect(() => {
    setGreeting(getGreeting(userName));
  }, [userName]);

  return (
    <div className="mb-6 md:mb-8">
      {" "}
      <h2 className="text-2xl md:text-3xl font-semibold text-white font-sans">
        {greeting}
      </h2>
    </div>
  );
}
