export function extractVariables(content) {
  if (!content) return []
  const regex = /\{\{(\w+)\}\}/g
  const vars = new Set()
  let match
  while ((match = regex.exec(content)) !== null) {
    vars.add(match[1])
  }
  return Array.from(vars)
}

export function renderPrompt(content, values = {}) {
  if (!content) return ''
  return content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return values[varName] !== undefined ? values[varName] : match
  })
}
