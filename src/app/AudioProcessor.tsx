"use client";

import { useEffect, useRef, useState } from "react";

const AudioProcessor = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  // const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const [frequency, setFrequency] = useState(1000);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // 오디오 처리 초기화
    const initAudio = async () => {
      const audioContext = new AudioContext(); // Web Audio API 기능에 접근하기 위해 인스턴스 생성
      audioContextRef.current = audioContext as AudioContext; // useRef에 저장

      if (audioElementRef.current) {
        // 오디오 데이터를 오디오 노드로 변환
        const sourceNode = audioContext.createMediaElementSource(
          audioElementRef.current
        );
        // 변환한 오디오 데이터 노드 소스로 저장
        sourceNodeRef.current = sourceNode;

        const filterNode = audioContext.createBiquadFilter(); // BiquadFilterNode 생성
        filterNode.type = "lowpass"; // 필터 유형 설정 - 저역 필터
        filterNode.frequency.setValueAtTime(
          frequency,
          audioContext.currentTime
        ); // 초기 필터 주파수 설정
        filterNodeRef.current = filterNode; // useRef에 저장

        // microphoneRef.current.connect(filterNode); // 마이크 입력을 필터에 연결
        sourceNode.connect(filterNode); // 오디오 데이터 필터에 연결
        filterNode.connect(audioContext.destination); // 필터를 오디오 출력에 연결
      }

      // const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); // 마이크 스트림 얻기
      // microphoneRef.current = audioContext.createMediaStreamSource(stream); // 얻은 스트림을 오디오 컨텍스트에 전달
    };

    initAudio();
  }, [isProcessing, frequency]);
  return (
    <>
      <audio
        src="/audio/anthem.mp3"
        controls
        onPlay={() => setIsProcessing(true)}
        onPause={() => setIsProcessing(false)}
      ></audio>
      {/* <button onClick={() => setIsProcessing(true)}>Start</button>
      <button onClick={() => setIsProcessing(false)}>Stop</button> */}
      <input
        type="range"
        min="100"
        max="5000"
        value={frequency}
        placeholder="input"
        onChange={(e) => setFrequency(Number(e.target.value))}
      />
      <label>
        Frequency: <span>{frequency}</span> Hz
      </label>
    </>
  );
};

export default AudioProcessor;
