import { TexturedBackground } from "@/components/background/TexturedBackground";
import { FloatingDock } from "@/components/FloatingDock";

export default function Dashboard() {
  return (
    <>
      <TexturedBackground className="min-h-screen" dotPattern>
        <h2 className="text-white">dashboard</h2>
        <FloatingDock />
      </TexturedBackground>
    </>
  );
}
