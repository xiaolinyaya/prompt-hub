import { useState } from 'react'
import { X } from 'lucide-react'

export default function TagInput({ tags = [], onChange, placeholder = '输入后按回车添加标签' }) {
  const [input, setInput] = useState('')

  function handleKeyDown(e) {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()])
      }
      setInput('')
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div className="tag-input-wrap">
      {tags.map((tag) => (
        <span key={tag} className="tag">
          {tag}
          <span className="tag-remove" onClick={() => removeTag(tag)}><X size={12} /></span>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
      />
    </div>
  )
}
