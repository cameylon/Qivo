export class AudioUtils {
  /**
   * Convert audio blob to ArrayBuffer
   */
  static async blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * Convert ArrayBuffer to Uint8Array
   */
  static arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array {
    return new Uint8Array(buffer);
  }

  /**
   * Get supported audio MIME types for MediaRecorder
   */
  static getSupportedMimeTypes(): string[] {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg',
    ];

    return types.filter(type => MediaRecorder.isTypeSupported(type));
  }

  /**
   * Get optimal audio recording constraints
   */
  static getOptimalAudioConstraints(): MediaStreamConstraints {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: { ideal: 16000 }, // Lower sample rate for faster processing
        channelCount: { ideal: 1 }, // Mono
      },
    };
  }

  /**
   * Calculate audio level from frequency data
   */
  static calculateAudioLevel(dataArray: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return (sum / dataArray.length) / 255;
  }

  /**
   * Format duration in MM:SS format
   */
  static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if browser supports required audio APIs
   */
  static checkBrowserSupport(): {
    mediaRecorder: boolean;
    audioContext: boolean;
    getUserMedia: boolean;
    webSocket: boolean;
  } {
    return {
      mediaRecorder: typeof MediaRecorder !== 'undefined',
      audioContext: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined',
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      webSocket: typeof WebSocket !== 'undefined',
    };
  }

  /**
   * Request microphone permissions
   */
  static async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * Get audio input devices
   */
  static async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Failed to get audio devices:', error);
      return [];
    }
  }
}
