import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../api/client'

/** Carga un recurso de la API y expone `reload` para refrescarlo tras una acción. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!path) return
    setLoading(true)
    try {
      setData(await api<T>(path))
      setError(null)
    } catch (e) {
      setError(e as ApiError)
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, setData, error, loading, reload }
}
