'use client';

import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { Map as KakaoMapBase, useKakaoLoader } from 'react-kakao-maps-sdk';

const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? '';

type KakaoMapPropsT = ComponentProps<typeof KakaoMapBase>;

/**
 * 카카오맵 SDK를 불러온 뒤 지도를 그린다.
 * 키가 없거나 도메인이 등록되지 않았으면 안내 문구를 대신 보여준다.
 */
export default function KakaoMap(props: KakaoMapPropsT) {
  // 키 없이 SDK를 부르면 401 재시도가 반복되므로 키가 있을 때만 로더를 쓴다
  if (!KAKAO_MAP_KEY) {
    return (
      <MapNotice className={props.className} message="NEXT_PUBLIC_KAKAO_MAP_KEY 가 없습니다" />
    );
  }

  return <LoadedKakaoMap {...props} />;
}

function LoadedKakaoMap({ className, ...props }: KakaoMapPropsT) {
  const [isLoading, error] = useKakaoLoader({ appkey: KAKAO_MAP_KEY });

  if (error) {
    return (
      <MapNotice
        className={className}
        message="카카오맵을 불러오지 못했습니다 (키·도메인 등록 확인)"
      />
    );
  }
  if (isLoading) return <MapNotice className={className} message="지도를 불러오는 중" />;

  return <KakaoMapBase className={className} {...props} />;
}

function MapNotice({ className, message }: { className?: string; message: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl border bg-muted text-sm text-muted-foreground',
        className
      )}
    >
      {message}
    </div>
  );
}
