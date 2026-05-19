export function generateMockABTests() {
  return [
    {
      id: 'ab_001',
      name: '场景开场白叙事风格测试',
      promptId: 'p_003',
      status: 'running',
      variants: [
        {
          id: 'var_a',
          label: '简洁开场（对照组）',
          versionId: 'v_006',
          trafficPercent: 60
        },
        {
          id: 'var_b',
          label: '沉浸式开场（实验组）',
          versionId: 'v_007',
          trafficPercent: 40
        }
      ],
      metrics: {
        primaryMetric: 'sessionDuration',
        secondaryMetrics: ['messageCount', 'userRetention']
      },
      createdAt: '2026-04-19T10:00:00Z',
      startedAt: '2026-04-20T00:00:00Z',
      endedAt: null,
      schedule: {
        startTime: '2026-04-20T00:00:00Z',
        endTime: null,
      },
      targeting: {
        userType: 'new',
        countryTier: ['A'],
        gender: [],
      },
    },
    {
      id: 'ab_002',
      name: '角色扮演 System Prompt 沉浸感测试',
      promptId: 'p_001',
      status: 'completed',
      variants: [
        {
          id: 'var_c',
          label: '基础规则版',
          versionId: 'v_002',
          trafficPercent: 50
        },
        {
          id: 'var_d',
          label: '完整沉浸版',
          versionId: 'v_003',
          trafficPercent: 50
        }
      ],
      metrics: {
        primaryMetric: 'userEngagement',
        secondaryMetrics: ['sessionDuration', 'returnRate']
      },
      results: {
        winner: 'var_d',
        confidence: 0.94,
        summary: '完整沉浸版（V3）在用户参与度上提升12%，平均会话时长增加8%，角色脱离率降低15%'
      },
      createdAt: '2026-04-08T14:00:00Z',
      startedAt: '2026-04-09T00:00:00Z',
      endedAt: '2026-04-16T00:00:00Z',
      schedule: {
        startTime: '2026-04-09T00:00:00Z',
        endTime: '2026-04-16T00:00:00Z',
      },
      targeting: {
        userType: 'all',
        countryTier: [],
        gender: [],
      },
    },
    {
      id: 'ab_003',
      name: '语气控制精细度三组测试',
      promptId: 'p_002',
      status: 'draft',
      variants: [
        {
          id: 'var_e',
          label: '当前版本 (A)',
          versionId: 'v_005',
          trafficPercent: 34
        },
        {
          id: 'var_f',
          label: '基础版 (B)',
          versionId: 'v_004',
          trafficPercent: 33
        },
        {
          id: 'var_g',
          label: '当前版本复本 (C)',
          versionId: 'v_005',
          trafficPercent: 33
        }
      ],
      metrics: {
        primaryMetric: 'userSatisfaction',
        secondaryMetrics: ['characterConsistency', 'emotionAccuracy']
      },
      createdAt: '2026-05-05T11:00:00Z',
      startedAt: null,
      endedAt: null,
      schedule: {
        startTime: '2026-05-20T00:00:00Z',
        endTime: '2026-06-20T00:00:00Z',
      },
      targeting: {
        userType: 'existing',
        countryTier: ['B', 'C'],
        gender: ['female'],
      },
    }
  ]
}
