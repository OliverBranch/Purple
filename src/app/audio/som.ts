// Efeitos sonoros e trilha sintetizados com Web Audio. Nenhum arquivo de áudio externo.
export class Som {
  private ac: AudioContext | null = null;
  private mestre: GainNode | null = null;
  private busMusica: GainNode | null = null;
  private busSfx: GainNode | null = null;
  private timer: number | null = null;
  private passo = 0;
  private proximo = 0;
  musicaLigada = true;
  sfxLigado = true;

  /** Precisa ser chamado a partir de um clique (política de autoplay). */
  iniciar(): void {
    if (this.ac) {
      void this.ac.resume();
      return;
    }
    try {
      this.ac = new AudioContext();
    } catch {
      return;
    }
    this.mestre = this.ac.createGain();
    this.mestre.gain.value = 0.7;
    this.mestre.connect(this.ac.destination);
    this.busMusica = this.ac.createGain();
    this.busMusica.gain.value = this.musicaLigada ? 0.22 : 0;
    this.busMusica.connect(this.mestre);
    this.busSfx = this.ac.createGain();
    this.busSfx.gain.value = this.sfxLigado ? 0.5 : 0;
    this.busSfx.connect(this.mestre);
    this.tocarTrilha();
  }

  setMusica(on: boolean): void {
    this.musicaLigada = on;
    if (this.busMusica && this.ac) this.busMusica.gain.setTargetAtTime(on ? 0.22 : 0, this.ac.currentTime, 0.2);
  }

  setSfx(on: boolean): void {
    this.sfxLigado = on;
    if (this.busSfx && this.ac) this.busSfx.gain.setTargetAtTime(on ? 0.5 : 0, this.ac.currentTime, 0.05);
  }

  private tom(freq: number, dur: number, tipo: OscillatorType, vol: number, em = 0, destino?: GainNode, deslizar?: number): void {
    const ac = this.ac;
    const bus = destino ?? this.busSfx;
    if (!ac || !bus) return;
    const t = ac.currentTime + em;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t);
    if (deslizar) o.frequency.exponentialRampToValueAtTime(deslizar, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private ruido(dur: number, vol: number, filtro: number, em = 0): void {
    const ac = this.ac;
    if (!ac || !this.busSfx) return;
    const t = ac.currentTime + em;
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = filtro;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.busSfx);
    src.start(t);
  }

