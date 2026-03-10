"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";

export function LiveCreditValue({
  className = "",
  initialCredits,
}: {
  className?: string;
  initialCredits: number;
}) {
  const { socket } = useSocket();
  const [credits, setCredits] = useState(initialCredits);

  useEffect(() => {
    setCredits(initialCredits);
  }, [initialCredits]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleCreditsUpdated = (payload: { creditsAvailable: number }) => {
      if (typeof payload?.creditsAvailable === "number") {
        setCredits(payload.creditsAvailable);
      }
    };

    socket.on("credits.updated", handleCreditsUpdated);
    return () => {
      socket.off("credits.updated", handleCreditsUpdated);
    };
  }, [socket]);

  return <span className={className}>{credits}</span>;
}
