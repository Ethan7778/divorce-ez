import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { UserProgress } from '../types'
import { useAuth } from './useAuth'

export const useProgress = () => {
  const { user } = useAuth()
  const [progress, setProgress] = useState<UserProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchProgress()
    }
  }, [user])

  const fetchProgress = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error
      setProgress(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateModule = async (moduleName: string, completed: boolean) => {
    if (!user) {
      setError('User not authenticated.')
      return
    }
    setError(null)
    try {
      const status = completed ? 'completed' : 'in_progress'
      const percentage = completed ? 100 : 50

      const { data, error } = await supabase
        .from('user_progress')
        .upsert(
          {
            user_id: user.id,
            module_name: moduleName,
            status: status,
            progress_percentage: percentage,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'user_id,module_name' }
        )
        .select()
        .single()

      if (error) throw error

      // Update local state
      setProgress((prev) => {
        const existingIndex = prev.findIndex((p) => p.module_name === moduleName)
        if (existingIndex > -1) {
          const newProgress = [...prev]
          newProgress[existingIndex] = data
          return newProgress
        }
        return [...prev, data]
      })
    } catch (err: any) {
      setError(err.message)
    }
  }

  const getModuleProgress = (moduleName: string) => {
    return progress.find((p) => p.module_name === moduleName)
  }

  const getOverallProgressPercentage = () => {
    if (progress.length === 0) return 0
    const totalModules = 6
    const completedModules = progress.filter((p) => p.status === 'completed').length
    return Math.round((completedModules / totalModules) * 100)
  }

  return {
    progress,
    loading,
    error,
    fetchProgress,
    updateModule,
    getModuleProgress,
    getOverallProgressPercentage,
  }
}
