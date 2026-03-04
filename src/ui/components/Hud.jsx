function formatMass(mass) {
  return Math.floor(mass).toLocaleString('pt-BR');
}

export default function Hud({ stats, showFps, compact = false }) {
  return (
    <section className={`hud-clean ${compact ? 'is-compact' : ''}`.trim()} aria-label="Player stats">
      <div className="hud-line">
        <span className="hud-label">Massa</span>
        <strong className="hud-value">{formatMass(stats.mass)}</strong>
      </div>
      <div className="hud-line">
        <span className="hud-label">Células</span>
        <strong className="hud-value">{stats.cellCount}</strong>
      </div>
      <div className="hud-line">
        <span className="hud-label">Rank</span>
        <strong className="hud-value">#{stats.playerRank}</strong>
      </div>
      {showFps && (
        <div className="hud-line">
          <span className="hud-label">FPS</span>
          <strong className="hud-value">{stats.fps}</strong>
        </div>
      )}
    </section>
  );
}
