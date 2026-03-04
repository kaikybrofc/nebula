import { useEffect, useMemo, useState } from 'react';
import ActionButtons from './ActionButtons';
import Hud from './Hud';
import Leaderboard from './Leaderboard';
import Minimap from './Minimap';
import MobileControls from './MobileControls';
import SettingsPanel from './SettingsPanel';
import { FullscreenIcon, HelpIcon, SettingsIcon, TrophyIcon } from './IconPack';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px), (pointer: coarse)');
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

function useIsCompactMobile() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 420px)');
    const update = () => setIsCompact(media.matches);
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

  return isCompact;
}

export default function GameOverlay({
  stats,
  settings,
  onSettingsChange,
  controls,
}) {
  const isMobile = useIsMobile();
  const isCompactMobile = useIsCompactMobile();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isLeaderboardCollapsed, setIsLeaderboardCollapsed] = useState(false);
  const leaderboardLimit = isMobile ? (isCompactMobile ? 3 : 5) : 10;
  const showFps = settings.showFps && !(isMobile && isCompactMobile);
  const minimapSize = isCompactMobile ? 96 : isMobile ? 110 : 140;

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
    <div
      className={`game-overlay ${isMobile ? 'mobile' : ''} ${isCompactMobile ? 'mobile-compact' : ''}`.trim()}
    >
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
        <div className={`leaderboard-anchor ${isMobile ? 'is-mobile' : ''}`.trim()}>
          {isMobile && (
            <button
              type="button"
              className={`top-icon-btn leaderboard-toggle-btn ${isLeaderboardCollapsed ? 'is-collapsed' : ''}`.trim()}
              onClick={() => setIsLeaderboardCollapsed((collapsed) => !collapsed)}
              aria-label={isLeaderboardCollapsed ? 'Mostrar leaderboard' : 'Ocultar leaderboard'}
            >
              <TrophyIcon />
            </button>
          )}

          {(!isMobile || !isLeaderboardCollapsed) && (
            <Leaderboard
              entries={stats.leaderboard}
              selfId={stats.selfId}
              limit={leaderboardLimit}
              compact={isMobile}
            />
          )}
        </div>
      )}

      <div className="hud-anchor">
        <Hud stats={stats} showFps={showFps} compact={isMobile} />
      </div>

      {settings.showMinimap && (
        <div className="minimap-anchor">
          <Minimap stats={stats} size={minimapSize} compact={isMobile} />
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
          compact={isCompactMobile}
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