  clique(): void { this.tom(880, 0.04, 'square', 0.08); }
  hover(): void { this.tom(1320, 0.025, 'square', 0.03); }
  bolhaT(): void { this.tom(660 + Math.random() * 120, 0.09, 'sine', 0.12, 0, undefined, 990); }
  bolhaG(): void { this.tom(520 + Math.random() * 90, 0.1, 'triangle', 0.14, 0, undefined, 780); }
  risco(): void { this.tom(220, 0.16, 'square', 0.07, 0, undefined, 140); }
  riscoFix(): void { this.tom(500, 0.06, 'triangle', 0.1); this.tom(750, 0.08, 'triangle', 0.1, 0.05); }
  acerto(): void { [523, 659, 784].forEach((f, i) => this.tom(f, 0.16, 'square', 0.08, i * 0.07)); this.tom(1046, 0.3, 'triangle', 0.1, 0.21); }
  erro(): void { this.tom(311, 0.18, 'square', 0.08); this.tom(233, 0.3, 'square', 0.08, 0.14); }
  moeda(): void { this.tom(988, 0.07, 'square', 0.08); this.tom(1319, 0.25, 'square', 0.08, 0.07); }
  momento(): void { this.tom(784, 0.09, 'square', 0.07); this.tom(784, 0.09, 'square', 0.07, 0.14); this.tom(1046, 0.18, 'square', 0.08, 0.28); }
  noticia(): void { [1046, 784, 1318].forEach((f, i) => this.tom(f, 0.22, 'sine', 0.12, i * 0.12)); }
  maquina(): void { for (let i = 0; i < 4; i++) this.ruido(0.03, 0.15, 3000, i * 0.06); }
  ronronar(): void { for (let i = 0; i < 6; i++) this.tom(48 + (i % 2) * 6, 0.18, 'sawtooth', 0.05, i * 0.2); }
  miau(): void {
    const ac = this.ac;
    if (!ac || !this.busSfx) return;
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const f = ac.createBiquadFilter();
    const g = ac.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, t);
    o.frequency.linearRampToValueAtTime(820, t + 0.12);
    o.frequency.linearRampToValueAtTime(460, t + 0.42);
    f.type = 'bandpass';
    f.Q.value = 4;
    f.frequency.setValueAtTime(900, t);
    f.frequency.linearRampToValueAtTime(1800, t + 0.14);
    f.frequency.linearRampToValueAtTime(700, t + 0.42);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(f);
    f.connect(g);
    g.connect(this.busSfx);
    o.start(t);
    o.stop(t + 0.5);
  }
  fanfarra(): void {
    const notas = [523, 659, 784, 1046, 784, 1046, 1318];
    notas.forEach((f, i) => this.tom(f, i === notas.length - 1 ? 0.6 : 0.14, 'square', 0.08, i * 0.11));
    notas.forEach((f, i) => this.tom(f / 2, 0.14, 'triangle', 0.1, i * 0.11));
  }
  carimbo(): void { this.ruido(0.12, 0.5, 400); this.tom(90, 0.15, 'sine', 0.3); }

  // Trilha: lo-fi em chiptune, progressão I-vi-IV-V com sétimas, 84 bpm.
  private tocarTrilha(): void {
    const tick = () => {
      const ac = this.ac;
      if (!ac || !this.busMusica) return;
      const semi = 60 / 84 / 2;
      while (this.proximo < ac.currentTime + 0.25) {
        if (this.proximo < ac.currentTime) this.proximo = ac.currentTime + 0.05;
        this.nota(this.passo, this.proximo - ac.currentTime, semi);
        this.passo = (this.passo + 1) % 128;
        this.proximo += semi;
      }
    };
    this.proximo = (this.ac?.currentTime ?? 0) + 0.1;
    this.timer = window.setInterval(tick, 60);
  }

  private nota(p: number, em: number, semi: number): void {
    const bus = this.busMusica ?? undefined;
    const f = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
    const acordes = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]];
    const ac = acordes[Math.floor(p / 16) % 4] as number[];
    const raiz = ac[0] as number;
    const passoC = p % 16;
    if (passoC === 0 || passoC === 10) this.tom(f(raiz - 24), semi * 3, 'triangle', 0.5, em, bus);
    if (passoC === 6 || passoC === 14) this.tom(f(raiz - 12), semi * 1.5, 'triangle', 0.35, em, bus);
    if (passoC % 4 === 2) ac.forEach((m) => this.tom(f(m), semi * 1.2, 'sine', 0.07, em, bus));
    const melodia = [76, -1, 74, 72, -1, 71, 72, -1, 69, -1, 67, -1, 69, 71, -1, -1, 72, -1, 71, 69, -1, 67, 69, -1, 65, -1, 64, -1, 67, -1, -1, -1];
    if (p >= 64) {
      const m = melodia[p % 32] as number;
      if (m > 0) this.tom(f(m), semi * 1.6, 'square', 0.045, em, bus);
    }
    if (passoC % 2 === 1 && this.ac) {
      // chimbal suave
      const t = this.ac.currentTime + em;
      const buf = this.ac.createBuffer(1, 800, this.ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = this.ac.createBufferSource();
      s.buffer = buf;
      const hp = this.ac.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7000;
      const g = this.ac.createGain();
      g.gain.value = 0.12;
      s.connect(hp);
      hp.connect(g);
      if (this.busMusica) g.connect(this.busMusica);
      s.start(t);
    }
  }

  parar(): void {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
  }
}
