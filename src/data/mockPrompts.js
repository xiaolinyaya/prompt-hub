export function generateMockPrompts() {
  return [
    {
      id: 'p_001',
      name: '角色扮演 System Prompt',
      description: '角色扮演对话的核心系统提示词，定义AI如何扮演用户选择的角色，控制人设一致性和沉浸感',
      content: '你现在是 {{character_name}}，一个{{character_trait}}的角色。\n\n背景设定：{{backstory}}\n\n对话规则：\n1. 始终以第一人称回复，保持角色身份不脱离\n2. 根据角色性格调整语气和用词风格\n3. 当用户的对话涉及角色知识范围外的话题时，用符合角色身份的方式婉转回应\n4. 适当加入角色特有的口头禅或表情动作描写\n5. 记住之前的对话内容，保持上下文连贯',
      drafts: [],
      variables: ['character_name', 'character_trait', 'backstory'],
      tags: ['核心', '系统提示', '角色扮演', '人设'],
      category: 'Chat',
      subCategory: 'System_prompt',
      sourceType: 'db',
      status: 'online',
      currentVersionId: 'v_003',
      versions: [
        {
          id: 'v_003',
          versionNumber: 3,
          content: '你现在是 {{character_name}}，一个{{character_trait}}的角色。\n\n背景设定：{{backstory}}\n\n对话规则：\n1. 始终以第一人称回复，保持角色身份不脱离\n2. 根据角色性格调整语气和用词风格\n3. 当用户的对话涉及角色知识范围外的话题时，用符合角色身份的方式婉转回应\n4. 适当加入角色特有的口头禅或表情动作描写\n5. 记住之前的对话内容，保持上下文连贯',
          variables: ['character_name', 'character_trait', 'backstory'],
          createdAt: '2026-04-15T11:00:00Z',
          publishedAt: '2026-04-16T10:00:00Z',
          prodDeployedAt: '2026-04-16T10:00:00Z',
          prodDeployType: 'full',
          author: 'Lin',
          changeNote: '增加口头禅和上下文连贯规则，提升沉浸感'
        },
        {
          id: 'v_002',
          versionNumber: 2,
          content: '你现在是 {{character_name}}，一个{{character_trait}}的角色。背景设定：{{backstory}}\n\n请始终保持角色身份，以第一人称回复，根据角色性格调整语气。',
          variables: ['character_name', 'character_trait', 'backstory'],
          createdAt: '2026-04-08T14:30:00Z',
          publishedAt: '2026-04-09T09:00:00Z',
          prodDeployedAt: '2026-04-09T09:00:00Z',
          prodDeployType: 'full',
          author: 'Lin',
          changeNote: '加入背景设定变量，结构化对话规则'
        },
        {
          id: 'v_001',
          versionNumber: 1,
          content: '你现在是 {{character_name}}。请以这个角色的身份和用户对话，保持角色一致性。',
          variables: ['character_name'],
          createdAt: '2026-04-01T10:00:00Z',
          publishedAt: '2026-04-01T12:00:00Z',
          prodDeployedAt: '2026-04-01T12:00:00Z',
          prodDeployType: 'full',
          author: 'Lin',
          changeNote: '初始版本'
        }
      ],
      environments: {
        dev: { versionId: 'v_003', deployedAt: '2026-04-15T11:30:00Z' },
        test: { versionId: 'v_003', deployedAt: '2026-04-15T16:00:00Z' },
        prod: { versionId: 'v_003', deployedAt: '2026-04-16T10:00:00Z' }
      },
      createdAt: '2026-04-01T10:00:00Z',
      updatedAt: '2026-04-16T10:00:00Z'
    },
    {
      id: 'p_002',
      name: '对话语气控制',
      description: '控制角色回复的语气风格，支持从傲娇到温柔等多种风格切换，影响角色的措辞和表达方式',
      content: '在接下来的对话中，请以{{tone_style}}的语气回复。\n\n语气要求：\n- 情感强度：{{emotion_intensity}}（1-10，10为最强烈）\n- 是否使用颜文字：{{use_kaomoji}}\n- 特殊语气词：{{speech_particles}}\n\n示例回复风格：\n{{example_reply}}\n\n注意：语气变化要自然，不要生硬地堆砌语气词。根据对话内容灵活调整，在关键情节时可以适当加强情感表达。',
      drafts: [
        {
          id: 'd_001',
          name: '增加方言支持',
          content: '在接下来的对话中，请以{{tone_style}}的语气回复。\n\n语气要求：\n- 情感强度：{{emotion_intensity}}（1-10，10为最强烈）\n- 是否使用颜文字：{{use_kaomoji}}\n- 特殊语气词：{{speech_particles}}\n- 方言模式：{{dialect_mode}}\n\n示例回复风格：\n{{example_reply}}\n\n注意：语气变化要自然，不要生硬地堆砌语气词。方言模式下可混用方言词汇但保持可读性。',
          description: '增加方言模式支持，如东北话、四川话等',
          category: 'Chat',
          subCategory: 'Conversation_style',
          tags: ['语气', '风格', '方言'],
          createdAt: '2026-05-10T09:00:00Z',
          updatedAt: '2026-05-10T09:00:00Z',
        },
        {
          id: 'd_002',
          name: '精简版语气控制',
          content: '请以{{tone_style}}的语气回复，情感强度{{emotion_intensity}}/10。{{use_kaomoji}}使用颜文字。\n\n参考风格：{{example_reply}}',
          description: '精简版，减少 token 消耗',
          category: 'Chat',
          subCategory: 'Conversation_style',
          tags: ['语气', '精简', '省token'],
          createdAt: '2026-05-12T14:00:00Z',
          updatedAt: '2026-05-12T14:00:00Z',
        }
      ],
      variables: ['tone_style', 'emotion_intensity', 'use_kaomoji', 'speech_particles', 'example_reply'],
      tags: ['语气', '风格', '对话控制', '情感'],
      category: 'Chat',
      subCategory: 'Conversation_style',
      sourceType: 'hardcode',
      status: 'online',
      currentVersionId: 'v_005',
      versions: [
        {
          id: 'v_005',
          versionNumber: 2,
          content: '在接下来的对话中，请以{{tone_style}}的语气回复。\n\n语气要求：\n- 情感强度：{{emotion_intensity}}（1-10，10为最强烈）\n- 是否使用颜文字：{{use_kaomoji}}\n- 特殊语气词：{{speech_particles}}\n\n示例回复风格：\n{{example_reply}}\n\n注意：语气变化要自然，不要生硬地堆砌语气词。根据对话内容灵活调整，在关键情节时可以适当加强情感表达。',
          variables: ['tone_style', 'emotion_intensity', 'use_kaomoji', 'speech_particles', 'example_reply'],
          createdAt: '2026-04-12T15:00:00Z',
          publishedAt: '2026-04-13T09:00:00Z',
          prodDeployedAt: '2026-04-13T09:00:00Z',
          prodDeployType: 'full',
          author: 'Lin',
          changeNote: '增加情感强度和颜文字控制，优化自然度提示'
        },
        {
          id: 'v_004',
          versionNumber: 1,
          content: '请以{{tone_style}}的语气回复用户。使用以下语气词：{{speech_particles}}',
          variables: ['tone_style', 'speech_particles'],
          createdAt: '2026-04-03T09:00:00Z',
          publishedAt: '2026-04-03T14:00:00Z',
          author: 'Lin',
          changeNote: '基础语气控制版本'
        }
      ],
      environments: {
        dev: { versionId: 'v_005', deployedAt: '2026-04-12T16:00:00Z' },
        test: { versionId: 'v_005', deployedAt: '2026-04-12T18:00:00Z' },
        prod: { versionId: 'v_005', deployedAt: '2026-04-13T09:00:00Z' }
      },
      createdAt: '2026-04-03T09:00:00Z',
      updatedAt: '2026-05-12T14:00:00Z'
    },
    {
      id: 'p_003',
      name: '场景开场白',
      description: '角色进入新场景时的开场描述，渲染环境氛围并引导用户进入故事情境，支持AB测试不同叙事风格',
      content: '【场景切换】\n\n{{scene_description}}\n\n*{{character_name}}{{character_action}}*\n\n{{opening_dialogue}}\n\n（当前场景氛围：{{mood}}）',
      drafts: [],
      variables: ['scene_description', 'character_name', 'character_action', 'opening_dialogue', 'mood'],
      tags: ['场景', '开场白', '叙事', 'AB测试'],
      category: 'Chat',
      subCategory: 'Scene_control',
      sourceType: 'function',
      status: 'published',
      currentVersionId: 'v_007',
      versions: [
        {
          id: 'v_007',
          versionNumber: 2,
          content: '【场景切换】\n\n{{scene_description}}\n\n*{{character_name}}{{character_action}}*\n\n{{opening_dialogue}}\n\n（当前场景氛围：{{mood}}）',
          variables: ['scene_description', 'character_name', 'character_action', 'opening_dialogue', 'mood'],
          createdAt: '2026-04-18T13:00:00Z',
          publishedAt: '2026-04-19T10:00:00Z',
          author: 'Lin',
          changeNote: '增加氛围标签和角色动作描写，AB测试沉浸感提升'
        },
        {
          id: 'v_006',
          versionNumber: 1,
          content: '场景：{{scene_description}}\n\n{{character_name}}说：{{opening_dialogue}}',
          variables: ['scene_description', 'character_name', 'opening_dialogue'],
          createdAt: '2026-04-05T10:00:00Z',
          publishedAt: '2026-04-06T09:00:00Z',
          author: 'Lin',
          changeNote: '基础场景开场版本'
        }
      ],
      environments: {
        dev: { versionId: 'v_007', deployedAt: '2026-04-18T14:00:00Z' },
        test: { versionId: 'v_007', deployedAt: '2026-04-18T17:00:00Z' },
        prod: { versionId: null, deployedAt: null }
      },
      createdAt: '2026-04-05T10:00:00Z',
      updatedAt: '2026-04-19T10:00:00Z'
    },
    {
      id: 'p_004',
      name: '角色记忆摘要',
      description: '将长对话历史压缩为角色视角的记忆摘要，用于上下文窗口管理，保持角色记忆连贯性',
      content: '请以 {{character_name}} 的视角，将以下对话历史压缩为一段记忆摘要：\n\n对话历史：\n{{conversation_history}}\n\n要求：\n1. 用第一人称（"我"）描述记忆\n2. 保留关键情节转折和情感变化\n3. 记住用户提到的重要信息：姓名、偏好、约定等\n4. 摘要长度控制在 {{max_length}} 字以内\n5. 标注情感状态变化：{{emotion_tracking}}',
      drafts: [],
      variables: ['character_name', 'conversation_history', 'max_length', 'emotion_tracking'],
      tags: ['记忆', '上下文', '摘要', '长对话'],
      category: 'Chat',
      subCategory: 'System_prompt',
      sourceType: 'db',
      status: 'draft',
      currentVersionId: null,
      versions: [],
      environments: {
        dev: { versionId: null, deployedAt: null },
        test: { versionId: null, deployedAt: null },
        prod: { versionId: null, deployedAt: null }
      },
      createdAt: '2026-04-20T16:00:00Z',
      updatedAt: '2026-04-20T16:00:00Z'
    },
    {
      id: 'p_005',
      name: '角色语音合成指令',
      description: '控制TTS语音合成的角色声线、语速、情感参数，让语音输出匹配角色人设',
      content: '请使用以下参数生成角色语音：\n\n角色声线：{{voice_profile}}\n语速：{{speech_rate}}\n情感色彩：{{emotion}}\n语言：{{language}}\n\n台词内容：\n{{dialogue_text}}\n\n特殊指令：\n- 在感叹句处提升音调\n- 在省略号处添加 {{pause_duration}} 的停顿\n- 口头禅"{{catchphrase}}"用特殊语调强调',
      drafts: [],
      variables: ['voice_profile', 'speech_rate', 'emotion', 'language', 'dialogue_text', 'pause_duration', 'catchphrase'],
      tags: ['语音', 'TTS', '声线', '情感'],
      category: 'Voice',
      subCategory: 'TTS',
      sourceType: 'hardcode',
      status: 'offline',
      currentVersionId: 'v_010',
      versions: [
        {
          id: 'v_010',
          versionNumber: 2,
          content: '请使用以下参数生成角色语音：\n\n角色声线：{{voice_profile}}\n语速：{{speech_rate}}\n情感色彩：{{emotion}}\n语言：{{language}}\n\n台词内容：\n{{dialogue_text}}\n\n特殊指令：\n- 在感叹句处提升音调\n- 在省略号处添加 {{pause_duration}} 的停顿\n- 口头禅"{{catchphrase}}"用特殊语调强调',
          variables: ['voice_profile', 'speech_rate', 'emotion', 'language', 'dialogue_text', 'pause_duration', 'catchphrase'],
          createdAt: '2026-04-10T09:00:00Z',
          publishedAt: '2026-04-10T15:00:00Z',
          prodDeployedAt: '2026-04-10T18:00:00Z',
          prodDeployType: 'full',
          author: 'Lin',
          changeNote: '增加停顿控制和口头禅语调，细化情感表达'
        },
        {
          id: 'v_009',
          versionNumber: 1,
          content: '角色声线：{{voice_profile}}\n情感：{{emotion}}\n\n请朗读以下台词：{{dialogue_text}}',
          variables: ['voice_profile', 'emotion', 'dialogue_text'],
          createdAt: '2026-04-02T11:00:00Z',
          publishedAt: '2026-04-02T14:00:00Z',
          author: 'Lin',
          changeNote: '基础语音合成版本'
        }
      ],
      environments: {
        dev: { versionId: 'v_010', deployedAt: '2026-04-10T09:30:00Z' },
        test: { versionId: 'v_010', deployedAt: '2026-04-10T12:00:00Z' },
        prod: { versionId: null, deployedAt: null }
      },
      createdAt: '2026-04-02T11:00:00Z',
      updatedAt: '2026-05-05T15:00:00Z'
    },
    {
      id: 'p_006',
      name: 'Roleplay 内容安全审核',
      description: '角色扮演场景下的内容安全审核，判断用户输入和AI回复是否触及红线，平衡沉浸感与安全性',
      content: '你是角色扮演平台的内容安全审核模块。请审核以下对话内容：\n\n审核级别：{{moderation_level}}\n当前场景类型：{{scene_type}}\n角色关系：{{relationship_type}}\n\n用户输入：{{user_input}}\n\n审核规则：\n1. 判断内容是否涉及{{restricted_categories}}\n2. 区分"角色扮演语境"和"真实意图"——角色冲突对话 ≠ 真实威胁\n3. 对于灰色地带内容，给出 pass/warn/block 判定及原因\n4. 若判定为 warn，提供修改建议使内容在保持叙事性的前提下合规',
      drafts: [],
      variables: ['moderation_level', 'scene_type', 'relationship_type', 'user_input', 'restricted_categories'],
      tags: ['审核', '安全', '合规', '角色扮演'],
      category: 'Moderation',
      subCategory: 'Content Review',
      sourceType: 'db',
      status: 'online',
      currentVersionId: 'v_014',
      versions: [
        {
          id: 'v_014',
          versionNumber: 4,
          content: '你是角色扮演平台的内容安全审核模块。请审核以下对话内容：\n\n审核级别：{{moderation_level}}\n当前场景类型：{{scene_type}}\n角色关系：{{relationship_type}}\n\n用户输入：{{user_input}}\n\n审核规则：\n1. 判断内容是否涉及{{restricted_categories}}\n2. 区分"角色扮演语境"和"真实意图"——角色冲突对话 ≠ 真实威胁\n3. 对于灰色地带内容，给出 pass/warn/block 判定及原因\n4. 若判定为 warn，提供修改建议使内容在保持叙事性的前提下合规',
          variables: ['moderation_level', 'scene_type', 'relationship_type', 'user_input', 'restricted_categories'],
          createdAt: '2026-05-01T11:00:00Z',
          publishedAt: '2026-05-02T09:00:00Z',
          prodDeployedAt: '2026-05-02T09:00:00Z',
          prodDeployType: 'full',
          author: 'Lin',
          changeNote: '增加角色关系上下文，优化灰色地带判定逻辑'
        },
        {
          id: 'v_013',
          versionNumber: 3,
          content: '审核以下角色扮演对话内容：\n\n审核级别：{{moderation_level}}\n场景类型：{{scene_type}}\n\n用户输入：{{user_input}}\n\n判断是否涉及违规内容，区分角色扮演语境和真实意图。给出 pass/warn/block 判定。',
          variables: ['moderation_level', 'scene_type', 'user_input'],
          createdAt: '2026-04-22T09:00:00Z',
          publishedAt: '2026-04-23T09:00:00Z',
          prodDeployedAt: '2026-04-23T09:00:00Z',
          prodDeployType: 'full',
          author: 'Lin',
          changeNote: '增加场景类型区分，优化角色扮演语境理解'
        },
        {
          id: 'v_012',
          versionNumber: 2,
          content: '审核以下角色扮演对话内容，审核级别：{{moderation_level}}。\n\n用户输入：{{user_input}}\n\n判断是否违规并给出判定。',
          variables: ['moderation_level', 'user_input'],
          createdAt: '2026-04-11T10:00:00Z',
          publishedAt: '2026-04-11T14:00:00Z',
          prodDeployedAt: '2026-04-11T14:00:00Z',
          prodDeployType: 'full',
          author: 'Lin',
          changeNote: '增加审核级别参数'
        },
        {
          id: 'v_011',
          versionNumber: 1,
          content: '审核以下用户输入内容是否违规：{{user_input}}',
          variables: ['user_input'],
          createdAt: '2026-04-04T08:00:00Z',
          publishedAt: '2026-04-04T10:00:00Z',
          prodDeployedAt: '2026-04-04T10:00:00Z',
          prodDeployType: 'full',
          author: 'Lin',
          changeNote: '最初简单审核版本'
        }
      ],
      environments: {
        dev: { versionId: 'v_014', deployedAt: '2026-05-01T12:00:00Z' },
        test: { versionId: 'v_014', deployedAt: '2026-05-01T18:00:00Z' },
        prod: { versionId: 'v_014', deployedAt: '2026-05-02T09:00:00Z' }
      },
      createdAt: '2026-04-04T08:00:00Z',
      updatedAt: '2026-05-02T09:00:00Z'
    }
  ]
}
