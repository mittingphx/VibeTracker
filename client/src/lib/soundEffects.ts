// Sound effect URLs
const SOUND_URLS = {
  ready: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3", // Notification sound
  alert: "https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3", // Error/alert sound
  success: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3", // Success sound
};

// Cache for audio elements
const audioCache: Record<string, HTMLAudioElement> = {};

/**
 * Plays a sound effect
 * @param soundName - Name of the sound to play (ready, alert, success)
 */
export function playSound(soundName: keyof typeof SOUND_URLS): void {
  try {
    // Check if sound is supported
    if (typeof Audio === "undefined") {
      console.warn("Audio not supported in this environment");
      return;
    }

    // Create or retrieve cached audio element
    if (!audioCache[soundName]) {
      audioCache[soundName] = new Audio(SOUND_URLS[soundName]);
    }

    const audio = audioCache[soundName];

    // Reset and play
    audio.currentTime = 0;
    audio.play().catch(err => {
      console.warn(`Error playing sound '${soundName}':`, err);
    });
  } catch (error) {
    console.error("Error in playSound:", error);
  }
}

/**
 * Preloads all sound effects to avoid delay on first play
 */
export function preloadSounds(): void {
  try {
    if (typeof Audio === "undefined") return;
    
    Object.entries(SOUND_URLS).forEach(([name, url]) => {
      audioCache[name] = new Audio(url);
      // Just load it, don't play
      audioCache[name].load();
    });
  } catch (error) {
    console.error("Error preloading sounds:", error);
  }
}

// Preload sounds when this module is imported
preloadSounds();
