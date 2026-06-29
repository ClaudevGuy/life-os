import { WhiteboardCanvas } from "@/components/whiteboard/whiteboard-canvas";

export default function WhiteboardPage() {
  return (
    <div className="h-[calc(100vh-61px)] w-full">
      <WhiteboardCanvas />
    </div>
  );
}
