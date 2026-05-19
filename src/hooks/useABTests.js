import { useAppContext } from '../context/AppContext'
import { generateId } from '../utils/idGenerator'

export function useABTests() {
  const { state, dispatch } = useAppContext()
  const tests = state?.abTests || []

  function getTestById(id) {
    return tests.find((t) => t.id === id) || null
  }

  function createTest(data) {
    const now = new Date().toISOString()
    const test = {
      id: generateId('ab'),
      name: data.name,
      promptId: data.promptId,
      status: 'draft',
      variants: data.variants || [
        { id: 'var_a', label: '对照组 (A)', versionId: data.versionAId, trafficPercent: 50 },
        { id: 'var_b', label: '实验组 (B)', versionId: data.versionBId, trafficPercent: 50 },
      ],
      schedule: {
        startTime: data.startTime || null,
        endTime: data.endTime || null,
      },
      targeting: {
        userType: data.userType || 'all',
        countryTier: data.countryTier || [],
        gender: data.gender || [],
      },
      createdAt: now,
      startedAt: null,
      endedAt: null,
    }
    dispatch({ type: 'ADD_AB_TEST', payload: test })
    return test
  }

  function startTest(id) {
    const test = getTestById(id)
    if (!test) return null
    const updated = { ...test, status: 'running', startedAt: new Date().toISOString() }
    dispatch({ type: 'UPDATE_AB_TEST', payload: updated })
    return updated
  }

  function pauseTest(id) {
    const test = getTestById(id)
    if (!test) return null
    const updated = { ...test, status: 'paused' }
    dispatch({ type: 'UPDATE_AB_TEST', payload: updated })
    return updated
  }

  function completeTest(id, results) {
    const test = getTestById(id)
    if (!test) return null
    const updated = {
      ...test,
      status: 'completed',
      endedAt: new Date().toISOString(),
      results: results || null,
    }
    dispatch({ type: 'UPDATE_AB_TEST', payload: updated })
    return updated
  }

  function updateTestTraffic(id, variantId, percent) {
    const test = getTestById(id)
    if (!test) return null
    const updated = {
      ...test,
      variants: test.variants.map((v) => {
        if (v.id === variantId) return { ...v, trafficPercent: percent }
        return { ...v, trafficPercent: 100 - percent }
      }),
    }
    dispatch({ type: 'UPDATE_AB_TEST', payload: updated })
    return updated
  }

  function updateTest(id, data) {
    const test = getTestById(id)
    if (!test) return null
    const updated = {
      ...test,
      name: data.name ?? test.name,
      promptId: data.promptId ?? test.promptId,
      variants: data.variants ?? test.variants,
      schedule: {
        startTime: data.startTime !== undefined ? (data.startTime || null) : test.schedule?.startTime,
        endTime: data.endTime !== undefined ? (data.endTime || null) : test.schedule?.endTime,
      },
      targeting: {
        userType: data.userType ?? test.targeting?.userType ?? 'all',
        countryTier: data.countryTier ?? test.targeting?.countryTier ?? [],
        gender: data.gender ?? test.targeting?.gender ?? [],
      },
    }
    dispatch({ type: 'UPDATE_AB_TEST', payload: updated })
    return updated
  }

  function deleteTest(id) {
    dispatch({ type: 'DELETE_AB_TEST', payload: id })
  }

  return { tests, getTestById, createTest, updateTest, startTest, pauseTest, completeTest, updateTestTraffic, deleteTest }
}
