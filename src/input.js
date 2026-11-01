// Clavier (AZERTY et QWERTY) + commandes tactiles.
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
    const s = this.state, t = this.touch;
    return {
      gas: s.gas || !!t.gas,
      brake: s.brake || !!t.brake,
      left: s.left || !!t.left,
      right: s.right || !!t.right,
      horn: s.horn || !!t.horn,
      axis: 0,
    };
  }

  consumeHorn() {
    const h = this.hornPressed;
    this.hornPressed = false;
    return h;
  }
}
