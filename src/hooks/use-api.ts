"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

export function useApi<T>(path: string | null, refreshMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));

  const refetch = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api<T>(path);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load data");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!refreshMs || !path) return;
    const id = setInterval(() => {
      void refetch();
    }, refreshMs);
    return () => clearInterval(id);
  }, [path, refreshMs, refetch]);

  return { data, error, loading, refetch, setData };
}
