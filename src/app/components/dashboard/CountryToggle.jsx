export default function CountryToggle({ country, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs font-medium">
      {['canada', 'us'].map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`px-4 py-1.5 transition-colors ${
            country === c
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          {c === 'canada' ? 'Canada' : 'US'}
        </button>
      ))}
    </div>
  )
}
