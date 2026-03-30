export default function TagPill({ name, pillColor, textColor, onClick, onRemove }) {
  return (
    <span
      className="tag-pill"
      style={{ backgroundColor: pillColor || '#3b82f6', color: textColor || '#ffffff' }}
      onClick={onClick}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            marginLeft: 4,
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: 12,
            padding: '0 2px',
            opacity: 0.7
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
