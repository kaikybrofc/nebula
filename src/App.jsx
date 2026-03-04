import { useCallback, useMemo, useRef, useState } from 'react';
import './App.css';
import GameCanvas from './ui/components/GameCanvas';
import GameOverlay from './ui/components/GameOverlay';
import Home from './ui/Home';
import { GAME_SETTINGS_DEFAULTS, PLAYER_CONFIG, WORLD_CONFIG } from './shared/config';
import { massToRadius } from './shared/utils';

const initialStats = {
  mass: PLAYER_CONFIG.initialMass,
  radius: massToRadius(PLAYER_CONFIG.initialMass),
  foodCount: 0,
  pelletCount: 0,
  cellCount: 1,
  fps: 0,
  score: 0,
  leaderboard: [],
  playerRank: 1,
  selfId: null,
  playerX: WORLD_CONFIG.width * 0.5,
  playerY: WORLD_CONFIG.height * 0.5,
  worldWidth: WORLD_CONFIG.width,
  worldHeight: WORLD_CONFIG.height,
};

function detectMobileLayout() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
}

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [nickname, setNickname] = useState('Explorer');
  const [stats, setStats] = useState(initialStats);
  const [settings, setSettings] = useState(() => ({
    ...GAME_SETTINGS_DEFAULTS,
    zoom: detectMobileLayout() ? 1.14 : GAME_SETTINGS_DEFAULTS.zoom,
  }));
  const gameControlsRef = useRef(null);

  const handlePlay = useCallback((nextNickname) => {
    setNickname(nextNickname);
    setStats(initialStats);
    setIsPlaying(true);
  }, []);

  const handleStatsChange = useCallback((nextStats) => {
    setStats(nextStats);
  }, []);

  const handleSettingsChange = useCallback((nextSettings) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      ...nextSettings,
    }));
  }, []);

  const handleGameReady = useCallback((controls) => {
    gameControlsRef.current = controls;
  }, []);

  const controls = useMemo(
    () => ({
      triggerSplit: () => {
        if (gameControlsRef.current) {
          gameControlsRef.current.triggerSplit();
        }
      },
      setEjectActive: (isActive) => {
        if (gameControlsRef.current) {
          gameControlsRef.current.setEjectActive(isActive);
        }
      },
      setVirtualDirection: (x, y) => {
        if (gameControlsRef.current) {
          gameControlsRef.current.setVirtualDirection(x, y);
        }
      },
    }),
    [],
  );

  return (
    <main className="app-shell">
      {!isPlaying && <Home onPlay={handlePlay} />}

      {isPlaying && (
        <>
          <GameCanvas
            nickname={nickname}
            onStatsChange={handleStatsChange}
            settings={settings}
            onReady={handleGameReady}
          />
          <GameOverlay
            stats={stats}
            settings={settings}
            onSettingsChange={handleSettingsChange}
            controls={controls}
          />
        </>
      )}
    </main>
  );
}
