"use client";

import { useEffect, useRef, useState } from "react";

const AudioProcessor = () => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 오디오 처리 초기화
    const initAudio = async () => {
      const context = new AudioContext(); // Web Audio API 기능에 접근하기 위해 인스턴스 생성
      setAudioContext(context);
    };

    initAudio();
  }, []);

  useEffect(() => {
    const processAudio = async () => {
      try {
        const response = await fetch("/audio/anthem.mp3");
        // response를 ArrayBuffer로 변환
        const arrayBuffer = await response.arrayBuffer();
        // ArrayBuffer로 변환된 오디오 데이터를 AudioBuffer로 디코딩
        const audioBuffer = await audioContext?.decodeAudioData(arrayBuffer);
      } catch (error) {
        console.error(error);
      }
    };

    processAudio();
  }, [audioContext]);

  const applyDistortion = (buffer: AudioBuffer) => {
    if (!audioContext) return buffer;

    const distortion = audioContext.createWaveShaper(); // 왜곡효과 적용하는 node 생성
    const gain = audioContext.createGain(); // 볼륨조절 node 생성
  };
  return (
    <>
      <div>
        <h2>Original</h2>
        <audio ref={audioElementRef} controls>
          <source src="/audio/anthem.mp3" type="audio/mpeg" />
        </audio>
      </div>
      <div></div>
    </>
  );
};

export default AudioProcessor;
