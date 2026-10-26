import { useEffect, useRef, useState } from 'react';
import { VIBES, zoneAt } from '../vibe';
import type { Vibe } from '../vibe';

/**
 * Where the chart itself sits inside vibemeter.webp, as percentages of the
 * file. Measured off the image rather than eyeballed, so the marker lands on
 * the right quadrant at whatever size the dialog renders it — and re-measured
 * after the switch from PNG, which came back identical to the pixel.
 */
const CHART = { left: 15.0, right: 87.33, top: 13.84, bottom: 91.07 };

const PERCENT = (value: number) => `${Math.round(value * 100)}%`;

/** A point on the chart, as a position inside the image. */
function marker(point: { energy: number; pleasantness: number }) {
  return {
    left: `${CHART.left + point.pleasantness * (CHART.right - CHART.left)}%`,
    // Energy runs up the chart, so 1 is the top.
    top: `${CHART.top + (1 - point.energy) * (CHART.bottom - CHART.top)}%`,
  };
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * The reverse of `marker`: where a pointer landed, as the two axes.
 *
 * TEMPORARY — a probe for checking the regions against the artwork. Drag the
 * dot and the reading follows the cursor, so a zone that disagrees with the
 * picture shows up immediately. Delete this, `probe`, and the handlers on the
 * chart once the boundaries are settled.
 */
function pointAt(event: { clientX: number; clientY: number }, box: DOMRect) {
  const left = box.left + (CHART.left / 100) * box.width;
  const right = box.left + (CHART.right / 100) * box.width;
  const top = box.top + (CHART.top / 100) * box.height;
  const bottom = box.top + (CHART.bottom / 100) * box.height;
  return {
    pleasantness: clamp((event.clientX - left) / (right - left)),
    energy: clamp(1 - (event.clientY - top) / (bottom - top)),
  };
}

function Axis({ name, value, detail }: { name: string; value: number; detail: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-text-primary">{name}</span>
        <span className="font-mono text-xs text-text-muted">{PERCENT(value)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-brand-primary"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-text-muted">{detail}</p>
    </div>
  );
}

/**
 * What the vibe is and how it was arrived at.
 *
 * The chart is the explanation, so the dialog is built around it with the
 * project's own position marked on it — a legend you have to map onto yourself
 * is the tacked-on version of this.
 */
export default function VibeDialog({
  reading,
  onClose,
}: {
  reading: Vibe;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  // TEMPORARY, with pointAt above.
  const [probe, setProbe] = useState<{ energy: number; pleasantness: number } | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const shown = probe ?? reading;
  const { label, token } = VIBES[probe ? zoneAt(probe.energy, probe.pleasantness) : reading.zone];

  function track(event: React.PointerEvent<HTMLDivElement>) {
    const box = chartRef.current?.getBoundingClientRect();
    if (box) setProbe(pointAt(event, box));
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="vibe-title"
      onClose={onClose}
      className="m-auto w-full max-w-lg rounded-xl border border-line bg-surface-card p-6 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="vibe-title" className="text-base font-semibold text-text-primary">
            The Vibe Meter
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted">
            {/* TEMPORARY: says which it is, so a dragged dot is never mistaken
                for the project's actual reading. */}
            {probe ? 'At the dot:' : 'Right now:'}
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: `rgb(var(${token}))` }}
            />
            <span className="font-medium text-text-primary">{label}</span>
          </p>
        </div>
        <button
          type="button"
          autoFocus
          onClick={() => dialogRef.current?.close()}
          className="shrink-0 rounded-full border border-line px-3 py-1 text-sm text-text-primary hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          Close
        </button>
      </div>

      {/* The chart, with the project on it. The marker is white with a dark
          ring so it reads on all five quadrant colours — the image is a fixed
          light poster, so it cannot follow the theme. */}
      <div
        ref={chartRef}
        // TEMPORARY: drag anywhere on the chart to move the dot and see which
        // zone that point reports.
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          track(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) track(event);
        }}
        className="relative mt-4 cursor-crosshair select-none overflow-hidden rounded-lg"
      >
        <img
          src="/vibemeter.webp"
          alt="The vibe meter: energy from low to high up the chart, unpleasant to pleasant across it."
          className="block w-full"
        />
        {/* Behind the dot, tinted with the vibe's own colour — the same token
            the header chip uses, so one hue means one mood everywhere. The
            dark edge stays, because that is what makes the ring legible over
            all seven quadrant colours; the tint alone would vanish on the
            quadrant it matches. Translucent, so a 2.6x ring never hides the
            chart under it. While probing it follows the dot, so dragging
            across a boundary recolours the pulse. */}
        <span
          aria-hidden="true"
          style={{ ...marker(shown), backgroundColor: `rgb(var(${token}) / 0.55)` }}
          className="anim-vibe-ping absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#1D1D1F]"
        />
        <span
          aria-hidden="true"
          style={marker(shown)}
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#1D1D1F] bg-white shadow-lg"
        />
      </div>

      {/* TEMPORARY: the probe's own readout, so the number under the cursor
          can be compared with the region it is sitting on. */}
      {probe && (
        <p className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-surface-sunken px-3 py-2 font-mono text-xs text-text-primary">
          <span>
            pleasant {(probe.pleasantness * 100).toFixed(0)}% · energy{' '}
            {(probe.energy * 100).toFixed(0)}% → {label}
          </span>
          <button
            type="button"
            onClick={() => setProbe(null)}
            className="shrink-0 underline hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            real reading
          </button>
        </p>
      )}

      <div className="mt-5 space-y-4">
        <Axis
          name="Energy"
          value={reading.energy}
          detail={
            reading.total === 0
              ? 'No tasks yet.'
              : `${reading.moving} of ${reading.total} ${
                  reading.total === 1 ? 'task has' : 'tasks have'
                } left To Do. Adding untouched work brings it down.`
          }
        />
        <Axis
          name="Pleasantness"
          value={reading.pleasantness}
          detail={
            reading.active === 0
              ? 'Nothing unfinished, so nothing can be late.'
              : `Of ${reading.active} unfinished, ${reading.overdue} overdue and ${reading.soon} due soon. A task that is done cannot be late, however long it sat.`
          }
        />
      </div>

      <p className="mt-5 font-mono text-xs text-text-muted">
        Whole project — the milestone tab and sprint filter do not change it.
      </p>
    </dialog>
  );
}
