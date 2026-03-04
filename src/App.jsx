import { useCallback, useState } from 'react';
import './App.css';
import GameCanvas from './ui/components/GameCanvas';
import Home from './ui/Home';
import Hud from './ui/Hud';
import { PLAYER_CONFIG } from './shared/config';
import { massToRadius } from './shared/utils';

const initialStats = {
  mass: PLAYER_CONFIG.initialMass,
  radius: massToRadius(PLAYER_CONFIG.initialMass),
  foodCount: 0,
};

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [nickname, setNickname] = useState('Explorer');
  const [stats, setStats] = useState(initialStats);

  const handlePlay = useCallback((nextNickname) => {
    setNickname(nextNickname);
    setStats(initialStats);
    setIsPlaying(true);
  }, []);

  const handleStatsChange = useCallback((nextStats) => {
    setStats(nextStats);
  }, []);

  return (
    <main className="app-shell">
      {!isPlaying && <Home onPlay={handlePlay} />}

      {isPlaying && (
        <>
          <GameCanvas nickname={nickname} onStatsChange={handleStatsChange} />
          <Hud nickname={nickname} stats={stats} />
        </>
      )}
    </main>
  );
}
