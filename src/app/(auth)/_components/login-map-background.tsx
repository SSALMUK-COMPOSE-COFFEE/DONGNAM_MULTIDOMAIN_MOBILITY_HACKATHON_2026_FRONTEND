'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Map, useKakaoLoader } from 'react-kakao-maps-sdk';

const MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? '';
const CENTER = { lat: 35.34, lng: 129.19 };

export function LoginMapBackground() {
  if (!MAP_KEY) return null;

  return <LoadedLoginMap />;
}

function LoadedLoginMap() {
  const [isLoading, error] = useKakaoLoader({ appkey: MAP_KEY });
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));

    return () => {
      cancelAnimationFrame(frame);
      setVisible(false);
      setReady(false);
      setMap(null);
    };
  }, []);

  useEffect(() => {
    if (!map || !visible || !containerRef.current) return;
    const fit = () => {
      map.relayout();
      const width = containerRef.current?.clientWidth ?? window.innerWidth;
      const panel = containerRef.current?.parentElement?.querySelector('.fs-login-panel');
      const panelRight = panel?.getBoundingClientRect().right ?? 0;
      const desktop = width > 760;
      map.setBounds(
        new kakao.maps.LatLngBounds(
          new kakao.maps.LatLng(35.0, 128.9),
          new kakao.maps.LatLng(35.65, 129.5)
        ),
        desktop ? 120 : 24,
        desktop ? 40 : 24,
        desktop ? 40 : 24,
        desktop ? Math.min(Math.ceil(panelRight + 48), width - 280) : 24
      );
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [map, visible]);

  if (isLoading || error || !visible) return null;

  return (
    <div ref={containerRef} className="fs-login-map" data-ready={ready} aria-hidden inert>
      <Map
        center={CENTER}
        level={11}
        className="fs-login-map-canvas"
        draggable={false}
        zoomable={false}
        scrollwheel={false}
        disableDoubleClick
        disableDoubleClickZoom
        keyboardShortcuts={false}
        tileAnimation={false}
        onCreate={setMap}
        onTileLoaded={() => setReady(true)}
      />
      <div className="fs-login-map-veil" />
    </div>
  );
}
