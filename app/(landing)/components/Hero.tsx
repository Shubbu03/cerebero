"use client";

import { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import Link from "next/link";
import NeuronBackground, {
  COLORS,
} from "@/components/background/NeuronBackground";

export default function Hero() {
  const textControls = useAnimation();
  const buttonControls = useAnimation();

  useEffect(() => {
    const sequence = async () => {
      await textControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.8 },
      });
      await buttonControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 },
      });
    };

    sequence();
  }, [textControls, buttonControls]);

  return (
    <NeuronBackground className="w-full h-screen">
      <div className="flex flex-col items-center justify-center h-full text-white px-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={textControls}
        >
          <h1
            className="text-6xl md:text-8xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-silver-400 to-cardinal-500"
            style={{
              backgroundImage: `linear-gradient(150deg, ${COLORS.silver} 45%, ${COLORS.cardinal} 55%)`,
              letterSpacing: "-0.02em",
            }}
          >
            Cerebero
          </h1>
          <p
            className="text-xl md:text-3xl font-light text-silver-300 max-w-2xl mx-auto mb-10"
            style={{ color: COLORS.silver, letterSpacing: "0.02em" }}
          >
            Your digital cerebrum. Think better.
          </p>
        </motion.div>
        <motion.div
          className="flex flex-col sm:flex-row gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={buttonControls}
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-xl"
              initial={{ opacity: 0 }}
              whileHover={{
                opacity: 1,
                scale: 1.05,
              }}
              style={{
                border: `2px solid ${COLORS.cardinal}`,
              }}
            />

            <motion.div
              className="absolute bottom-0 left-0 right-0 h-1/2 rounded-b-xl"
              initial={{ opacity: 0 }}
              whileHover={{
                opacity: 0.6,
              }}
              style={{
                background: `radial-gradient(ellipse at center bottom, ${COLORS.cardinal}, transparent 70%)`,
                filter: "blur(8px)",
                transform: "translateY(40%)",
                zIndex: 0,
              }}
            />
            <Link href="/signup">
              <motion.button
                className="text-white px-6 py-3 text-lg rounded-xl cursor-pointer relative z-10"
                whileHover={{
                  scale: 1.02,
                }}
                whileTap={{
                  scale: 0.98,
                  boxShadow: "inset 0px 2px 6px rgba(0, 0, 0, 0.3)",
                }}
                style={{
                  background: `linear-gradient(135deg, ${COLORS.cardinal}, #A01F37)`,
                  borderColor: "transparent",
                  transform: "translateZ(0)",
                }}
              >
                Get Started
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>
    </NeuronBackground>
  );
}
