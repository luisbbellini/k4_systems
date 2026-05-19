import React, {
  useReducer, useRef, useCallback, useEffect, useState,
} from 'react';
import AudioEngine from './engine/AudioEngine.js';
import Transport from './components/Transport.jsx';
import TrackList from './components/TrackList.jsx';
import PluginRack from './components/PluginRack.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLORS = ['#4fc3f7','#81c784','#ffb74d','#f48fb1','#ce93d8','#80cbc4','#a5d6a7','#ff8a65'];
let _tc = 0;
let _cc = 0;

const newTrack = () => {
  _tc++;
  return {
    id: `t_${Date.now()}_${_tc}`,
    name: `Track ${_tc}`,
    color: COLORS[(_tc - 1) % COLORS.length],
    volume: 0.8, pan: 0,
    muted: false, solo: false, armed: false,
    clips: [], plugins: [],
  };
};

const newClip = (startTime, buffer, peaks, name) => {
  _cc++;
  return {
    id: `c_${Date.now()}_${_cc}`,
    name: name || `Clip ${_cc}`,
    startTime, buffer, peaks,
  };
};

const PLUGIN_DEFAULTS = {
  eq:          { lowFreq: 200, lowGain: 0, midFreq: 1000, midQ: 1, midGain: 0, highFreq: 8000, highGain: 0 },
  compressor:  { threshold: -24, knee: 30, ratio: 4, attack: 0.003, release: 0.25 },
  reverb:      { duration: 2, decay: 2, wet: 0.3, dry: 0.7 },
  delay:       { time: 0.5, feedback: 0.4, wet: 0.3, dry: 0.7 },
  distortion:  { amount: 50 },
  chorus:      { rate: 1.5, depth: 0.01, wet: 0.3, dry: 0.7 },
};
const PLUGIN_NAMES = { eq: 'EQ 3-Band', compressor: 'Compressor', reverb: 'Reverb', delay: 'Delay', distortion: 'Distortion', chorus: 'Chorus' };

