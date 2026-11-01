// Clavier (AZERTY et QWERTY), commandes tactiles et manette (API Gamepad, disposition standard Xbox / PlayStation).
const KEYMAP = {
  ArrowUp: 'gas', KeyW: 'gas', KeyZ: 'gas',
  ArrowDown: 'brake', KeyS: 'brake',
  ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyH: 'horn', Space: 'horn',
};

export class Input {
  constructor() {
    this.state = { gas: false, brake: false, left: false, right: false, horn: false, axis: 0 };
    this.touch = {};
    this.handlers = {};
    this.hornPressed = false; // front montant, consommé par le jeu
    addEventListener('keydown', (e) => {
      const k = KEYMAP[e.code];
      if (k) {
        if (k === 'horn' && !this.state.horn) this.hornPressed = true;
        this.state[k] = true;
        e.preventDefault();
      }
      if (!e.repeat) this.emit(e.code);
    });
    addEventListener('keyup', (e) => {
      const k = KEYMAP[e.code];
      if (k) { this.state[k] = false; e.preventDefault(); }
    });
    addEventListener('blur', () => this.releaseAll());
    // manette
    this.pad = { gas: 0, brake: 0, axis: 0, left: false, right: false, horn: false };
    this.padPrev = [];
    this.padName = null;
    addEventListener('gamepadconnected', (e) => { this.padName = e.gamepad.id; this.emit('PadConnected'); });
    addEventListener('gamepaddisconnected', () => { this.padName = null; this.pad = { gas: 0, brake: 0, axis: 0 }; this.emit('PadDisconnected'); });
  }

  // à appeler à chaque image : lit la première manette branchée
  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let g = null;
    for (const p of pads) if (p && p.connected) { g = p; break; }
    if (!g) { this.pad.gas = 0; this.pad.brake = 0; this.pad.axis = 0; this.pad.horn = false; this.pad.left = this.pad.right = false; return; }
    const b = (i) => g.buttons[i] || { pressed: false, value: 0 };
    const val = (i) => Math.max(b(i).value || 0, b(i).pressed ? 1 : 0);
    // stick gauche (zone morte + courbe douce), croix directionnelle
    const x = g.axes[0] || 0;
    const dz = 0.14;
    const ax = Math.abs(x) < dz ? 0 : Math.sign(x) * Math.pow((Math.abs(x) - dz) / (1 - dz), 1.4);
    this.pad.axis = ax;
    this.pad.left = b(14).pressed;
    this.pad.right = b(15).pressed;
    // gâchettes : RT / R2 accélère, LT / L2 freine ; A / Croix accélère aussi, B / Rond freine
    this.pad.gas = Math.max(val(7), b(0).pressed ? 1 : 0, b(12).pressed ? 1 : 0);
    this.pad.brake = Math.max(val(6), b(1).pressed ? 1 : 0, b(13).pressed ? 1 : 0);
    const horn = b(2).pressed || b(10).pressed; // X / Carré, ou clic du stick gauche
    if (horn && !this.pad.horn) this.hornPressed = true;
    this.pad.horn = horn;
    // boutons à front montant
    const EDGES = { 0: 'PadA', 1: 'PadB', 3: 'KeyC', 4: 'PadLB', 5: 'KeyT', 8: 'KeyR', 9: 'PadStart', 11: 'KeyN' };
    for (const [i, code] of Object.entries(EDGES)) {
      const now = b(+i).pressed;
      if (now && !this.padPrev[i]) this.emit(code);
      this.padPrev[i] = now;
    }
  }

  on(code, fn) { (this.handlers[code] ||= []).push(fn); }
  emit(code) { for (const fn of this.handlers[code] || []) fn(); }

  releaseAll() {
    for (const k of ['gas', 'brake', 'left', 'right', 'horn']) this.state[k] = false;
    this.touch = {};
  }

  bindTouch(root) {
    const set = (el, on) => {
      const k = el.dataset.k;
      if (k === 'horn' && on && !this.touch.horn) this.hornPressed = true;
      this.touch[k] = on;
      el.classList.toggle('on', on);
    };
    for (const el of root.querySelectorAll('[data-k]')) {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); set(el, true); });
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(t, () => set(el, false));
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  read() {
    const s = this.state, t = this.touch, p = this.pad;
    const gasAmt = Math.max(s.gas || t.gas ? 1 : 0, p.gas);
    return {
      gas: gasAmt > 0.05,
      gasAmt,
      brake: s.brake || !!t.brake || p.brake > 0.25,
      left: s.left || !!t.left || p.left,
      right: s.right || !!t.right || p.right,
      horn: s.horn || !!t.horn || p.horn,
      axis: p.axis,
    };
  }

  consumeHorn() {
    const h = this.hornPressed;
    this.hornPressed = false;
    return h;
  }
}
