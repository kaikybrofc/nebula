import {
  LeaderboardIcon,
  MinimapIcon,
  SettingsIcon,
  SoundIcon,
} from './IconPack';

function SettingToggle({ icon, label, checked, onChange }) {
  return (
    <label className="setting-toggle">
      <span className="setting-toggle-icon">{icon}</span>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" />
    </label>
  );
}

export default function SettingsPanel({ isOpen, settings, onSettingsChange, onClose }) {
  return (
    <aside className={`settings-panel ${isOpen ? 'is-open' : ''}`.trim()}>
      <header className="settings-header">
        <span className="settings-title">
          <SettingsIcon />
          Configurações
        </span>
        <button type="button" className="top-icon-btn close-btn" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </header>

      <div className="settings-group">
        <label htmlFor="sensitivity">Sensibilidade ({settings.sensitivity.toFixed(2)})</label>
        <input
          id="sensitivity"
          type="range"
          min="0.45"
          max="1.8"
          step="0.01"
          value={settings.sensitivity}
          onChange={(event) => onSettingsChange({ sensitivity: Number(event.target.value) })}
        />
      </div>

      <div className="settings-group">
        <label htmlFor="zoom">Zoom ({settings.zoom.toFixed(2)})</label>
        <input
          id="zoom"
          type="range"
          min="0.65"
          max="1.35"
          step="0.01"
          value={settings.zoom}
          onChange={(event) => onSettingsChange({ zoom: Number(event.target.value) })}
        />
      </div>

      <div className="settings-group">
        <label htmlFor="quality">Qualidade ({Math.round(settings.graphicsQuality * 100)}%)</label>
        <input
          id="quality"
          type="range"
          min="0.5"
          max="1"
          step="0.05"
          value={settings.graphicsQuality}
          onChange={(event) => onSettingsChange({ graphicsQuality: Number(event.target.value) })}
        />
      </div>

      <div className="settings-toggles">
        <SettingToggle
          icon={<LeaderboardIcon size={18} />}
          label="Mostrar leaderboard"
          checked={settings.showLeaderboard}
          onChange={(value) => onSettingsChange({ showLeaderboard: value })}
        />

        <SettingToggle
          icon={<MinimapIcon size={18} />}
          label="Mostrar minimap"
          checked={settings.showMinimap}
          onChange={(value) => onSettingsChange({ showMinimap: value })}
        />

        <SettingToggle
          icon={<SoundIcon size={18} />}
          label="Som ativo"
          checked={settings.soundEnabled}
          onChange={(value) => onSettingsChange({ soundEnabled: value })}
        />

        <SettingToggle
          icon={<span className="fps-chip">FPS</span>}
          label="Mostrar FPS"
          checked={settings.showFps}
          onChange={(value) => onSettingsChange({ showFps: value })}
        />
      </div>
    </aside>
  );
}
