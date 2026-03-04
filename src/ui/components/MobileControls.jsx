import ActionButtons from './ActionButtons';
import Joystick from './Joystick';

export default function MobileControls({ onDirectionChange, onSplit, onEjectChange }) {
  return (
    <>
      <div className="mobile-joystick">
        <Joystick size={140} stickSize={70} onDirectionChange={onDirectionChange} />
      </div>
      <div className="mobile-actions">
        <ActionButtons size={72} onSplit={onSplit} onEjectChange={onEjectChange} />
      </div>
    </>
  );
}
