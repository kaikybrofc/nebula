import { useCallback, useEffect, useRef } from 'react';
import { MOVE_CONFIG } from '../../shared/config';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, alpha) {
  return start + (end - start) * alpha;
}

export default function Joystick({
  size = 140,
  stickSize = 70,
  deadzone = MOVE_CONFIG.joystickDeadzone,
  smoothing = MOVE_CONFIG.joystickSmoothing,
  onDirectionChange,
}) {
  const baseRef = useRef(null);
  const stickRef = useRef(null);
  const activePointerIdRef = useRef(null);

  const centerRef = useRef({ x: 0, y: 0 });
  const maxDistanceRef = useRef(Math.max(1, (size - stickSize) * 0.5));

  const targetDirRef = useRef({ x: 0, y: 0 });
  const smoothDirRef = useRef({ x: 0, y: 0 });
  const lastSentDirRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(null);

  const updateGeometry = useCallback(() => {
    const base = baseRef.current;

    if (!base) {
      return;
    }

    const rect = base.getBoundingClientRect();
    centerRef.current.x = rect.left + rect.width * 0.5;
    centerRef.current.y = rect.top + rect.height * 0.5;
    maxDistanceRef.current = Math.max(1, Math.min(rect.width, rect.height) * 0.5 - stickSize * 0.5);
  }, [stickSize]);

  function setTargetDirectionFromPointer(clientX, clientY) {
    const maxDistance = maxDistanceRef.current;
    const rawX = clientX - centerRef.current.x;
    const rawY = clientY - centerRef.current.y;
    const distance = Math.hypot(rawX, rawY);

    let clampedX = rawX;
    let clampedY = rawY;

    if (distance > maxDistance && distance > 0.0001) {
      const ratio = maxDistance / distance;
      clampedX *= ratio;
      clampedY *= ratio;
    }

    const normalizedX = clamp(clampedX / maxDistance, -1, 1);
    const normalizedY = clamp(clampedY / maxDistance, -1, 1);
    const magnitude = Math.hypot(normalizedX, normalizedY);

    if (magnitude <= deadzone) {
      targetDirRef.current.x = 0;
      targetDirRef.current.y = 0;
      return;
    }

    const normalizedMagnitude = clamp((magnitude - deadzone) / (1 - deadzone), 0, 1);
    const dirX = normalizedX / magnitude;
    const dirY = normalizedY / magnitude;

    targetDirRef.current.x = dirX * normalizedMagnitude;
    targetDirRef.current.y = dirY * normalizedMagnitude;
  }

  function releaseJoystick() {
    activePointerIdRef.current = null;
    targetDirRef.current.x = 0;
    targetDirRef.current.y = 0;
  }

  function handlePointerDown(event) {
    if (activePointerIdRef.current !== null) {
      return;
    }

    const base = baseRef.current;

    if (!base) {
      return;
    }

    activePointerIdRef.current = event.pointerId;
    targetDirRef.current.x = 0;
    targetDirRef.current.y = 0;
    smoothDirRef.current.x = 0;
    smoothDirRef.current.y = 0;

    if (base.setPointerCapture) {
      base.setPointerCapture(event.pointerId);
    }

    updateGeometry();
    setTargetDirectionFromPointer(event.clientX, event.clientY);
  }

  function handlePointerMove(event) {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    setTargetDirectionFromPointer(event.clientX, event.clientY);
  }

  function handlePointerUp(event) {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    const base = baseRef.current;

    if (base && base.releasePointerCapture) {
      try {
        base.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore release errors when capture was already lost.
      }
    }

    releaseJoystick();
  }

  useEffect(() => {
    updateGeometry();
    window.addEventListener('resize', updateGeometry);

    return () => {
      window.removeEventListener('resize', updateGeometry);
    };
  }, [updateGeometry]);

  useEffect(() => {
    function animate() {
      const target = targetDirRef.current;
      const smooth = smoothDirRef.current;
      const alpha = clamp(smoothing, 0.01, 1);

      smooth.x = lerp(smooth.x, target.x, alpha);
      smooth.y = lerp(smooth.y, target.y, alpha);

      if (Math.abs(target.x) < 0.0001 && Math.abs(smooth.x) < 0.0001) {
        smooth.x = 0;
      }

      if (Math.abs(target.y) < 0.0001 && Math.abs(smooth.y) < 0.0001) {
        smooth.y = 0;
      }

      const stick = stickRef.current;

      if (stick) {
        const maxDistance = maxDistanceRef.current;
        stick.style.transform = `translate(${smooth.x * maxDistance}px, ${smooth.y * maxDistance}px)`;
      }

      const lastSent = lastSentDirRef.current;
      const changedEnough = Math.abs(lastSent.x - smooth.x) > 0.001 || Math.abs(lastSent.y - smooth.y) > 0.001;

      if (changedEnough) {
        lastSent.x = smooth.x;
        lastSent.y = smooth.y;
        onDirectionChange(smooth.x, smooth.y);
      }

      frameRef.current = requestAnimationFrame(animate);
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      onDirectionChange(0, 0);
    };
  }, [onDirectionChange, smoothing]);

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
          transform: 'translate(0px, 0px)',
        }}
      />
    </div>
  );
}
