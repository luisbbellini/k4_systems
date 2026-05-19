import React, { useState } from 'react';

const PLUGIN_TYPES = [
  { type: 'eq',         label: 'EQ 3-Band',    icon: '〰' },
  { type: 'compressor', label: 'Compressor',   icon: '▼▲' },
  { type: 'reverb',     label: 'Reverb',       icon: '◎' },
  { type: 'delay',      label: 'Delay',        icon: '↩' },
  { type: 'distortion', label: 'Distortion',   icon: '⚡' },
  { type: 'chorus',     label: 'Chorus',       icon: '≋' },
];

// ─── Param slider ─────────────────────────────────────────────────────────────

function Param({ label, min, max, step = 0.01, value, onChange, format }) {
  const display = format ? format(value) : Number(value).toFixed(2);
  return (
    <div className="param">
      <label className="param-label">{label}</label>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="param-slider"
      />
      <span className="param-value">{display}</span>
    </div>
  );
}

// ─── Plugin editors ───────────────────────────────────────────────────────────

function EQEditor({ params, onChange }) {
  const p = (key, val) => onChange({ [key]: val });
  return (
    <div className="plugin-params">
      <div className="plugin-band-label">Low Shelf</div>
      <Param label="Freq" min={20} max={500} step={1} value={params.lowFreq} onChange={v => p('lowFreq', v)} format={v => `${v}Hz`} />
      <Param label="Gain" min={-12} max={12} step={0.1} value={params.lowGain} onChange={v => p('lowGain', v)} format={v => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`} />
      <div className="plugin-band-label">Mid Peak</div>
      <Param label="Freq" min={200} max={8000} step={10} value={params.midFreq} onChange={v => p('midFreq', v)} format={v => `${v}Hz`} />
      <Param label="Q" min={0.1} max={10} step={0.1} value={params.midQ} onChange={v => p('midQ', v)} format={v => v.toFixed(1)} />
      <Param label="Gain" min={-12} max={12} step={0.1} value={params.midGain} onChange={v => p('midGain', v)} format={v => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`} />
      <div className="plugin-band-label">High Shelf</div>
      <Param label="Freq" min={2000} max={20000} step={100} value={params.highFreq} onChange={v => p('highFreq', v)} format={v => v >= 1000 ? `${(v/1000).toFixed(1)}kHz` : `${v}Hz`} />
      <Param label="Gain" min={-12} max={12} step={0.1} value={params.highGain} onChange={v => p('highGain', v)} format={v => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`} />
    </div>
  );
}

function CompressorEditor({ params, onChange }) {
  const p = (key, val) => onChange({ [key]: val });
  return (
    <div className="plugin-params">
      <Param label="Threshold" min={-60} max={0} step={0.5} value={params.threshold} onChange={v => p('threshold', v)} format={v => `${v}dB`} />
      <Param label="Knee" min={0} max={40} step={0.5} value={params.knee} onChange={v => p('knee', v)} format={v => `${v}dB`} />
      <Param label="Ratio" min={1} max={20} step={0.1} value={params.ratio} onChange={v => p('ratio', v)} format={v => `${v.toFixed(1)}:1`} />
      <Param label="Attack" min={0.001} max={1} step={0.001} value={params.attack} onChange={v => p('attack', v)} format={v => `${(v*1000).toFixed(1)}ms`} />
      <Param label="Release" min={0.01} max={2} step={0.01} value={params.release} onChange={v => p('release', v)} format={v => `${(v*1000).toFixed(0)}ms`} />
    </div>
  );
}

function ReverbEditor({ params, onChange }) {
  const p = (key, val) => onChange({ [key]: val });
  return (
    <div className="plugin-params">
      <Param label="Duration" min={0.1} max={10} step={0.1} value={params.duration} onChange={v => p('duration', v)} format={v => `${v.toFixed(1)}s`} />
      <Param label="Decay" min={0.1} max={10} step={0.1} value={params.decay} onChange={v => p('decay', v)} format={v => v.toFixed(1)} />
      <Param label="Wet" min={0} max={1} step={0.01} value={params.wet} onChange={v => p('wet', v)} format={v => `${Math.round(v*100)}%`} />
      <Param label="Dry" min={0} max={1} step={0.01} value={params.dry} onChange={v => p('dry', v)} format={v => `${Math.round(v*100)}%`} />
    </div>
  );
}

function DelayEditor({ params, onChange }) {
  const p = (key, val) => onChange({ [key]: val });
  return (
    <div className="plugin-params">
      <Param label="Time" min={0.01} max={2} step={0.01} value={params.time} onChange={v => p('time', v)} format={v => `${(v*1000).toFixed(0)}ms`} />
      <Param label="Feedback" min={0} max={0.95} step={0.01} value={params.feedback} onChange={v => p('feedback', v)} format={v => `${Math.round(v*100)}%`} />
      <Param label="Wet" min={0} max={1} step={0.01} value={params.wet} onChange={v => p('wet', v)} format={v => `${Math.round(v*100)}%`} />
      <Param label="Dry" min={0} max={1} step={0.01} value={params.dry} onChange={v => p('dry', v)} format={v => `${Math.round(v*100)}%`} />
    </div>
  );
}

function DistortionEditor({ params, onChange }) {
  return (
    <div className="plugin-params">
      <Param label="Drive" min={0} max={400} step={1} value={params.amount} onChange={v => onChange({ amount: v })} format={v => `${v}`} />
    </div>
  );
}

function ChorusEditor({ params, onChange }) {
  const p = (key, val) => onChange({ [key]: val });
  return (
    <div className="plugin-params">
      <Param label="Rate" min={0.1} max={10} step={0.1} value={params.rate} onChange={v => p('rate', v)} format={v => `${v.toFixed(1)}Hz`} />
      <Param label="Depth" min={0.001} max={0.05} step={0.001} value={params.depth} onChange={v => p('depth', v)} format={v => `${(v*1000).toFixed(1)}ms`} />
      <Param label="Wet" min={0} max={1} step={0.01} value={params.wet} onChange={v => p('wet', v)} format={v => `${Math.round(v*100)}%`} />
    </div>
  );
}

const EDITORS = {
  eq: EQEditor,
  compressor: CompressorEditor,
  reverb: ReverbEditor,
  delay: DelayEditor,
  distortion: DistortionEditor,
  chorus: ChorusEditor,
};

// ─── Plugin card ──────────────────────────────────────────────────────────────

function PluginCard({ plugin, onRemove, onUpdate, onToggleBypass }) {
  const [expanded, setExpanded] = useState(true);
  const Editor = EDITORS[plugin.type];

  return (
    <div className={`plugin-card ${plugin.bypass ? 'bypassed' : ''}`}>
      <div className="plugin-card-header">
        <button
          className={`plugin-bypass-btn ${plugin.bypass ? 'is-bypassed' : ''}`}
          onClick={onToggleBypass}
          title={plugin.bypass ? 'Ativar plugin' : 'Bypass plugin'}
        >{plugin.bypass ? '○' : '●'}</button>
        <span className="plugin-card-name" onClick={() => setExpanded(x => !x)}>
          {plugin.name}
        </span>
        <button
          className="plugin-expand-btn"
          onClick={() => setExpanded(x => !x)}
        >{expanded ? '▲' : '▼'}</button>
        <button className="plugin-remove-btn" onClick={onRemove} title="Remover plugin">×</button>
      </div>
      {expanded && Editor && (
        <Editor params={plugin.params} onChange={onUpdate} />
      )}
    </div>
  );
}

// ─── Plugin rack ──────────────────────────────────────────────────────────────

export default function PluginRack({ track, onAddPlugin, onRemovePlugin, onUpdatePlugin, onToggleBypass }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="plugin-rack">
      <div className="plugin-rack-header">
        <span className="plugin-rack-title">
          Plugin Rack — <span style={{ color: track.color }}>{track.name}</span>
        </span>
        <div className="plugin-add-container">
          <button
            className="btn-add-plugin"
            onClick={() => setShowMenu(x => !x)}
          >+ Adicionar Plugin</button>
          {showMenu && (
            <div className="plugin-menu">
              {PLUGIN_TYPES.map(({ type, label, icon }) => (
                <button
                  key={type}
                  className="plugin-menu-item"
                  onClick={() => { onAddPlugin(type); setShowMenu(false); }}
                >
                  <span className="plugin-menu-icon">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="plugin-rack-body">
        {track.plugins.length === 0 && (
          <div className="plugin-empty">Nenhum plugin. Clique em <strong>+ Adicionar Plugin</strong>.</div>
        )}
        {track.plugins.map(plugin => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            onRemove={() => onRemovePlugin(plugin.id)}
            onUpdate={params => onUpdatePlugin(plugin.id, params)}
            onToggleBypass={() => onToggleBypass(plugin.id)}
          />
        ))}
      </div>
    </div>
  );
}
