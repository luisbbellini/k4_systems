import React, { useRef, useCallback, useEffect, useState } from 'react';
import Waveform from './Waveform.jsx';

// ─── Timeline ruler ───────────────────────────────────────────────────────────

function TimelineRuler({ zoom, duration, scrollLeft }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, W, H);

    const step = zoom >= 100 ? 1 : zoom >= 50 ? 2 : zoom >= 20 ? 5 : 10;
    ctx.strokeStyle = '#444';
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';

    for (let t = 0; t <= duration + step; t += step) {
      const x = t * zoom - scrollLeft;
      if (x < -10 || x > W + 10) continue;
      const major = t % (step * 5) === 0;
      ctx.strokeStyle = major ? '#555' : '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, major ? 0 : H / 2);
      ctx.lineTo(x, H);
      ctx.stroke();
      if (major) {
        const m = Math.floor(t / 60);
        const s = t % 60;
        ctx.fillStyle = '#888';
        ctx.fillText(`${m}:${String(s).padStart(2,'0')}`, x + 2, H - 2);
      }
    }
  }, [zoom, duration, scrollLeft]);

  return (
    <canvas
      ref={canvasRef}
      className="timeline-ruler-canvas"
      width={Math.max(2000, duration * zoom + 200)}
      height={24}
    />
  );
}

// ─── Single clip ──────────────────────────────────────────────────────────────

function Clip({ clip, zoom, color, onRemove, onDragStart }) {
  const width = Math.max(2, (clip.buffer?.duration ?? 0) * zoom);
  const left = clip.startTime * zoom;

  return (
    <div
      className="clip"
      style={{ left, width, borderColor: color, backgroundColor: color + '22' }}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('clipId', clip.id);
        e.dataTransfer.setData('clipOffsetX', String(e.clientX - e.currentTarget.getBoundingClientRect().left));
        if (onDragStart) onDragStart(clip.id);
      }}
      title={clip.name}
    >
      <div className="clip-header" style={{ backgroundColor: color + 'cc' }}>
        <span className="clip-name">{clip.name}</span>
        <button
          className="clip-del"
          onClick={e => { e.stopPropagation(); onRemove(clip.id); }}
        >×</button>
      </div>
      {clip.peaks && (
        <Waveform peaks={clip.peaks} width={width} height={48} color={color} />
      )}
    </div>
  );
}

// ─── Single track row ─────────────────────────────────────────────────────────

