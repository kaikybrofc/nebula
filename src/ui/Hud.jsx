export default function Hud({ nickname, stats }) {
  return (
    <aside className="hud" aria-live="polite">
      <h2>{nickname}</h2>
      <p>
        Massa: <strong>{stats.mass.toFixed(1)}</strong>
      </p>
      <p>
        Raio: <strong>{stats.radius.toFixed(1)}</strong>
      </p>
      <p>
        Comida no mapa: <strong>{stats.foodCount}</strong>
      </p>
      <p className="hud-tip">Mova o mouse para guiar sua bolha.</p>
    </aside>
  );
}
