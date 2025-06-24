import React, { useState, useEffect } from 'react';
import './App.css';

// PUBLIC_INTERFACE
function App() {
  // State management
  const [board, setBoard] = useState(Array(9).fill(''));
  const [gameId, setGameId] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [status, setStatus] = useState('Start a new game');
  const [isGameActive, setIsGameActive] = useState(false);
  const [winner, setWinner] = useState('');
  const [loading, setLoading] = useState(false);

  // API URL (adjust if needed; assumes backend on /api or via proxy)
  const API_BASE =
    process.env.REACT_APP_API_URL ||
    'https://vscode-internal-3-qa.qa01.cloud.kavia.ai:3001';

  // PUBLIC_INTERFACE
  async function startNewGame() {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!resp.ok) throw new Error('Failed to start new game');
      const data = await resp.json();
      setGameId(data.game_id);
      setBoard(Array(9).fill(''));
      setStatus("Your turn: X");
      setCurrentPlayer('X');
      setWinner('');
      setIsGameActive(true);
    } catch (e) {
      setStatus('Could not start game.');
    } finally {
      setLoading(false);
    }
  }

  // PUBLIC_INTERFACE
  async function fetchGameState(game_id) {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/game/${game_id}`);
      if (!resp.ok) throw new Error('Failed to get state');
      const data = await resp.json();
      setBoard(data.board);
      setStatus(data.status);
      setCurrentPlayer(data.current_player);
      if (data.winner) {
        setWinner(data.winner);
        setIsGameActive(false);
      }
    } catch {
      setStatus('Failed to fetch state.');
    } finally {
      setLoading(false);
    }
  }

  // PUBLIC_INTERFACE
  async function makeMove(idx) {
    if (!isGameActive || winner || board[idx] !== '') return;
    setLoading(true);
    try {
      const moveBody = { position: idx };
      const resp = await fetch(`${API_BASE}/game/${gameId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moveBody)
      });
      if (!resp.ok) throw new Error('Move failed');
      const data = await resp.json();
      setBoard(data.board);
      setCurrentPlayer(data.current_player);
      if (data.winner) {
        setWinner(data.winner);
        setStatus(data.status);
        setIsGameActive(false);
      } else {
        setStatus(data.status || `Your turn: ${data.current_player}`);
      }
    } catch {
      setStatus('Invalid move or server error.');
    } finally {
      setLoading(false);
    }
  }

  // Optionally sync game state if reloading browser on existing gameId
  useEffect(() => {
    if (gameId) {
      fetchGameState(gameId);
    }
    // eslint-disable-next-line
  }, [gameId]);

  // Stylings with color palette
  const palette = {
    accent: '#f50057',
    primary: '#1976d2',
    secondary: '#424242',
    white: '#fff',
    bg: '#f9fafe',
  };

  // PUBLIC_INTERFACE
  function Board() {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 72px)",
          gridTemplateRows: "repeat(3, 72px)",
          gap: 8,
          justifyContent: "center",
          alignItems: "center",
          background: palette.bg,
          borderRadius: 14,
          padding: 16,
          boxShadow: '0 2px 10px rgba(37, 81, 135, 0.08)'
        }}>
        {board.map((cell, idx) => (
          <button
            key={idx}
            className="ttt-cell"
            disabled={cell !== '' || !isGameActive || winner}
            style={{
              width: 72,
              height: 72,
              fontSize: '2.2rem',
              fontWeight: 600,
              color: cell === 'X' ? palette.primary : palette.accent,
              background: palette.white,
              border: `2px solid ${palette.primary}`,
              borderRadius: 6,
              cursor: cell === '' && isGameActive ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
              outline: 0,
            }}
            onClick={() => makeMove(idx)}
            aria-label={`Cell ${idx + 1}`}
          >
            {cell}
          </button>
        ))}
      </div>
    );
  }

  // PUBLIC_INTERFACE
  function GameStatus() {
    const textStyle = {
      marginTop: 20,
      padding: 8,
      fontWeight: 500,
      textAlign: 'center',
      color: winner
        ? (winner === 'Draw'
          ? palette.secondary
          : palette.accent)
        : palette.primary,
      fontSize: '1.1rem',
      minHeight: '1.2em'
    };
    if (loading) {
      return <div style={textStyle}>Loading...</div>;
    }
    if (winner) {
      if (winner === 'Draw') return <div style={textStyle}>It's a Draw!</div>;
      return <div style={textStyle}>Winner: <span style={{fontWeight: 700}}>{winner}</span></div>;
    }
    return <div style={textStyle}>{status}</div>;
  }

  // App Layout
  return (
    <div className="app" style={{ background: palette.bg, minHeight: '100vh' }}>
      <nav className="navbar" style={{ background: palette.primary }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div className="logo" style={{ color: palette.white }}>
              <span className="logo-symbol" style={{ color: palette.accent, fontWeight: 700 }}>*</span> TIC TAC TOE
            </div>
            <button
              className="btn"
              style={{
                background: palette.accent,
                color: palette.white,
                fontWeight: 600,
                padding: '8px 18px',
                borderRadius: 5,
                border: 'none',
              }}
              onClick={startNewGame}
              disabled={loading}
            >
              New Game
            </button>
          </div>
        </div>
      </nav>
      <main>
        <div
          className="container"
          style={{
            minHeight: 'calc(100vh - 80px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 120,
          }}>
          {/* Player controls */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: '1.28rem',
              fontWeight: 500,
              color: palette.primary,
              textAlign: 'center',
              letterSpacing: '0.01em'
            }}>
              {gameId
                ? (isGameActive ? `Current Player: ${currentPlayer}` : 'Game Over')
                : 'Welcome!'}
            </div>
          </div>
          {/* Game board */}
          <Board />
          {/* Status below */}
          <GameStatus />
        </div>
      </main>
    </div>
  );
}

export default App;
