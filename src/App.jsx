import { useCallback, useState } from 'react';
import './App.css';
import GameCanvas from './ui/components/GameCanvas';
import Home from './ui/Home';
import Hud from './ui/Hud';
import { GAME_SETTINGS_DEFAULTS, PLAYER_CONFIG } from './shared/config';
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
};

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [nickname, setNickname] = useState('Explorer');
  const [stats, setStats] = useState(initialStats);
  const [settings, setSettings] = useState(GAME_SETTINGS_DEFAULTS);

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

  return (
    <main className="app-shell">
      {!isPlaying && <Home onPlay={handlePlay} />}

      {isPlaying && (
        <>
          <GameCanvas
            nickname={nickname}
            onStatsChange={handleStatsChange}
            settings={settings}
          />
          <Hud
            nickname={nickname}
            stats={stats}
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        </>
      )}
    </main>
  );
}
