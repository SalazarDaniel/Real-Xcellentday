"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "./api";

/** Carga un recurso de la API y expone `reload` para refrescarlo tras una acción. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(path !== null);

  // Carga al montar, al cambiar la ruta y cada vez que la página reaparece
  // (Activity vuelve a ejecutar los efectos). Se descartan respuestas de rutas anteriores.
  useEffect(() => {
    if (!path) return;
    let vigente = true;
    api<T>(path)
      .then((d) => {
        if (!vigente) return;
        setData(d);
        setError(null);
      })
      .catch((e: ApiError) => vigente && setError(e))
      .finally(() => vigente && setLoading(false));
    return () => {
      vigente = false;
    };
  }, [path]);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, [path]);

  return { data, setData, error, loading, reload };
}
