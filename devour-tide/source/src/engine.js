import Phaser from 'phaser/dist/phaser-arcade-physics.min.js';
import { loadPaintings, registerPaintings } from './illustrations.js';

const stepSeconds = 1 / 60;

export function startOceanScene({ canvas, step, paint, manual, sampleFrame, ready }) {
  class Ocean extends Phaser.Scene {
    preload() {
      loadPaintings(this);
    }

    create() {
      this.accumulator = 0;
      this.game.events.on(Phaser.Core.Events.VISIBLE, () => { this.accumulator = 0; });
      // Draw the vector world inside the scene's canvas pass, once per displayed frame.
      const world = this.add.extern();
      world.renderCanvas = paint;
      ready(registerPaintings(this));
    }

    update(time, delta) {
      if (manual()) return;
      sampleFrame(Math.max(0, this.game.loop.rawDelta) / 1000);
      this.accumulator += Math.min(0.08334, Math.max(0, delta) / 1000);
      while (this.accumulator >= stepSeconds) {
        this.accumulator -= stepSeconds;
        step(stepSeconds);
      }
    }
  }

  return new Phaser.Game({
    type: Phaser.CANVAS,
    canvas,
    context: canvas.getContext('2d'),
    width: canvas.width,
    height: canvas.height,
    parent: null,
    banner: false,
    audio: { noAudio: true },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    scale: { mode: Phaser.Scale.NONE, autoRound: true },
    fps: { target: 60, smoothStep: false },
    scene: Ocean
  });
}
