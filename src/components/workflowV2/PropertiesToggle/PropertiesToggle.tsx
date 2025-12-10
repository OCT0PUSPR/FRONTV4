import { SlidersHorizontal } from 'lucide-react';
import './PropertiesToggle.css';

type PropertiesToggleProps = {
  onClick: () => void;
  isVisible: boolean;
};

export const PropertiesToggle = ({ onClick, isVisible }: PropertiesToggleProps) => {
  return (
    <button
      onClick={onClick}
      className={`properties-toggle ${isVisible ? 'visible' : ''}`}
      title={isVisible ? 'Hide Properties' : 'Show Properties'}
    >
      <SlidersHorizontal size={18} />
    </button>
  );
};


