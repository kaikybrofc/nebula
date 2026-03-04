import { EjectIcon, SplitIcon } from './IconPack';

function startPointerHold(event, onStart) {
  if (event.pointerId !== undefined && event.currentTarget.setPointerCapture) {
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  onStart();
}

function endPointerHold(event, onEnd) {
  if (event.pointerId !== undefined && event.currentTarget.releasePointerCapture) {
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore stale capture release when pointer was already cancelled.
    }
  }

  onEnd();
}

export default function ActionButtons({
  size = 56,
  splitSize = size,
  ejectSize = size,
  compact = false,
  onSplit,
  onEjectChange,
}) {
  return (
    <div
      className={`action-buttons ${compact ? 'is-compact' : ''}`.trim()}
      style={{
        '--action-size': `${size}px`,
        '--split-size': `${splitSize}px`,
        '--eject-size': `${ejectSize}px`,
      }}
    >
      <button
        type="button"
        className="action-btn split-btn"
        onClick={onSplit}
        aria-label="Split"
      >
        <SplitIcon />
      </button>

      <button
        type="button"
        className="action-btn eject-btn"
        aria-label="Eject"
        onPointerDown={(event) => startPointerHold(event, () => onEjectChange(true))}
        onPointerUp={(event) => endPointerHold(event, () => onEjectChange(false))}
        onPointerCancel={(event) => endPointerHold(event, () => onEjectChange(false))}
        onPointerLeave={(event) => endPointerHold(event, () => onEjectChange(false))}
      >
        <EjectIcon />
      </button>
    </div>
  );
}
