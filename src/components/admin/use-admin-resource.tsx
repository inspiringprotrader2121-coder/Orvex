"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { getErrorMessage } from "@/lib/errors";

type UseAdminResourceOptions = {
  endpoint?: string;
  buildEndpoint?: () => string;
  eventNames?: string[];
  pollMs?: number;
  dependencies?: Array<unknown>;
};

export function useAdminResource<T>(initialData: T, options: UseAdminResourceOptions) {
  const { socket } = useSocket();
  const [data, setData] = useState<T>(initialData);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { buildEndpoint, dependencies, endpoint, eventNames, pollMs } = options;
  const dependenciesKey = useMemo(() => JSON.stringify(dependencies ?? []), [dependencies]);

  const refresh = useCallback(async () => {
    const resolvedEndpoint = buildEndpoint ? buildEndpoint() : endpoint;
    if (!resolvedEndpoint) {
      throw new Error("Admin resource endpoint is required");
    }

    setLoading(true);
    try {
      const response = await fetch(resolvedEndpoint, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load ${resolvedEndpoint}`);
      }

      const nextData = await response.json() as T;
      setData(nextData);
      setError("");
    } catch (refreshError) {
      setError(getErrorMessage(refreshError, "Failed to refresh admin data"));
    } finally {
      setLoading(false);
    }
  }, [buildEndpoint, endpoint]);

  useEffect(() => {
    if (!dependencies || dependencies.length === 0) {
      return;
    }

    void refresh();
  }, [dependencies, dependenciesKey, refresh]);

  useEffect(() => {
    if (!pollMs) {
      return;
    }

    const interval = window.setInterval(() => {
      void refresh();
    }, pollMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [pollMs, refresh]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const events = eventNames ?? ["admin.data.changed"];
    const handleEvent = () => {
      void refresh();
    };

    for (const eventName of events) {
      socket.on(eventName, handleEvent);
    }

    return () => {
      for (const eventName of events) {
        socket.off(eventName, handleEvent);
      }
    };
  }, [eventNames, refresh, socket]);

  return {
    data,
    error,
    loading,
    refresh,
    setData,
  };
}
