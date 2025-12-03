import { Blob } from '@google/genai';

export const AUDIO_SAMPLE_RATE_INPUT = 24000;
export const AUDIO_SAMPLE_RATE_OUTPUT = 24000;

export const createAudioContext = (options: AudioContextOptions): AudioContext => {
  return new (window.AudioContext || (window as any).webkitAudioContext)(options);
};

export function createBlob(data: Float32Array): Blob {
  // Validate input
  if (!data || data.length === 0) {
    throw new Error("Audio data is empty");
  }

  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] before converting to Int16 to avoid overflow artifacts
    // Also check for NaN which can happen if audio context is in a weird state
    let s = data[i];
    if (isNaN(s)) s = 0;
    
    s = Math.max(-1, Math.min(1, s));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const uint8 = new Uint8Array(int16.buffer);
  
  // Custom binary to base64 encoding
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64Data = btoa(binary);

  return {
    data: base64Data,
    mimeType: 'audio/pcm;rate=24000',
  };
}

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}