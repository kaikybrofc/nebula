import ActionButtons from './ActionButtons';
import Joystick from './Joystick';
import { MOVE_CONFIG } from '../../shared/config';

export default function MobileControls({
  onDirectionChange,
  onSplit,
  onSplitChange,
  onEjectChange,
  compact = false,
}) {
  const joystickSize = compact ? 112 : 120;
  const joystickStickSize = compact ? 56 : 60;
  const splitSize = compact ? 70 : 76;
  const ejectSize = compact ? 60 : 66;

  return (
    <>
      <div className="mobile-joystick">
        <Joystick
          size={joystickSize}
          stickSize={joystickStickSize}
          deadzone={MOVE_CONFIG.joystickDeadzone}
          smoothing={MOVE_CONFIG.joystickSmoothing}
          onDirectionChange={onDirectionChange}
        />
      </div>
      <div className="mobile-actions">
        <ActionButtons
          size={splitSize}
          splitSize={splitSize}
          ejectSize={ejectSize}
          compact
          onSplit={onSplit}
          onSplitChange={onSplitChange}
          onEjectChange={onEjectChange}
        />
      </div>
    </>
  );
}
