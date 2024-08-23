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
    if (!audioContext) return;

    const processAudio = async () => {
      try {
        const response = await fetch("/audio/anthem.mp3");
        // response를 ArrayBuffer로 변환
        const arrayBuffer = await response.arrayBuffer();
        // ArrayBuffer로 변환된 오디오 데이터를 AudioBuffer로 디코딩
        const audioBuffer = await audioContext?.decodeAudioData(arrayBuffer);

        // 왜곡 효과 적용
        const distortedBuffer = applyDistortion(audioBuffer);
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

    // 왜곡 곡선 생성
    const curve = new Float32Array(44100);
    for (let i = 0; i < 44100; i++) {
      const x = (i * 2) / 44100 - 1;
      curve[i] = (3 + x * 3) / (3 + Math.abs(x));
    }
    distortion.curve = curve; // 왜곡된 곡선을 입력신호에 설정
    distortion.oversample = "4x"; // 왜곡 품질 향상

    const source = audioContext.createBufferSource(); // 오디오 재생 노드 생성
    source.buffer = buffer;

    // 오디오 노드(재생) -> 왜곡 노드(왜곡) -> 볼륨 노드(볼륨조절) -> 출력 노드
    source.connect(distortion);
    distortion.connect(gain);
    gain.connect(audioContext.destination);

    return buffer;
  };

  const audioBufferToBlob = async (buffer: AudioBuffer) => {
    // 오디오 렌더링을 위한 offlineAudioContext 생성
    const offlineContext = new OfflineAudioContext(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    const source = offlineContext.createBufferSource(); // 오디오 렌더링 노드 생성
    source.buffer = buffer;

    // 오디오 노드(렌더링) -> 출력 노드 연결
    source.connect(offlineContext.destination);

    // 재생 시작
    source.start();

    const renderBuffer = await offlineContext.startRendering(); // 렌더링된 오디오 데이터 버퍼로 반환
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
