import { useEffect, useMemo, useState } from 'react';
import ActionButtons from './ActionButtons';
import Hud from './Hud';
import Leaderboard from './Leaderboard';
import Minimap from './Minimap';
import MobileControls from './MobileControls';
import SettingsPanel from './SettingsPanel';
import { FullscreenIcon, HelpIcon, SettingsIcon } from './IconPack';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px), (pointer: coarse)');
    const update = () => setIsMobile(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
    } else {
      media.addListener(update);
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', update);
      } else {
        media.removeListener(update);
      }
    };
  }, []);

  return isMobile;
}

export default function GameOverlay({
  stats,
  settings,
  onSettingsChange,
  controls,
}) {
  const isMobile = useIsMobile();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const actions = useMemo(
    () => ({
      split: () => controls.triggerSplit(),
      eject: (isActive) => controls.setEjectActive(isActive),
      direction: (x, y) => controls.setVirtualDirection(x, y),
    }),
    [controls],
  );

  async function handleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        return;
      }

      await document.exitFullscreen();
    } catch {
      // Fullscreen may fail due to browser policy; ignore silently.
    }
  }

  return (
    <div className="game-overlay">
      <header className="top-controls">
        <button
          type="button"
          className="top-icon-btn"
          onClick={() => setIsSettingsOpen((open) => !open)}
          aria-label="Configurações"
        >
          <SettingsIcon />
        </button>

        <button
          type="button"
          className="top-icon-btn"
          onClick={handleFullscreen}
          aria-label="Tela cheia"
        >
          <FullscreenIcon />
        </button>

        <button
          type="button"
          className="top-icon-btn"
          onClick={() => setShowHelp((open) => !open)}
          aria-label="Ajuda"
        >
          <HelpIcon />
        </button>
      </header>

      {showHelp && (
        <section className="help-toast">
          <p>Mouse/Joystick para mover, Split para dividir, Eject para ejetar massa.</p>
        </section>
      )}

      {settings.showLeaderboard && (
        <div className="leaderboard-anchor">
          <Leaderboard entries={stats.leaderboard} selfId={stats.selfId} />
        </div>
      )}

      <div className="hud-anchor">
        <Hud stats={stats} showFps={settings.showFps} />
      </div>

      {settings.showMinimap && (
        <div className="minimap-anchor">
          <Minimap stats={stats} />
        </div>
      )}

      {!isMobile && (
        <div className="desktop-actions-anchor">
          <ActionButtons size={56} onSplit={actions.split} onEjectChange={actions.eject} />
        </div>
      )}

      {isMobile && (
        <MobileControls
          onDirectionChange={actions.direction}
          onSplit={actions.split}
          onEjectChange={actions.eject}
        />
      )}

      <SettingsPanel
        isOpen={isSettingsOpen}
        settings={settings}
        onSettingsChange={onSettingsChange}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
