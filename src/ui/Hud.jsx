import { useState } from 'react';

function formatScore(score) {
  return Math.floor(score).toLocaleString('pt-BR');
}

export default function Hud({ nickname, stats, settings, onSettingsChange }) {
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  return (
    <aside className="hud" aria-live="polite">
      <h2>{nickname}</h2>
      <p>
        Massa: <strong>{stats.mass.toFixed(1)}</strong>
      </p>
      <p>
        Score: <strong>{formatScore(stats.score)}</strong>
      </p>
      <p>
        FPS: <strong>{stats.fps}</strong>
      </p>
      <p>
        Células: <strong>{stats.cellCount}</strong>
      </p>
      <p>
        Rank: <strong>#{stats.playerRank}</strong>
      </p>

      <div className="hud-actions">
        <button
          type="button"
          className="hud-button"
          onClick={() => setShowLeaderboard((prevState) => !prevState)}
        >
          {showLeaderboard ? 'Hide leaderboard' : 'Show leaderboard'}
        </button>
      </div>

      {showLeaderboard && (
        <div className="hud-leaderboard">
          <h3>Leaderboard</h3>
          {stats.leaderboard.map((entry, index) => (
            <p key={entry.id}>
              {index + 1}. {entry.name} <strong>{formatScore(entry.mass)}</strong>
            </p>
          ))}
        </div>
      )}

      <div className="hud-settings">
        <h3>Configurações</h3>

        <label htmlFor="sensitivity-range">
          Sensibilidade ({settings.sensitivity.toFixed(2)})
        </label>
        <input
          id="sensitivity-range"
          type="range"
          min="0.45"
          max="1.8"
          step="0.01"
          value={settings.sensitivity}
          onChange={(event) =>
            onSettingsChange({
              sensitivity: Number(event.target.value),
            })
          }
        />

        <label htmlFor="zoom-range">
          Zoom ({settings.zoom.toFixed(2)})
        </label>
        <input
          id="zoom-range"
          type="range"
          min="0.65"
          max="1.35"
          step="0.01"
          value={settings.zoom}
          onChange={(event) =>
            onSettingsChange({
              zoom: Number(event.target.value),
            })
          }
        />
      </div>

      <p className="hud-tip">
        Mouse move | Space split | W eject
        <br />
        Comida: <strong>{stats.foodCount}</strong> | Pellets: <strong>{stats.pelletCount}</strong>
      </p>
    </aside>
  );
}
