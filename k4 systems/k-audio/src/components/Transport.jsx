import React from 'react';

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const cs = Math.floor((secs % 1) * 100);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

export default function Transport({
  isPlaying, isRecording, playhead, bpm, masterVolume,
  onPlay, onStop, onRewind, onRecord, onBpmChange, onMasterVolume,
}) {
  return (
    <div className="transport">
      <button
        className="transport-btn rewind-btn"
        onClick={onRewind}
        title="Reiniciar (Home)"
      >⏮</button>

      <button
        className={`transport-btn play-btn ${isPlaying ? 'active' : ''}`}
        onClick={isPlaying ? onStop : onPlay}
        title="Play/Stop (Espaço)"
      >
        {isPlaying ? '⏹' : '▶'}
      </button>

      <button
        className={`transport-btn rec-btn ${isRecording ? 'recording' : ''}`}
        onClick={onRecord}
        title="Gravar (R)"
      >⏺</button>

      <div className="transport-time">{formatTime(playhead)}</div>

      <div className="transport-bpm">
        <label>BPM</label>
        <input
          type="number"
          min="20" max="300"
          value={bpm}
          onChange={e => onBpmChange(Number(e.target.value))}
        />
      </div>

      <div className="transport-master">
        <label>Master</label>
        <input
          type="range" min="0" max="1" step="0.01"
          value={masterVolume}
          onChange={e => onMasterVolume(Number(e.target.value))}
        />
        <span>{Math.round(masterVolume * 100)}%</span>
      </div>
    </div>
  );
}
