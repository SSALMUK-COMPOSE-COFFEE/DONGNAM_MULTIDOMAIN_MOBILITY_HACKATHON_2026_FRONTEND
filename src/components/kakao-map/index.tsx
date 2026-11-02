'use client';

import { cn } from 'cn';
import { type ComponentProps, useLayoutEffect, useState } from 'react';
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
      <MapNotice
        className={props.className}
        message="카카오맵 키(NEXT_PUBLIC_KAKAO_MAP_KEY)가 없습니다."
      />
    );
  }

  return <LoadedKakaoMap {...props} />;
}

function LoadedKakaoMap({ className, ...props }: KakaoMapPropsT) {
  const [isLoading, error] = useKakaoLoader({ appkey: KAKAO_MAP_KEY });

  /**
   * 다른 화면으로 가면 Next 가 이 화면을 숨긴 채 남겨 두고(Activity) effect 를 정리한다.
   * 그때 지도 DOM 이 비워지는데, 다시 보일 때 경로선·이름표가 비워진 옛 지도에 붙으려다
   * 카카오 내부 insertBefore 오류가 났다. 숨겨지면 지도를 내리고, 보일 때 새로 만든다
   */
  const [isVisible, setIsVisible] = useState(false);
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => {
      cancelAnimationFrame(frame);
      setIsVisible(false);
    };
  }, []);

  if (error) {
    return (
      <MapNotice
        className={className}
        message="카카오맵을 불러오지 못했습니다. 키와 도메인 등록을 확인하세요."
      />
    );
  }
  if (isLoading || !isVisible) {
    return <MapNotice className={className} message="지도를 불러오는 중" />;
  }

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
