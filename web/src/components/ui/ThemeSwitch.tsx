'use client';

import { useRef, useEffect } from 'react';

interface ThemeSwitchProps {
  isDark: boolean;
  onToggle: () => void;
}

export function ThemeSwitch({ isDark, onToggle }: ThemeSwitchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync the DOM checkbox state whenever the parent prop changes,
  // without making it a controlled input (so :checked CSS works natively).
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.checked = isDark;
    }
  }, [isDark]);

  return (
    <label className="theme-switch" aria-label="Toggle theme">
      {/* Uncontrolled checkbox — browser :checked drives all CSS transitions */}
      <input
        ref={inputRef}
        type="checkbox"
        className="theme-switch__checkbox"
        defaultChecked={isDark}
        onChange={onToggle}
      />

      <div className="theme-switch__container">
        {/* Clouds (day) */}
        <div className="theme-switch__clouds" />

        {/* Stars (night) */}
        <div className="theme-switch__stars-container">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133.001 4.32401C135.209 4.75447 136.944 5.89783 138.207 7.75407C138.967 5.92466 140.15 4.61768 141.757 3.83308C139.802 3.12159 138.38 1.90466 137.49 0.186771C137.041 1.06038 136.444 1.87586 135.831 3.00688ZM0.523438 0C0.523438 0 2.76962 9.50532 0.523438 16.4914C2.76962 13.8458 5.65231 12.3408 9.17157 12.0264C5.65231 11.7119 2.76962 10.2069 0.523438 7.5613C0.523438 7.5613 0.523438 3.9991 0.523438 0ZM83.1627 6.69678C82.4251 7.49308 81.5476 7.90789 80.5215 7.94016C82.5551 8.3293 84.0797 9.36633 85.1957 11.0488C85.8988 9.4091 86.9623 8.22859 88.3778 7.5238C86.6475 6.88787 85.3592 5.79788 84.5448 4.25283C84.1477 5.04133 83.6183 5.79788 83.1627 6.69678ZM15.1098 10.651C15.1098 10.651 16.8965 18.0085 15.1098 24.0396C17.0367 21.6822 19.5359 20.3648 22.6073 20.0855C19.5359 19.8063 17.0367 18.489 15.1098 16.1315C15.1098 16.1315 15.1098 13.144 15.1098 10.651Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Circle container (sun/moon) */}
        <div className="theme-switch__circle-container">
          <div className="theme-switch__sun-moon-container">
            <div className="theme-switch__moon">
              <div className="theme-switch__spot" />
              <div className="theme-switch__spot" />
              <div className="theme-switch__spot" />
            </div>
          </div>
        </div>

        {/* Night extras */}
        <div className="theme-switch__shooting-star" />
        <div className="theme-switch__shooting-star-2" />
        <div className="theme-switch__meteor" />

        <div className="theme-switch__stars-cluster">
          <div className="star" />
          <div className="star" />
          <div className="star" />
          <div className="star" />
          <div className="star" />
        </div>

        <div className="theme-switch__aurora" />

        <div className="theme-switch__comets">
          <div className="comet" />
          <div className="comet" />
        </div>
      </div>

    </label>
  );
}
