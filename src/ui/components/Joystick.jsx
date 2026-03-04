import { useEffect, useRef } from 'react';

export default function Joystick({
  size = 140,
  stickSize = 70,
  onDirectionChange,
}) {
  const baseRef = useRef(null);
  const stickRef = useRef(null);
  const pointerIdRef = useRef(null);
  const centerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    return () => {
      onDirectionChange(0, 0);
    };
  }, [onDirectionChange]);

  function resetStick() {
    const stick = stickRef.current;

    if (stick) {
      stick.style.transform = 'translate(0px, 0px)';
    }

    onDirectionChange(0, 0);
  }

  function handlePointerDown(event) {
    if (pointerIdRef.current !== null) {
      return;
    }

    const base = baseRef.current;

    if (!base) {
      return;
    }

    pointerIdRef.current = event.pointerId;
    if (base.setPointerCapture) {
      base.setPointerCapture(event.pointerId);
    }

    const rect = base.getBoundingClientRect();
    centerRef.current = {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.5,
    };

    handlePointerMove(event);
  }

  function handlePointerMove(event) {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    const stick = stickRef.current;

    if (!stick) {
      return;
    }

    const maxDistance = (size - stickSize) * 0.5;
    const dx = event.clientX - centerRef.current.x;
    const dy = event.clientY - centerRef.current.y;
    const distance = Math.hypot(dx, dy);

    let clampedX = dx;
    let clampedY = dy;

    if (distance > maxDistance && distance > 0) {
      const ratio = maxDistance / distance;
      clampedX *= ratio;
      clampedY *= ratio;
    }

    stick.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    onDirectionChange(clampedX / maxDistance, clampedY / maxDistance);
  }

  function handlePointerUp(event) {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    const base = baseRef.current;
    if (base && base.releasePointerCapture) {
      try {
        base.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore capture errors when pointer was already released.
      }
    }

    pointerIdRef.current = null;
    resetStick();
  }

  return (
    <div
      ref={baseRef}
      className="joystick-base"
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        ref={stickRef}
        className="joystick-stick"
        style={{
          width: `${stickSize}px`,
          height: `${stickSize}px`,
        }}
      />
    </div>
  );
}
