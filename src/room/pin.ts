// The Projects button: a pixel speech box whose tail points at the desk. It is placed on whole pixels every frame, so
// its size is measured only when its text or font changes.
import { fitPixelBox, placePixelBox } from './tags';
import type { Placed } from './tags';

/** How far above the desk's anchor the tail's tip sits, in px. */
const TAIL_GAP = 12;

export class ProjectsPin {
  private size = { w: 0, h: 0 };
  /** where the button was last placed (bottom centre and size): the labels move out of its way */
  readonly box: Placed = { x: 0, y: 0, w: 0, h: 0 };

  constructor(readonly el: HTMLElement) {}

  /** Re-measures the button (a hidden one has no size: it keeps the last). */
  measure(): void {
    if (!this.el.hidden) this.size = fitPixelBox(this.el);
  }

  /** Puts the tail's tip at a page position. */
  placeAt(x: number, y: number): void {
    this.box.x = x;
    this.box.y = y;
    this.box.w = this.size.w;
    this.box.h = this.size.h;
    placePixelBox(this.el, x, y, this.size);
  }

  /** Puts the button over a point of the stage given in normalized device coordinates (the desk's anchor). */
  placeOver(ndcX: number, ndcY: number, stage: { w: number; h: number }): void {
    this.placeAt(((ndcX + 1) / 2) * stage.w, ((1 - ndcY) / 2) * stage.h - TAIL_GAP);
  }
}
