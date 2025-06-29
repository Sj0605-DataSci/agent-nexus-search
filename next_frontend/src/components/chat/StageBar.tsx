// components/chat/StageBar.tsx

import { Stage } from "./MessageBubble";

export default function StageBar({ stage }: { stage: Stage | undefined }) {
  const labelMap = {
    thinking: "Thinking…",
    searching: "Searching sources…",
    answering: "Generating answer…",
    done: "",
  };
  if (!stage || stage === "done") return null;

  return (
    <div
      className="mb-4 flex items-center space-x-2 text-xs font-medium
                    text-blue-600 dark:text-blue-400"
    >
      {/* animated dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
      </span>
      <span>{labelMap[stage]}</span>
    </div>
  );
}
