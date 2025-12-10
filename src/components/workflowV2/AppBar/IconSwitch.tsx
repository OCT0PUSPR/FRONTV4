import { ReactNode } from 'react';
import './IconSwitch.css';

type IconSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: ReactNode;
  IconChecked: ReactNode;
  variant?: 'primary' | 'secondary';
  title?: string;
};

export const IconSwitch = ({
  checked,
  onChange,
  icon,
  IconChecked,
  variant = 'primary',
  title,
}: IconSwitchProps) => {
  return (
    <button
      className={`icon-switch ${variant} ${checked ? 'checked' : ''}`}
      onClick={() => onChange(!checked)}
      title={title}
      type="button"
    >
      <div className="icon-switch-track">
        <div className="icon-switch-thumb">
          {checked ? IconChecked : icon}
        </div>
      </div>
    </button>
  );
};


