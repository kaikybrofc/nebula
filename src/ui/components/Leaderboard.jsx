function formatMass(mass) {
  return Math.floor(mass).toLocaleString('pt-BR');
}

export default function Leaderboard({ entries = [], selfId, limit = 10, compact = false }) {
  const visibleEntries = entries.slice(0, Math.max(1, limit));

  return (
    <section
      className={`ui-card leaderboard-panel ${compact ? 'is-compact' : ''}`.trim()}
      aria-label="Leaderboard"
    >
      <header className="leaderboard-header">Leaderboard</header>

      <ol className="leaderboard-list">
        {visibleEntries.map((entry, index) => {
          const isSelf = selfId && entry.id === selfId;

          return (
            <li
              key={entry.id}
              className={`leaderboard-item ${isSelf ? 'is-self' : ''}`.trim()}
            >
              <span className="leaderboard-rank">{index + 1}</span>
              <span className="leaderboard-name">{entry.name}</span>
              <span className="leaderboard-mass">{formatMass(entry.mass)}</span>
            </li>
          );
        })}
      </ol>

      {visibleEntries.length === 0 && <p className="leaderboard-empty">Sem jogadores</p>}
    </section>
  );
}