const newPlugin = (type) => ({
  id: `p_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  type, name: PLUGIN_NAMES[type] || type,
  bypass: false,
  params: { ...PLUGIN_DEFAULTS[type] },
});

// ─── Reducer ──────────────────────────────────────────────────────────────────

const t1 = newTrack(), t2 = newTrack();
const INITIAL = {
  tracks: [t1, t2],
  selectedTrackId: t1.id,
  zoom: 100,
  bpm: 120,
  masterVolume: 0.8,
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_TRACK': {
      const t = newTrack();
      return { ...state, tracks: [...state.tracks, t], selectedTrackId: t.id };
    }
    case 'REMOVE_TRACK': {
      const tracks = state.tracks.filter(t => t.id !== action.id);
      return {
        ...state, tracks,
        selectedTrackId: state.selectedTrackId === action.id
          ? (tracks[0]?.id ?? null) : state.selectedTrackId,
      };
    }
    case 'UPDATE_TRACK':
      return { ...state, tracks: state.tracks.map(t => t.id === action.id ? { ...t, ...action.updates } : t) };
    case 'ADD_CLIP':
      return { ...state, tracks: state.tracks.map(t => t.id === action.trackId ? { ...t, clips: [...t.clips, action.clip] } : t) };
    case 'REMOVE_CLIP':
      return { ...state, tracks: state.tracks.map(t => t.id === action.trackId ? { ...t, clips: t.clips.filter(c => c.id !== action.clipId) } : t) };
    case 'MOVE_CLIP':
      return { ...state, tracks: state.tracks.map(t => t.id === action.trackId ? { ...t, clips: t.clips.map(c => c.id === action.clipId ? { ...c, startTime: Math.max(0, action.startTime) } : c) } : t) };
    case 'ADD_PLUGIN':
      return { ...state, tracks: state.tracks.map(t => t.id === action.trackId ? { ...t, plugins: [...t.plugins, action.plugin] } : t) };
    case 'REMOVE_PLUGIN':
      return { ...state, tracks: state.tracks.map(t => t.id === action.trackId ? { ...t, plugins: t.plugins.filter(p => p.id !== action.pluginId) } : t) };
    case 'UPDATE_PLUGIN':
      return { ...state, tracks: state.tracks.map(t => t.id === action.trackId ? { ...t, plugins: t.plugins.map(p => p.id === action.pluginId ? { ...p, params: { ...p.params, ...action.params } } : p) } : t) };
    case 'TOGGLE_BYPASS':
      return { ...state, tracks: state.tracks.map(t => t.id === action.trackId ? { ...t, plugins: t.plugins.map(p => p.id === action.pluginId ? { ...p, bypass: !p.bypass } : p) } : t) };
    case 'SELECT_TRACK':
      return { ...state, selectedTrackId: action.id };
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(20, Math.min(600, action.zoom)) };
    case 'SET_BPM':
      return { ...state, bpm: Math.max(20, Math.min(300, action.bpm)) };
    case 'SET_MASTER_VOL':
      return { ...state, masterVolume: action.value };
    default:
      return state;
  }
}

// ─── DAW Component ────────────────────────────────────────────────────────────

export default function DAW() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [error, setError] = useState(null);

  const animRef = useRef(null);
  const fileInputRef = useRef(null);
  const tracksRef = useRef(state.tracks);
  tracksRef.current = state.tracks;

  // Sync engine tracks when state.tracks changes
  useEffect(() => {
    if (!engineReady) return;
    const ids = new Set(state.tracks.map(t => t.id));
    state.tracks.forEach(t => AudioEngine.addTrack(t.id));
    AudioEngine._tracks.forEach((_, id) => { if (!ids.has(id)) AudioEngine.removeTrack(id); });
  }, [state.tracks, engineReady]);

  // Sync volume/pan
  useEffect(() => {
    if (!engineReady) return;
    state.tracks.forEach(t => {
      AudioEngine.setVolume(t.id, t.muted ? 0 : t.volume);
      AudioEngine.setPan(t.id, t.pan);
    });
  }, [state.tracks, engineReady]);

  // Init engine on first interaction
  const ensureEngine = useCallback(async () => {
    if (!engineReady) {
      await AudioEngine.init();
      state.tracks.forEach(t => AudioEngine.addTrack(t.id));
      setEngineReady(true);
    }
  }, [engineReady, state.tracks]);

  // Playhead animation
  const startAnimation = useCallback(() => {
    const tick = () => {
      setPlayhead(AudioEngine.currentTime);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, []);

  const stopAnimation = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }, []);

  // ─── Transport ──────────────────────────────────────────────────────────────

  const handlePlay = useCallback(async () => {
    if (isPlaying) return;
    await ensureEngine();
    AudioEngine.play(tracksRef.current, playhead);
    setIsPlaying(true);
    startAnimation();
  }, [isPlaying, playhead, ensureEngine, startAnimation]);

  const handleStop = useCallback(() => {
    const pos = AudioEngine.stop();
    setIsPlaying(false);
    stopAnimation();
    setPlayhead(pos);
    if (isRecording) {
      AudioEngine.stopRecording().then(({ buffer, startTime }) => {
        const peaks = AudioEngine.getWaveformPeaks(buffer);
        const armedTrack = tracksRef.current.find(t => t.armed);
        if (armedTrack) {
          dispatch({ type: 'ADD_CLIP', trackId: armedTrack.id, clip: newClip(startTime, buffer, peaks, 'Recording') });
        }
        setIsRecording(false);
      }).catch(err => { console.error(err); setIsRecording(false); });
    }
  }, [isRecording, stopAnimation]);

  const handleRewind = useCallback(() => {
    AudioEngine.rewind();
    setIsPlaying(false);
    stopAnimation();
    setPlayhead(0);
    if (isRecording) setIsRecording(false);
  }, [isRecording, stopAnimation]);

  const handleRecord = useCallback(async () => {
    if (isRecording) {
      handleStop();
      return;
    }
    const armed = tracksRef.current.find(t => t.armed);
    if (!armed) { setError('Ative o REC em uma faixa primeiro (botão A)'); setTimeout(() => setError(null), 3000); return; }
    await ensureEngine();
    try {
      await AudioEngine.startRecording();
      setIsRecording(true);
      if (!isPlaying) {
        AudioEngine.play(tracksRef.current, playhead);
        setIsPlaying(true);
        startAnimation();
      }
    } catch (err) {
      setError('Microfone não autorizado: ' + err.message);
      setTimeout(() => setError(null), 4000);
    }
  }, [isRecording, isPlaying, playhead, ensureEngine, handleStop, startAnimation]);

  // ─── Timeline click (move playhead) ─────────────────────────────────────────

  const handleTimelineClick = useCallback(async (timePos) => {
    await ensureEngine();
    const wasPlaying = isPlaying;
    if (wasPlaying) handleStop();
    AudioEngine.setPlayhead(timePos);
    setPlayhead(timePos);
    if (wasPlaying) {
      setTimeout(() => {
        AudioEngine.play(tracksRef.current, timePos);
        setIsPlaying(true);
        startAnimation();
      }, 50);
    }
  }, [isPlaying, ensureEngine, handleStop, startAnimation]);

  // ─── Track actions ──────────────────────────────────────────────────────────

  const handleAddTrack = () => dispatch({ type: 'ADD_TRACK' });
  const handleRemoveTrack = (id) => {
    AudioEngine.removeTrack(id);
    dispatch({ type: 'REMOVE_TRACK', id });
  };
  const handleTrackUpdate = (id, updates) => {
    dispatch({ type: 'UPDATE_TRACK', id, updates });
  };
  const handleSelectTrack = (id) => dispatch({ type: 'SELECT_TRACK', id });

  // ─── Clip actions ────────────────────────────────────────────────────────────

  const handleImportAudio = useCallback(async (file, trackId, startTime) => {
    await ensureEngine();
    try {
      const buffer = await AudioEngine.loadFile(file);
      const peaks = AudioEngine.getWaveformPeaks(buffer);
      const clip = newClip(startTime ?? playhead, buffer, peaks, file.name.replace(/\.[^.]+$/, ''));
      dispatch({ type: 'ADD_CLIP', trackId, clip });
    } catch (err) {
      setError('Erro ao importar: ' + err.message);
      setTimeout(() => setError(null), 3000);
    }
  }, [ensureEngine, playhead]);

  const handleRemoveClip = (trackId, clipId) => dispatch({ type: 'REMOVE_CLIP', trackId, clipId });
  const handleMoveClip = (trackId, clipId, startTime) => dispatch({ type: 'MOVE_CLIP', trackId, clipId, startTime });

  // ─── Plugin actions ──────────────────────────────────────────────────────────

  const handleAddPlugin = useCallback((trackId, type) => {
    const def = newPlugin(type);
    const plugin = AudioEngine.addPlugin(trackId, def);
    if (plugin) dispatch({ type: 'ADD_PLUGIN', trackId, plugin: def });
  }, []);

  const handleRemovePlugin = useCallback((trackId, pluginId) => {
    AudioEngine.removePlugin(trackId, pluginId);
    dispatch({ type: 'REMOVE_PLUGIN', trackId, pluginId });
  }, []);

  const handleUpdatePlugin = useCallback((trackId, pluginId, params) => {
    AudioEngine.updatePlugin(trackId, pluginId, params);
    dispatch({ type: 'UPDATE_PLUGIN', trackId, pluginId, params });
  }, []);

  const handleToggleBypass = useCallback((trackId, pluginId, bypass) => {
    AudioEngine.setPluginBypass(trackId, pluginId, bypass);
    dispatch({ type: 'TOGGLE_BYPASS', trackId, pluginId });
  }, []);

  // ─── Master volume ───────────────────────────────────────────────────────────

  const handleMasterVolume = (v) => {
    AudioEngine.setMasterVolume(v);
    dispatch({ type: 'SET_MASTER_VOL', value: v });
  };

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); isPlaying ? handleStop() : handlePlay(); }
      if (e.code === 'KeyR') handleRecord();
      if (e.code === 'Home' || e.code === 'Numpad0') handleRewind();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, handlePlay, handleStop, handleRecord, handleRewind]);

  // ─── Drag-and-drop file import ───────────────────────────────────────────────

  const handleDrop = useCallback((e, trackId, dropX) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('audio/'));
    if (!files.length) return;
    const startTime = dropX / state.zoom;
    files.forEach(f => handleImportAudio(f, trackId, startTime));
  }, [state.zoom, handleImportAudio]);

  const selectedTrack = state.tracks.find(t => t.id === state.selectedTrackId);

  return (
    <div className="daw">
      <header className="daw-header">
        <div className="daw-logo">
          <span className="logo-k">K</span>
          <span className="logo-audio">-Audio</span>
          <span className="logo-daw">DAW</span>
        </div>
        <Transport
          isPlaying={isPlaying}
          isRecording={isRecording}
          playhead={playhead}
          bpm={state.bpm}
          masterVolume={state.masterVolume}
          onPlay={handlePlay}
          onStop={handleStop}
          onRewind={handleRewind}
          onRecord={handleRecord}
          onBpmChange={bpm => dispatch({ type: 'SET_BPM', bpm })}
          onMasterVolume={handleMasterVolume}
        />
        <div className="daw-header-right">
          <button className="btn-add-track" onClick={handleAddTrack}>+ Faixa</button>
          <button className="btn-import" onClick={() => fileInputRef.current?.click()}>↑ Importar</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => {
              const files = [...e.target.files];
              const tid = state.selectedTrackId || state.tracks[0]?.id;
              if (tid) files.forEach(f => handleImportAudio(f, tid));
              e.target.value = '';
            }}
          />
        </div>
      </header>

      {error && <div className="daw-error">{error}</div>}

      <div className="daw-workspace">
        <TrackList
          tracks={state.tracks}
          selectedTrackId={state.selectedTrackId}
          playhead={playhead}
          zoom={state.zoom}
          isPlaying={isPlaying}
          isRecording={isRecording}
          onSelectTrack={handleSelectTrack}
          onTrackUpdate={handleTrackUpdate}
          onRemoveTrack={handleRemoveTrack}
          onTimelineClick={handleTimelineClick}
          onRemoveClip={handleRemoveClip}
          onMoveClip={handleMoveClip}
          onImportAudio={handleImportAudio}
          onDrop={handleDrop}
          onZoom={zoom => dispatch({ type: 'SET_ZOOM', zoom })}
        />
      </div>

      {selectedTrack && (
        <PluginRack
          track={selectedTrack}
          onAddPlugin={type => handleAddPlugin(selectedTrack.id, type)}
          onRemovePlugin={pid => handleRemovePlugin(selectedTrack.id, pid)}
          onUpdatePlugin={(pid, params) => handleUpdatePlugin(selectedTrack.id, pid, params)}
          onToggleBypass={pid => handleToggleBypass(selectedTrack.id, pid, !selectedTrack.plugins.find(p => p.id === pid)?.bypass)}
        />
      )}
    </div>
  );
}
