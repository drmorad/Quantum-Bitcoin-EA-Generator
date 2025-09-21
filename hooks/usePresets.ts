
import { useState, useEffect, useCallback, useRef } from 'react';
// FIX: Use explicit file extension for imports
import type { EAConfig, Presets } from '../types.ts';

const PRESETS_STORAGE_KEY = 'mql5-ea-presets';

/**
 * A custom hook to manage EA configuration presets, including saving,
 * loading, deleting, and persisting to localStorage.
 * @param defaultPresets The default set of presets to use if none are in storage.
 */
export const usePresets = (defaultPresets: Presets) => {
  const [presets, setPresets] = useState<Presets>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [newPresetName, setNewPresetName] = useState<string>('');
  const isInitialMount = useRef(true);

  // Effect to load presets from localStorage on initial render
  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (savedPresets && savedPresets !== '{}') {
        setPresets(JSON.parse(savedPresets));
      } else {
        // If no presets are saved, just load the defaults into state.
        // The persistence effect below will handle saving them.
        setPresets(defaultPresets);
      }
    } catch (error) {
      console.error("Failed to load or parse presets from localStorage:", error);
      // Fallback to default presets if localStorage is corrupted or inaccessible
      setPresets(defaultPresets);
    }
  }, [defaultPresets]);

  // Automatically save presets to localStorage whenever the state changes.
  useEffect(() => {
    // We use a ref to skip the very first render, preventing an empty
    // object from overwriting stored presets before they are loaded.
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error("Failed to save presets to localStorage:", error);
    }
  }, [presets]);

  /**
   * Saves the current configuration as a new preset.
   */
  const savePreset = useCallback((name: string, config: EAConfig) => {
    if (!name.trim()) {
      alert("Please enter a name for the preset.");
      return;
    }
    const updatedPresets = { ...presets, [name]: config };
    setPresets(updatedPresets);
    setSelectedPreset(name);
    setNewPresetName('');
  }, [presets]);

  /**
   * Loads a preset configuration by name.
   * @returns The loaded EAConfig or null if not found.
   */
  const loadPreset = useCallback((name: string): EAConfig | null => {
    setSelectedPreset(name);
    if (presets[name]) {
      return presets[name];
    }
    return null;
  }, [presets]);

  /**
   * Deletes the currently selected preset after user confirmation.
   */
  const deletePreset = useCallback(() => {
    if (!selectedPreset || !presets[selectedPreset]) return;

    const isConfirmed = window.confirm(`Are you sure you want to delete the "${selectedPreset}" preset? This cannot be undone.`);
    if (!isConfirmed) {
      return;
    }

    const { [selectedPreset]: _, ...remainingPresets } = presets;
    setPresets(remainingPresets);
    setSelectedPreset('');
  }, [presets, selectedPreset]);

  return {
    presets,
    selectedPreset,
    newPresetName,
    setNewPresetName,
    setSelectedPreset,
    savePreset,
    loadPreset,
    deletePreset,
  };
};
