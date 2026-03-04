import { useState } from 'react';

export default function Home({ onPlay }) {
  const [nickname, setNickname] = useState('Explorer');

  function handleSubmit(event) {
    event.preventDefault();
    const sanitized = nickname.trim() || 'Explorer';
    onPlay(sanitized);
  }

  return (
    <section className="home-screen">
      <div className="home-card">
        <p className="home-kicker">offline mvp</p>
        <h1>Nebula Cells</h1>
        <p className="home-description">
          Controle sua bolha, cresça no mapa e sobreviva nas bordas do mundo.
        </p>

        <form className="home-form" onSubmit={handleSubmit}>
          <label htmlFor="nickname">Nickname</label>
          <input
            id="nickname"
            maxLength={18}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Digite seu nome"
          />
          <button type="submit">Jogar</button>
        </form>
      </div>
    </section>
  );
}
