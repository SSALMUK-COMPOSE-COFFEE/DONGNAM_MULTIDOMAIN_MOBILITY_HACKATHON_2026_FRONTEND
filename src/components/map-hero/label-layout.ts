export type LabelSideT = 'left' | 'right';

export type LayoutLabelT = {
  label: HTMLElement;
  anchor: HTMLElement | null;
  side: LabelSideT | null;
  gap: number;
};

type BoxT = { left: number; top: number; right: number; bottom: number };

const EDGE_PAD = 4;
const ANCHOR_PAD = 2;
const LEFT_CLASS = 'is-left';
const STEPS = [0, 1, -1, 2, -2];

const overlapArea = (a: BoxT, b: BoxT) => {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

  return width > 0 && height > 0 ? width * height : 0;
};

const inflate = (rect: DOMRect, pad: number): BoxT => ({
  left: rect.left - pad,
  top: rect.top - pad,
  right: rect.right + pad,
  bottom: rect.bottom + pad,
});

const clampStart = (start: number, size: number, min: number, max: number) => {
  if (size >= max - min) return min;

  return Math.min(Math.max(start, min), max - size);
};

const isRendered = (element: HTMLElement) => element.getClientRects().length > 0;

export function layoutLabels(container: HTMLElement, items: readonly LayoutLabelT[]) {
  const frame = container.getBoundingClientRect();
  if (frame.width === 0 || frame.height === 0) return;

  items.forEach(({ label, side }) => {
    label.style.translate = '';
    if (side) label.classList.toggle(LEFT_CLASS, side === 'left');
  });

  const visible = items.filter(({ label }) => isRendered(label));
  const measured = visible.map(item => ({
    item,
    rect: item.label.getBoundingClientRect(),
    anchorRect: item.anchor && isRendered(item.anchor) ? item.anchor.getBoundingClientRect() : null,
  }));
  const anchors = measured.flatMap(({ anchorRect }) =>
    anchorRect ? [inflate(anchorRect, ANCHOR_PAD)] : []
  );
  const bounds = {
    left: frame.left + EDGE_PAD,
    top: frame.top + EDGE_PAD,
    right: frame.right - EDGE_PAD,
    bottom: frame.bottom - EDGE_PAD,
  };
  const placed: BoxT[] = [];
  const inFrame = (box: DOMRect) =>
    box.right > frame.left &&
    box.left < frame.right &&
    box.bottom > frame.top &&
    box.top < frame.bottom;

  measured.forEach(({ item, rect, anchorRect }) => {
    if (item.anchor ? !anchorRect || !inFrame(anchorRect) : !inFrame(rect)) return;
    const width = rect.width;
    const height = rect.height;
    const step = height / 2 + 3;
    const sides: (LabelSideT | null)[] = item.side
      ? [item.side, item.side === 'left' ? 'right' : 'left']
      : [null];

    const naturalLeft = (side: LabelSideT | null) => {
      if (!side || !anchorRect || side === item.side) return rect.left;

      return side === 'left' ? anchorRect.left - item.gap - width : anchorRect.right + item.gap;
    };

    let best: { side: LabelSideT | null; dx: number; dy: number; score: number } | null = null;

    for (const offset of STEPS) {
      for (const side of sides) {
        const startLeft = naturalLeft(side);
        const left = clampStart(startLeft, width, bounds.left, bounds.right);
        const top = clampStart(rect.top + offset * step, height, bounds.top, bounds.bottom);
        const box = { left, top, right: left + width, bottom: top + height };
        const score =
          [...placed, ...anchors].reduce((sum, other) => sum + overlapArea(box, other), 0) +
          Math.abs(left - startLeft) * 0.5;
        if (!best || score < best.score) {
          best = { side, dx: left - startLeft, dy: top - rect.top, score };
        }
        if (score === 0) break;
      }
      if (best && best.score === 0) break;
    }

    if (!best) return;
    if (best.side && best.side !== item.side) {
      item.label.classList.toggle(LEFT_CLASS, best.side === 'left');
    }
    const finalLeft = naturalLeft(best.side) + best.dx;
    const finalTop = rect.top + best.dy;
    if (best.dx !== 0 || best.dy !== 0) {
      item.label.style.translate = `${Math.round(best.dx)}px ${Math.round(best.dy)}px`;
    }
    placed.push({
      left: finalLeft,
      top: finalTop,
      right: finalLeft + width,
      bottom: finalTop + height,
    });
  });
}
