class AudioEngine {
  constructor() {
    this._ctx = null;
    this._masterGain = null;
    this._tracks = new Map();
    this._startedAt = 0;
    this._playheadOffset = 0;
    this.isPlaying = false;
    this._scheduledSources = [];
    this._mediaRecorder = null;
    this._recordingChunks = [];
    this._recordingStart = 0;
    this._stream = null;
  }

  async init() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 0.8;
      this._masterGain.connect(this._ctx.destination);
    }
    if (this._ctx.state === 'suspended') await this._ctx.resume();
    return this;
  }

  get ctx() { return this._ctx; }

  get currentTime() {
    if (!this._ctx) return 0;
    if (this.isPlaying) return this._ctx.currentTime - this._startedAt + this._playheadOffset;
    return this._playheadOffset;
  }

  setPlayhead(t) { this._playheadOffset = Math.max(0, t); }

  setMasterVolume(v) {
    if (this._masterGain) this._masterGain.gain.setTargetAtTime(v, this._ctx.currentTime, 0.01);
  }

  // ─── Track management ───────────────────────────────────────────────────────

  addTrack(id) {
    if (this._tracks.has(id) || !this._ctx) return;
    const input = this._ctx.createGain();
    const panner = this._ctx.createStereoPanner();
    const analyser = this._ctx.createAnalyser();
    analyser.fftSize = 1024;
    this._tracks.set(id, { input, panner, analyser, plugins: [] });
    this._rebuildChain(id);
  }

  removeTrack(id) {
    const t = this._tracks.get(id);
    if (!t) return;
    try { t.input.disconnect(); } catch (_) {}
    try { t.panner.disconnect(); } catch (_) {}
    try { t.analyser.disconnect(); } catch (_) {}
    this._tracks.delete(id);
  }

  setVolume(id, v) {
    const t = this._tracks.get(id);
    if (t) t.input.gain.setTargetAtTime(v, this._ctx.currentTime, 0.02);
  }

  setPan(id, v) {
    const t = this._tracks.get(id);
    if (t) t.panner.pan.setTargetAtTime(v, this._ctx.currentTime, 0.02);
  }

  // ─── Plugin management ──────────────────────────────────────────────────────

  addPlugin(trackId, def) {
    const t = this._tracks.get(trackId);
    if (!t) return null;
    const nodes = this._buildPluginNodes(def.type, def.params);
    const plugin = { ...def, nodes };
    t.plugins.push(plugin);
    this._rebuildChain(trackId);
    return plugin;
  }

  removePlugin(trackId, pluginId) {
    const t = this._tracks.get(trackId);
    if (!t) return;
    const idx = t.plugins.findIndex(p => p.id === pluginId);
    if (idx === -1) return;
    this._disconnectPlugin(t.plugins[idx]);
    t.plugins.splice(idx, 1);
    this._rebuildChain(trackId);
  }

  updatePlugin(trackId, pluginId, params) {
    const t = this._tracks.get(trackId);
    if (!t) return;
    const plugin = t.plugins.find(p => p.id === pluginId);
    if (!plugin) return;
    Object.assign(plugin.params, params);
    this._applyParams(plugin);
  }

  setPluginBypass(trackId, pluginId, bypass) {
    const t = this._tracks.get(trackId);
    if (!t) return;
    const plugin = t.plugins.find(p => p.id === pluginId);
    if (!plugin) return;
    plugin.bypass = bypass;
    this._rebuildChain(trackId);
  }

  _buildPluginNodes(type, params = {}) {
    const ctx = this._ctx;
    switch (type) {
      case 'eq': {
        const low = ctx.createBiquadFilter();
        low.type = 'lowshelf';
        low.frequency.value = params.lowFreq ?? 200;
        low.gain.value = params.lowGain ?? 0;
        const mid = ctx.createBiquadFilter();
        mid.type = 'peaking';
        mid.frequency.value = params.midFreq ?? 1000;
        mid.Q.value = params.midQ ?? 1;
        mid.gain.value = params.midGain ?? 0;
        const high = ctx.createBiquadFilter();
        high.type = 'highshelf';
        high.frequency.value = params.highFreq ?? 8000;
        high.gain.value = params.highGain ?? 0;
        low.connect(mid);
        mid.connect(high);
        return { in: low, out: high, low, mid, high };
      }
      case 'compressor': {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = params.threshold ?? -24;
        comp.knee.value = params.knee ?? 30;
        comp.ratio.value = params.ratio ?? 4;
        comp.attack.value = params.attack ?? 0.003;
        comp.release.value = params.release ?? 0.25;
        return { in: comp, out: comp, comp };
      }
      case 'reverb': {
        const input = ctx.createGain();
        const dryGain = ctx.createGain(); dryGain.gain.value = params.dry ?? 0.7;
        const wetGain = ctx.createGain(); wetGain.gain.value = params.wet ?? 0.3;
        const conv = ctx.createConvolver();
        conv.buffer = this._makeReverbIR(params.duration ?? 2, params.decay ?? 2);
        const output = ctx.createGain();
        input.connect(dryGain); dryGain.connect(output);
        input.connect(conv); conv.connect(wetGain); wetGain.connect(output);
        return { in: input, out: output, dryGain, wetGain, conv };
      }
      case 'delay': {
        const input = ctx.createGain();
        const dryGain = ctx.createGain(); dryGain.gain.value = params.dry ?? 0.7;
        const wetGain = ctx.createGain(); wetGain.gain.value = params.wet ?? 0.3;
        const delay = ctx.createDelay(5);
        delay.delayTime.value = params.time ?? 0.5;
        const feedback = ctx.createGain(); feedback.gain.value = params.feedback ?? 0.4;
        const output = ctx.createGain();
        input.connect(dryGain); dryGain.connect(output);
        input.connect(delay);
        delay.connect(feedback); feedback.connect(delay);
        delay.connect(wetGain); wetGain.connect(output);
        return { in: input, out: output, delay, feedback, dryGain, wetGain };
      }
      case 'distortion': {
        const shaper = ctx.createWaveShaper();
        shaper.curve = this._makeDistortionCurve(params.amount ?? 50);
        shaper.oversample = '4x';
        const input = ctx.createGain();
        const output = ctx.createGain();
        input.connect(shaper); shaper.connect(output);
        return { in: input, out: output, shaper };
      }
      case 'chorus': {
        const input = ctx.createGain();
        const output = ctx.createGain();
        const dryGain = ctx.createGain(); dryGain.gain.value = params.dry ?? 0.7;
        const wetGain = ctx.createGain(); wetGain.gain.value = params.wet ?? 0.3;
        const delay = ctx.createDelay(0.05);
        delay.delayTime.value = params.depth ?? 0.025;
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = params.rate ?? 1.5;
        const lfoGain = ctx.createGain(); lfoGain.gain.value = params.depth ?? 0.01;
        lfo.connect(lfoGain); lfoGain.connect(delay.delayTime);
        lfo.start();
        input.connect(dryGain); dryGain.connect(output);
        input.connect(delay); delay.connect(wetGain); wetGain.connect(output);
        return { in: input, out: output, delay, lfo, lfoGain, dryGain, wetGain };
      }
      default: {
        const pass = ctx.createGain();
        return { in: pass, out: pass };
      }
    }
  }

  _applyParams(plugin) {
    const { type, nodes, params } = plugin;
    if (!nodes) return;
    switch (type) {
      case 'eq':
        if (params.lowFreq !== undefined) nodes.low.frequency.value = params.lowFreq;
        if (params.lowGain !== undefined) nodes.low.gain.value = params.lowGain;
        if (params.midFreq !== undefined) nodes.mid.frequency.value = params.midFreq;
        if (params.midQ !== undefined) nodes.mid.Q.value = params.midQ;
        if (params.midGain !== undefined) nodes.mid.gain.value = params.midGain;
        if (params.highFreq !== undefined) nodes.high.frequency.value = params.highFreq;
        if (params.highGain !== undefined) nodes.high.gain.value = params.highGain;
        break;
      case 'compressor':
        if (params.threshold !== undefined) nodes.comp.threshold.value = params.threshold;
        if (params.knee !== undefined) nodes.comp.knee.value = params.knee;
        if (params.ratio !== undefined) nodes.comp.ratio.value = params.ratio;
        if (params.attack !== undefined) nodes.comp.attack.value = params.attack;
        if (params.release !== undefined) nodes.comp.release.value = params.release;
        break;
      case 'reverb':
        if (params.dry !== undefined) nodes.dryGain.gain.value = params.dry;
        if (params.wet !== undefined) nodes.wetGain.gain.value = params.wet;
        if (params.duration !== undefined || params.decay !== undefined)
          nodes.conv.buffer = this._makeReverbIR(params.duration ?? 2, params.decay ?? 2);
        break;
      case 'delay':
        if (params.time !== undefined) nodes.delay.delayTime.value = params.time;
        if (params.feedback !== undefined) nodes.feedback.gain.value = params.feedback;
        if (params.wet !== undefined) nodes.wetGain.gain.value = params.wet;
        if (params.dry !== undefined) nodes.dryGain.gain.value = params.dry;
        break;
      case 'distortion':
        if (params.amount !== undefined) nodes.shaper.curve = this._makeDistortionCurve(params.amount);
        break;
    }
  }

  _disconnectPlugin(plugin) {
    if (!plugin.nodes) return;
    try { plugin.nodes.in.disconnect(); } catch (_) {}
    try { plugin.nodes.out.disconnect(); } catch (_) {}
    if (plugin.type === 'chorus' && plugin.nodes.lfo) {
      try { plugin.nodes.lfo.stop(); plugin.nodes.lfo.disconnect(); } catch (_) {}
    }
  }

  _rebuildChain(trackId) {
    const t = this._tracks.get(trackId);
    if (!t || !this._ctx) return;
    try { t.input.disconnect(); } catch (_) {}
    try { t.panner.disconnect(); } catch (_) {}
    try { t.analyser.disconnect(); } catch (_) {}
    t.plugins.forEach(p => {
      try { p.nodes?.in?.disconnect(); } catch (_) {}
      try { p.nodes?.out?.disconnect(); } catch (_) {}
    });

    let cur = t.input;
    cur.connect(t.panner);
    cur = t.panner;

    for (const plugin of t.plugins) {
      if (plugin.bypass || !plugin.nodes) continue;
      cur.connect(plugin.nodes.in);
      cur = plugin.nodes.out;
    }

    cur.connect(t.analyser);
    t.analyser.connect(this._masterGain);
  }

  _makeReverbIR(duration = 2, decay = 2) {
    const sr = this._ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const buf = this._ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++)
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  _makeDistortionCurve(amount) {
    const n = 512;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  // ─── Playback ────────────────────────────────────────────────────────────────

  play(tracks, playheadPos) {
    if (this.isPlaying || !this._ctx) return;
    this._playheadOffset = playheadPos;
    this._startedAt = this._ctx.currentTime;
    this.isPlaying = true;

    const hasSolo = tracks.some(tr => tr.solo);

    for (const track of tracks) {
      if (track.muted) continue;
      if (hasSolo && !track.solo) continue;
      const et = this._tracks.get(track.id);
      if (!et) continue;

      for (const clip of track.clips) {
        if (!clip.buffer) continue;
        const clipEnd = clip.startTime + clip.buffer.duration;
        if (clipEnd <= playheadPos) continue;

        const src = this._ctx.createBufferSource();
        src.buffer = clip.buffer;
        src.connect(et.input);

        const offsetInClip = Math.max(0, playheadPos - clip.startTime);
        const when = this._ctx.currentTime + Math.max(0, clip.startTime - playheadPos);
        src.start(when, offsetInClip);
        this._scheduledSources.push(src);
      }
    }
  }

  stop() {
    const pos = this.isPlaying ? this.currentTime : this._playheadOffset;
    this._scheduledSources.forEach(s => { try { s.stop(); } catch (_) {} });
    this._scheduledSources = [];
    this.isPlaying = false;
    this._playheadOffset = pos;
    return pos;
  }

  rewind() {
    this.stop();
    this._playheadOffset = 0;
  }

  // ─── Recording ───────────────────────────────────────────────────────────────

  async startRecording() {
    await this.init();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this._stream = stream;
    this._recordingChunks = [];
    this._recordingStart = this.currentTime;
    const opts = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? { mimeType: 'audio/webm;codecs=opus' }
      : {};
    this._mediaRecorder = new MediaRecorder(stream, opts);
    this._mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) this._recordingChunks.push(e.data);
    };
    this._mediaRecorder.start(100);
    return this._recordingStart;
  }

  stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this._mediaRecorder || this._mediaRecorder.state === 'inactive') {
        reject(new Error('Not recording'));
        return;
      }
      const startTime = this._recordingStart;
      this._mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this._recordingChunks, { type: this._mediaRecorder.mimeType });
          const ab = await blob.arrayBuffer();
          const buffer = await this._ctx.decodeAudioData(ab);
          this._stream?.getTracks().forEach(t => t.stop());
          resolve({ buffer, startTime });
        } catch (err) { reject(err); }
      };
      this._mediaRecorder.stop();
    });
  }

  async loadFile(file) {
    await this.init();
    const ab = await file.arrayBuffer();
    return this._ctx.decodeAudioData(ab);
  }

  // ─── Waveform ────────────────────────────────────────────────────────────────

  getWaveformPeaks(buffer, n = 800) {
    const data = buffer.getChannelData(0);
    const block = Math.floor(data.length / n);
    const peaks = new Array(n);
    for (let i = 0; i < n; i++) {
      let min = 0, max = 0;
      const base = i * block;
      for (let j = 0; j < block; j++) {
        const s = data[base + j] || 0;
        if (s < min) min = s;
        if (s > max) max = s;
      }
      peaks[i] = [min, max];
    }
    return peaks;
  }
}

export default new AudioEngine();
