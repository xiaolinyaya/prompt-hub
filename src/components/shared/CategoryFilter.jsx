export default function CategoryFilter({ categories, selected, onChange }) {
  return (
    <div className="category-filter">
      <button
        className={`category-chip${!selected ? ' active' : ''}`}
        onClick={() => onChange(null)}
      >
        全部
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          className={`category-chip${selected === cat ? ' active' : ''}`}
          onClick={() => onChange(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
