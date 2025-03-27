import { TexturedBackground } from "@/components/background/TexturedBackground";
import { FloatingDock } from "@/components/FloatingDock";

export default function Dashboard() {
  return (
    <>
      <TexturedBackground className="min-h-screen" dotPattern>
        <h2 className="text-white">dashboard</h2>
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10">
          <FloatingDock />
        </div>
      </TexturedBackground>
    </>
  );
}
