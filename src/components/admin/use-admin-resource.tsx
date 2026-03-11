"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { getErrorMessage } from "@/lib/errors";

type UseAdminResourceOptions = {
  endpoint?: string;
  buildEndpoint?: () => string;
  eventNames?: string[];
  pollMs?: number;
  dependencies?: Array<unknown>;
  eventDebounceMs?: number;
};

export function useAdminResource<T>(initialData: T, options: UseAdminResourceOptions) {
  const { socket } = useSocket();
  const [data, setData] = useState<T>(initialData);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inFlightRefresh = useRef<Promise<void> | null>(null);
  const pendingRefresh = useRef(false);
  const scheduledRefresh = useRef<number | null>(null);
  const { buildEndpoint, dependencies, endpoint, eventDebounceMs = 500, eventNames, pollMs } = options;
  const dependenciesKey = useMemo(() => JSON.stringify(dependencies ?? []), [dependencies]);

  const runRefresh = useCallback(async () => {
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

  const refresh = useCallback(async () => {
    if (inFlightRefresh.current) {
      pendingRefresh.current = true;
      return inFlightRefresh.current;
    }

    const refreshPromise = runRefresh().finally(() => {
      inFlightRefresh.current = null;
      if (pendingRefresh.current) {
        pendingRefresh.current = false;
        void refresh();
      }
    });

    inFlightRefresh.current = refreshPromise;
    return refreshPromise;
  }, [runRefresh]);

  const scheduleRefresh = useCallback(() => {
    if (scheduledRefresh.current !== null) {
      window.clearTimeout(scheduledRefresh.current);
    }

    scheduledRefresh.current = window.setTimeout(() => {
      scheduledRefresh.current = null;
      void refresh();
    }, eventDebounceMs);
  }, [eventDebounceMs, refresh]);

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
      scheduleRefresh();
    };

    for (const eventName of events) {
      socket.on(eventName, handleEvent);
    }

    return () => {
      for (const eventName of events) {
        socket.off(eventName, handleEvent);
      }
    };
  }, [eventNames, scheduleRefresh, socket]);

  useEffect(() => () => {
    if (scheduledRefresh.current !== null) {
      window.clearTimeout(scheduledRefresh.current);
    }
  }, []);

  return {
    data,
    error,
    loading,
    refresh,
    setData,
  };
}
