"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const AudioProcessor = () => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [harmonyAudioUrl, setHarmonyAudioUrl] = useState<string | null>(null);
  const harmonyAudioRef = useRef<HTMLAudioElement | null>(null);

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
        const { default: Jungle } = await import("../../lib/jungle.mjs");
        const response = await fetch("/audio/anthem.mp3");
        // response를 ArrayBuffer로 변환
        const arrayBuffer = await response.arrayBuffer();
        // ArrayBuffer로 변환된 오디오 데이터를 AudioBuffer로 디코딩
        const audioBuffer = await audioContext?.decodeAudioData(arrayBuffer);

        // 3도 화음 추가
        const harmonyBuffer = await createHarmony(audioBuffer, Jungle);

        // 생성된 오디오 URL 설정
        const harmonyBlob = await audioBufferToBlob(harmonyBuffer);
        const harmonyUrl = URL.createObjectURL(harmonyBlob);
        setHarmonyAudioUrl(harmonyUrl);

        // Harmony 오디오 URL을 <audio> 요소에 적용
        if (harmonyAudioRef.current) {
          harmonyAudioRef.current.src = harmonyUrl;
        }
      } catch (error) {
        console.error(error);
      }
    };

    processAudio();
  }, [audioContext]);

  // Jungle 모듈을 사용해 3도 화음 생성
  const createHarmony = async (buffer: AudioBuffer, Jungle: any) => {
    if (!audioContext) return buffer;

    // 오디오 렌더링을 위한 offlineAudioContext 생성
    const offlineContext = new OfflineAudioContext(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    const source = offlineContext.createBufferSource(); // 오디오 렌더링 노드 생성
    source.buffer = buffer;

    const jungle = new Jungle(offlineContext);
    jungle.setPitchOffset(0.3);

    source.connect(jungle.input);
    jungle.output.connect(offlineContext.destination);

    // 재생 시작
    source.start();

    return offlineContext.startRendering();
  };

  const audioBufferToBlob = async (buffer: AudioBuffer): Promise<Blob> => {
    const wavData = encodeWAV(buffer); // WAV 포맷으로 인코딩
    const audioBlob = new Blob([wavData], { type: "audio/wav" }); // Blob으로 변환하여 반환
    return audioBlob;
  };

  // WAV 파일 포맷으로 인코딩하는 함수
  const encodeWAV = (buffer: AudioBuffer) => {
    const numOfChan = buffer.numberOfChannels; // 오디오 채널 수
    const length = buffer.length * numOfChan * 2 + 44; // WAV 파일 길이 (헤더 44바이트 + 오디오 데이터 크기)
    const rate = buffer.sampleRate; // 샘플링 주파수
    const channels = buffer.numberOfChannels; // 오디오 채널 수
    const sampleRate = buffer.sampleRate; // 샘플링 주파수
    const bitsPerSample = 16; // 샘플당 비트 수

    const view = new DataView(new ArrayBuffer(length)); // 메모리 공간을 확보하여 데이터로 접근
    let offset = 0; // 메모리 위치

    // 문자열을 DataView에 기록하는 함수
    const writeString = (str: string) => {
      // 문자열을 8비트로 기록
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset++, str.charCodeAt(i));
      }
    };

    // 32비트 정수를 DataView에 기록하는 함수
    const writeUint32 = (value: number) => {
      view.setUint32(offset, value, true);
      offset += 4; // 오프셋을 4바이트 이동
    };

    // 16비트 정수를 DataView에 기록하는 함수
    const writeUint16 = (value: number) => {
      view.setUint16(offset, value, true);
      offset += 2; // 오프셋을 2바이트 이동
    };

    // RIFF chunk descriptor : 파일 기본 정보
    writeString("RIFF"); // RIFF : 파일의 시작을 알리는 마커. WAV 파일이 맞는지 확인
    writeUint32(length - 8); // [파일의 전체 크기 - RIFF 단어와 크기를 나타내는 필드(8바이트)]
    writeString("WAVE"); // 파일 형식 표시

    // fmt sub-chunk : 오디오 형식 정보
    writeString("fmt "); // 오디오 데이터의 형식을 설명하는 정보를 시작하는 마커
    writeUint32(16); // 오디오 형식을 설명하는 데 필요한 데이터의 크기
    writeUint16(1); // 오디오 포맷이 PCM(일반적인 비압축 오디오 형식)이라는 것을 의미
    writeUint16(channels); // 오디오가 구성된 채널 개수
    writeUint32(sampleRate); // 초당 샘플링된 횟수
    writeUint32((sampleRate * channels * bitsPerSample) / 8); // 초당 바이트 수
    writeUint16((channels * bitsPerSample) / 8); // 오디오 데이터가 몇 바이트씩 나뉘어 저장되는지
    writeUint16(bitsPerSample); // 샘플 하나당 몇 비트로 기록되었는지

    // data sub-chunk : 오디오 데이터 정보
    writeString("data"); // 실제 오디오 데이터가 시작된다는 마커
    writeUint32(length - offset - 44); // 오디오 데이터의 크기. [전체 파일 길이 - 지금까지 기록된 헤더 부분(44바이트)]

    // 오디오 데이터 저장할 배열 생성
    const interleaved = new Float32Array(buffer.length * channels);
    // 각 채널의 오디오 데이터를 interleaved 배열에 설정
    for (let i = 0; i < channels; i++) {
      interleaved.set(buffer.getChannelData(i), i * buffer.length);
    }

    // 16비트 PCM 형식으로 변환할 배열 생성
    const samples = new Int16Array(interleaved.length);
    // Float32 데이터를 16비트 PCM 형식으로 변환
    for (let i = 0; i < interleaved.length; i++) {
      samples[i] = Math.min(1, Math.max(-1, interleaved[i])) * 0x7fff;
    }

    // 변환된 16비트 PCM 데이터를 DataView에 기록
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset, samples[i], true); // 오디오 데이터를 16비트 정수로 DataView에 저장
      offset += 2;
    }

    return view.buffer;
  };
  return (
    <>
      <div>
        <h2>Original</h2>
        <audio ref={audioElementRef} controls>
          <source src="/audio/anthem.mp3" type="audio/mpeg" />
        </audio>
      </div>
      <div>
        <h2>Harmony (3rd Interval)</h2>
        {harmonyAudioUrl && (
          <audio ref={harmonyAudioRef} controls src={harmonyAudioUrl}></audio>
        )}
      </div>
    </>
  );
};

export default dynamic(() => Promise.resolve(AudioProcessor), { ssr: false });