function TrackRow({
  track, zoom, playhead, isSelected, timelineDuration,
  onSelect, onUpdate, onRemove,
  onTimelineClick, onRemoveClip, onMoveClip, onImportAudio, onDrop,
}) {
  const clipsAreaRef = useRef(null);
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState(track.name);

  const handleClipsClick = (e) => {
    if (e.target.classList.contains('clip') || e.target.closest('.clip')) return;
    const rect = clipsAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + (clipsAreaRef.current.scrollLeft || 0);
    onTimelineClick(x / zoom);
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const clipId = e.dataTransfer.getData('clipId');
    if (clipId) {
      const offsetX = Number(e.dataTransfer.getData('clipOffsetX') || 0);
      const rect = clipsAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - offsetX;
      onMoveClip(clipId, Math.max(0, x / zoom));
      return;
    }
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('audio/'));
    if (files.length) {
      const rect = clipsAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      onDrop(e, track.id, x);
    }
  };

  return (
    <div
      className={`track-row ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(track.id)}
    >
      {/* ── Track header ── */}
      <div className="track-header" style={{ borderLeftColor: track.color }}>
        <div className="track-header-top">
          {renaming ? (
            <input
              className="track-name-input"
              value={nameVal}
              autoFocus
              onChange={e => setNameVal(e.target.value)}
              onBlur={() => { onUpdate(track.id, { name: nameVal }); setRenaming(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { onUpdate(track.id, { name: nameVal }); setRenaming(false); } }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="track-name" onDoubleClick={e => { e.stopPropagation(); setRenaming(true); }}>
              {track.name}
            </span>
          )}
          <button
            className="track-del"
            onClick={e => { e.stopPropagation(); onRemove(track.id); }}
          >×</button>
        </div>

        <div className="track-controls">
          <div className="track-vol">
            <label>Vol</label>
            <input
              type="range" min="0" max="1" step="0.01"
              value={track.volume}
              onClick={e => e.stopPropagation()}
              onChange={e => onUpdate(track.id, { volume: Number(e.target.value) })}
            />
          </div>
          <div className="track-pan">
            <label>Pan</label>
            <input
              type="range" min="-1" max="1" step="0.01"
              value={track.pan}
              onClick={e => e.stopPropagation()}
              onChange={e => onUpdate(track.id, { pan: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="track-buttons">
          <button
            className={`tbtn mute-btn ${track.muted ? 'active-mute' : ''}`}
            onClick={e => { e.stopPropagation(); onUpdate(track.id, { muted: !track.muted }); }}
            title="Mute"
          >M</button>
          <button
            className={`tbtn solo-btn ${track.solo ? 'active-solo' : ''}`}
            onClick={e => { e.stopPropagation(); onUpdate(track.id, { solo: !track.solo }); }}
            title="Solo"
          >S</button>
          <button
            className={`tbtn arm-btn ${track.armed ? 'active-arm' : ''}`}
            onClick={e => { e.stopPropagation(); onUpdate(track.id, { armed: !track.armed }); }}
            title="Armar para gravação"
          >A</button>
        </div>
      </div>

      {/* ── Clips area ── */}
      <div
        ref={clipsAreaRef}
        className="track-clips-area"
        onClick={handleClipsClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ width: Math.max(2000, timelineDuration * zoom + 300) }}
      >
        {track.clips.map(clip => (
          <Clip
            key={clip.id}
            clip={clip}
            zoom={zoom}
            color={track.color}
            onRemove={cid => onRemoveClip(track.id, cid)}
            onDragStart={() => {}}
          />
        ))}
      </div>
    </div>
  );
}

// ─── TrackList ────────────────────────────────────────────────────────────────

export default function TrackList({
  tracks, selectedTrackId, playhead, zoom, isPlaying, isRecording,
  onSelectTrack, onTrackUpdate, onRemoveTrack,
  onTimelineClick, onRemoveClip, onMoveClip, onImportAudio, onDrop, onZoom,
}) {
  const scrollRef = useRef(null);

  const duration = Math.max(60, ...tracks.flatMap(t => t.clips.map(c => c.startTime + (c.buffer?.duration ?? 0)))) + 10;
  const playheadLeft = playhead * zoom;

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      onZoom(zoom + delta);
    }
  }, [zoom, onZoom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el?.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const [scrollLeft, setScrollLeft] = useState(0);

  return (
    <div className="track-list-container" ref={scrollRef} onScroll={e => setScrollLeft(e.currentTarget.scrollLeft)}>
      {/* Sticky header row */}
      <div className="track-list-header">
        <div className="track-list-header-left">
          <span className="zoom-label">Zoom</span>
          <input
            type="range" min="20" max="600" step="10"
            value={zoom}
            onChange={e => onZoom(Number(e.target.value))}
            style={{ width: 80 }}
          />
          <span className="zoom-value">{zoom}px/s</span>
        </div>
        <div className="track-list-ruler-wrapper">
          <TimelineRuler zoom={zoom} duration={duration} scrollLeft={scrollLeft} />
        </div>
      </div>

      {/* Tracks */}
      <div className="track-list-body">
        {/* Playhead overlay */}
        <div className="playhead-line" style={{ left: 180 + playheadLeft - scrollLeft }} />

        {tracks.map(track => (
          <TrackRow
            key={track.id}
            track={track}
            zoom={zoom}
            playhead={playhead}
            isSelected={track.id === selectedTrackId}
            timelineDuration={duration}
            onSelect={onSelectTrack}
            onUpdate={onTrackUpdate}
            onRemove={onRemoveTrack}
            onTimelineClick={onTimelineClick}
            onRemoveClip={onRemoveClip}
            onMoveClip={(clipId, st) => onMoveClip(track.id, clipId, st)}
            onImportAudio={onImportAudio}
            onDrop={onDrop}
          />
        ))}

        {tracks.length === 0 && (
          <div className="empty-state">
            <p>Nenhuma faixa. Clique em <strong>+ Faixa</strong> para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
