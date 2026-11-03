'use client';

import { cn } from 'cn';
import {
  type CSSProperties,
  type ComponentProps,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react';
import { Polyline, useMap } from 'react-kakao-maps-sdk';

import KakaoMap from '@/components/kakao-map';
import {
  M2_COLORS,
  type MapSceneT,
  type ScenePlaceT,
  type SceneRunT,
} from '@/components/map-hero/scene';
import { keysOverlap, useMapLinkState } from '@/components/map-link';
import { SectionErrorBoundary } from '@/components/section-error-boundary';

export {
  CompareBars,
  HeroPanel,
  MapLegend,
  SlotBar,
  Steps,
  type CompareRowT,
  type CompareToneT,
  type HeroPanelPropsT,
  type HeroPanelRowT,
  type MapLegendItemT,
  type MapLegendPropsT,
  type SlotBarPropsT,
  type SlotSegmentT,
  type StepItemT,
  type StepStateT,
} from '@/components/map-hero/parts';
export {
  Timeline,
  timelineFromScene,
  type TimelineBandT,
  type TimelineBarT,
  type TimelineCutT,
  type TimelineDataT,
  type TimelineMarkT,
  type TimelinePropsT,
  type TimelineRowT,
} from '@/components/map-hero/timeline';
export {
  M2_COLORS,
  TONE_COLOR,
  buildPlanScene,
  type MapSceneT,
  type PlanSceneOptionsT,
  type PlanSceneSourceT,
  type SceneAirT,
  type SceneContainerT,
  type ScenePlaceT,
  type ScenePortT,
  type SceneRunT,
  type SceneSeaLaneT,
  type SceneToneT,
} from '@/components/map-hero/scene';

export type MapHeroRunsModeT = 'always' | 'active';
export type PinVariantT = 'fill' | 'ring';

export type MapHeroPropsT = {
  scene: MapSceneT | null;
  height: number;
  panel?: ReactNode;
  legend?: ReactNode;
  hint?: ReactNode;
  footer?: ReactNode;
  fitInsetLeft?: number;
  interactive?: boolean;
  mapId?: string;
  className?: string;
  runsMode?: MapHeroRunsModeT;
  showSeaLane?: boolean;
  showAir?: boolean;
  placeLabel?: (place: ScenePlaceT) => string;
  placeSublabel?: (place: ScenePlaceT) => string;
  placeKeys?: (place: ScenePlaceT) => string[];
  pinText?: (place: ScenePlaceT) => string | null;
  pinVariant?: (place: ScenePlaceT) => PinVariantT;
  runKeys?: (run: SceneRunT) => string[];
  portSublabel?: string | null;
  seaLaneLabel?: string | null;
};

const DEFAULT_CENTER = { lat: 35.6, lng: 128.6 };
const DEFAULT_LEVEL = 11;
const DIM_OPACITY = 0.18;
const LANE_STUB = { lat: -0.3, lng: 0.16 };
const AIR_STUB = { lat: 0.34, lng: -0.3 };

type OverlayKindT = 'pin' | 'port' | 'lane' | 'air';

type OverlaySpecT = {
  id: string;
  kind: OverlayKindT;
  lat: number;
  lng: number;
  emit: string[];
  match: string[];
  name: string;
  sub: string;
  color: string;
  radius: number;
  text: string;
  variant: PinVariantT;
  side: 'left' | 'right';
  base: number;
  zIndex: number;
};

type OverlayEntryT = { element: HTMLElement; match: string[]; base: number };

const opacityFor = (active: string[] | null, match: string[], base: number) => {
  if (active === null) return base;
  if (keysOverlap(match, active)) return 1;

  return base * DIM_OPACITY;
};

const labelSide = (place: ScenePlaceT, places: ScenePlaceT[], portLng: number | null) => {
  const crowdedRight = places.some(
    other =>
      other.key !== place.key &&
      Math.abs(other.lat - place.lat) < 0.12 &&
      other.lon > place.lon &&
      other.lon - place.lon < 0.6
  );
  const farEast = portLng !== null && place.lon - portLng > 0.3;

  return crowdedRight || farEast ? 'left' : 'right';
};

export function MapHero({
  scene,
  height,
  panel,
  legend,
  hint,
  footer,
  fitInsetLeft = 320,
  interactive = true,
  mapId,
  className,
  ...layerOptions
}: MapHeroPropsT) {
  const generatedId = useId();
  const id = mapId ?? `m2-map-${generatedId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <section
      className={cn('m2-card m2-hero', className)}
      style={{ ['--m2-mh' as string]: `${height}px` } as CSSProperties}
    >
      <div className="m2-mapwrap">
        <div className="m2-map m2-map-mono">
          <SectionErrorBoundary
            message="지도를 그리지 못했습니다."
            className="h-full rounded-none border-0"
          >
            <KakaoMap
              id={id}
              center={DEFAULT_CENTER}
              level={DEFAULT_LEVEL}
              draggable={interactive}
              zoomable={interactive}
              scrollwheel={false}
              disableDoubleClickZoom={!interactive}
              className="h-full w-full rounded-none border-0 bg-transparent"
            >
              {scene ? (
                <SceneLayers
                  scene={scene}
                  interactive={interactive}
                  fitInsetLeft={fitInsetLeft}
                  {...layerOptions}
                />
              ) : null}
            </KakaoMap>
          </SectionErrorBoundary>
        </div>
        {panel || legend ? (
          <div className="m2-hov">
            {panel}
            {legend}
          </div>
        ) : null}
        {hint ? <div className="m2-maphint">{hint}</div> : null}
      </div>
      {footer}
    </section>
  );
}

type SceneLayersPropsT = Omit<
  MapHeroPropsT,
  'height' | 'panel' | 'legend' | 'hint' | 'footer' | 'mapId' | 'className' | 'scene'
> & {
  scene: MapSceneT;
  interactive: boolean;
  fitInsetLeft: number;
};

function SceneLayers({
  scene,
  interactive,
  fitInsetLeft,
  runsMode = 'always',
  showSeaLane = true,
  showAir = true,
  placeLabel,
  placeSublabel,
  placeKeys,
  pinText,
  pinVariant,
  runKeys,
  portSublabel,
  seaLaneLabel,
}: SceneLayersPropsT) {
  const { activeKeys, hoverFromMap, focusFromMap } = useMapLinkState();
  const activeString = activeKeys ? activeKeys.join(' ') : null;
  const active = activeString === null ? null : activeString.split(' ');

  const boundsKey = JSON.stringify(scene.bounds);
  const portLatLng = scene.port ? { lat: scene.port.lat, lng: scene.port.lon } : null;

  const runSpecs = scene.runs
    .filter(run => run.path.length >= 2)
    .map(run => ({
      id: `${run.voyageId}|${run.key}`,
      emit: [run.key],
      match: runKeys ? runKeys(run) : [run.key, ...run.stopKeys, ...run.containerIds],
      color: run.color,
      weight: run.weight,
      path: run.path,
    }));
  const laneKey = portLatLng
    ? JSON.stringify([
        portLatLng,
        { lat: portLatLng.lat + LANE_STUB.lat, lng: portLatLng.lng + LANE_STUB.lng },
      ])
    : null;

  const defaultPlaceMatch = (place: ScenePlaceT) =>
    pinText ? [place.key, ...place.runKeys, ...place.containerIds] : [place.key];

  const overlaySpecs: OverlaySpecT[] = [
    ...scene.places.map((place): OverlaySpecT => ({
      id: `pin:${place.key}`,
      kind: 'pin',
      lat: place.lat,
      lng: place.lon,
      emit: [place.key],
      match: placeKeys ? placeKeys(place) : defaultPlaceMatch(place),
      name: placeLabel ? placeLabel(place) : place.name,
      sub: placeSublabel ? placeSublabel(place) : place.sublabel,
      color: place.color,
      radius: place.radius,
      text: pinText ? (pinText(place) ?? '') : '',
      variant: pinVariant ? pinVariant(place) : 'fill',
      side: labelSide(place, scene.places, portLatLng?.lng ?? null),
      base: place.dim ? 0.4 : 1,
      zIndex: 4,
    })),
    ...(scene.port
      ? [
          {
            id: `port:${scene.port.key}`,
            kind: 'port' as const,
            lat: scene.port.lat,
            lng: scene.port.lon,
            emit: [scene.port.key],
            match: [scene.port.key, ...scene.containers.map(({ key }) => key)],
            name: scene.port.name,
            sub: portSublabel ?? scene.port.sublabel,
            color: M2_COLORS.ink,
            radius: 7,
            text: '',
            variant: 'fill' as const,
            side: 'right' as const,
            base: 1,
            zIndex: 5,
          },
        ]
      : []),
    ...(showSeaLane && scene.seaLane && portLatLng
      ? [
          {
            id: `lane:${scene.seaLane.key}`,
            kind: 'lane' as const,
            lat: portLatLng.lat + LANE_STUB.lat,
            lng: portLatLng.lng + LANE_STUB.lng,
            emit: [scene.seaLane.key],
            match: [scene.seaLane.key],
            name: seaLaneLabel ?? scene.seaLane.label,
            sub: '',
            color: M2_COLORS.brandInk,
            radius: 0,
            text: '',
            variant: 'fill' as const,
            side: 'right' as const,
            base: 1,
            zIndex: 3,
          },
        ]
      : []),
    ...(showAir
      ? scene.places
          .filter(place => place.airPallets > 0)
          .map((place): OverlaySpecT => ({
            id: `air:${place.key}`,
            kind: 'air',
            lat: place.lat + AIR_STUB.lat,
            lng: place.lon + AIR_STUB.lng,
            emit: ['air', place.key],
            match: [
              'air',
              place.key,
              ...scene.air
                .filter(item => item.packhouseId === place.key)
                .flatMap(item => [item.key, item.lotId]),
            ],
            name: `항공 전환 · ${place.shortName} ${place.airPallets}P`,
            sub: '',
            color: M2_COLORS.warnInk,
            radius: 0,
            text: '',
            variant: 'fill',
            side: 'right',
            base: 1,
            zIndex: 3,
          }))
      : []),
  ];
  const overlayKey = JSON.stringify(overlaySpecs);
  const airLines = showAir
    ? scene.places
        .filter(place => place.airPallets > 0)
        .map(place => ({
          id: `air:${place.key}`,
          match: [
            'air',
            place.key,
            ...scene.air.filter(item => item.packhouseId === place.key).map(item => item.key),
          ],
          path: [
            { lat: place.lat, lng: place.lon },
            { lat: place.lat + AIR_STUB.lat, lng: place.lon + AIR_STUB.lng },
          ],
        }))
    : [];

  return (
    <>
      <FitBounds boundsKey={boundsKey} fitInsetLeft={fitInsetLeft} />

      {showSeaLane && scene.seaLane && laneKey ? (
        <>
          <StableLine
            pathKey={laneKey}
            strokeColor="#ffffff"
            strokeWeight={5}
            strokeOpacity={opacityFor(active, [scene.seaLane.key], 0.9)}
            zIndex={1}
          />
          <StableLine
            pathKey={laneKey}
            strokeColor={M2_COLORS.brand}
            strokeWeight={2}
            strokeStyle="shortdash"
            strokeOpacity={opacityFor(active, [scene.seaLane.key], 1)}
            zIndex={2}
          />
        </>
      ) : null}

      {airLines.map(line => {
        return (
          <StableLine
            key={line.id}
            pathKey={JSON.stringify(line.path)}
            strokeColor={M2_COLORS.warn}
            strokeWeight={2}
            strokeStyle="shortdash"
            strokeOpacity={opacityFor(active, line.match, 0.9)}
            zIndex={2}
          />
        );
      })}

      {runSpecs.map(run => {
        const isHit = active !== null && keysOverlap(run.match, active);
        const base = runsMode === 'active' ? 0 : 0.85;
        const lineOpacity = isHit ? 0.95 : opacityFor(active, run.match, base);
        return (
          <RunLines
            key={run.id}
            pathKey={JSON.stringify(run.path)}
            color={run.color}
            weight={run.weight}
            opacity={lineOpacity}
            emphasized={isHit}
            interactive={interactive && (runsMode === 'always' || isHit)}
            onHover={() => hoverFromMap(run.emit)}
            onLeave={() => hoverFromMap(null)}
            onPick={() => focusFromMap(run.emit)}
          />
        );
      })}

      <SceneOverlays
        overlayKey={overlayKey}
        activeString={activeString}
        interactive={interactive}
        hoverFromMap={hoverFromMap}
        focusFromMap={focusFromMap}
      />
    </>
  );
}

type LatLngPathT = { lat: number; lng: number }[];

type StableLinePropsT = Omit<ComponentProps<typeof Polyline>, 'path'> & { pathKey: string };

function StableLine({ pathKey, ...props }: StableLinePropsT) {
  const path = useMemo(() => JSON.parse(pathKey) as LatLngPathT, [pathKey]);

  return <Polyline path={path} {...props} />;
}

type RunLinesPropsT = {
  pathKey: string;
  color: string;
  weight: number;
  opacity: number;
  emphasized: boolean;
  interactive: boolean;
  onHover: () => void;
  onLeave: () => void;
  onPick: () => void;
};

function RunLines({
  pathKey,
  color,
  weight,
  opacity,
  emphasized,
  interactive,
  onHover,
  onLeave,
  onPick,
}: RunLinesPropsT) {
  const path = useMemo(() => JSON.parse(pathKey) as LatLngPathT, [pathKey]);

  return (
    <>
      <Polyline
        path={path}
        strokeColor="#ffffff"
        strokeWeight={weight + 4}
        strokeOpacity={Math.min(opacity, 0.9)}
        zIndex={emphasized ? 6 : 3}
      />
      <Polyline
        path={path}
        strokeColor={color}
        strokeWeight={emphasized ? weight + 1 : weight}
        strokeOpacity={opacity}
        zIndex={emphasized ? 7 : 4}
      />
      {interactive ? (
        <Polyline
          path={path}
          strokeColor="#000000"
          strokeWeight={14}
          strokeOpacity={0.01}
          zIndex={8}
          onMouseover={onHover}
          onMouseout={onLeave}
          onClick={onPick}
        />
      ) : null}
    </>
  );
}

function FitBounds({ boundsKey, fitInsetLeft }: { boundsKey: string; fitInsetLeft: number }) {
  const map = useMap();

  useEffect(() => {
    const points = JSON.parse(boundsKey) as { lat: number; lng: number }[];
    if (points.length === 0) return;

    const fit = () => {
      const width = map.getNode().clientWidth;
      const left = Math.max(28, Math.min(fitInsetLeft, width - 28 - width * 0.45));
      if (points.length === 1) {
        map.setLevel(9);
        map.setCenter(new kakao.maps.LatLng(points[0].lat, points[0].lng));
        return;
      }
      const bounds = new kakao.maps.LatLngBounds();
      points.forEach(({ lat, lng }) => bounds.extend(new kakao.maps.LatLng(lat, lng)));
      map.setBounds(bounds, 52, 28, 30, left);
    };

    fit();
    let lastWidth = map.getNode().clientWidth;
    const observer = new ResizeObserver(() => {
      const width = map.getNode().clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      map.relayout();
      fit();
    });
    observer.observe(map.getNode());

    return () => observer.disconnect();
  }, [map, boundsKey, fitInsetLeft]);

  return null;
}

type SceneOverlaysPropsT = {
  overlayKey: string;
  activeString: string | null;
  interactive: boolean;
  hoverFromMap: (keys: readonly string[] | null) => void;
  focusFromMap: (keys: readonly string[]) => void;
};

function buildOverlayElement(spec: OverlaySpecT) {
  const root = document.createElement('div');
  root.style.setProperty('--c', spec.color);

  if (spec.kind === 'lane' || spec.kind === 'air') {
    root.className = cn('m2-lane-label', spec.kind === 'air' && 'is-air');
    root.textContent = spec.name;
    root.style.paddingLeft = '6px';
    return root;
  }

  const label = document.createElement('span');
  label.className = cn('m2-pin-label', spec.side === 'left' && 'is-left');
  const name = document.createElement('b');
  name.textContent = spec.name;
  label.append(name);
  if (spec.sub) {
    const sub = document.createElement('small');
    sub.textContent = spec.sub;
    label.append(sub);
  }

  if (spec.kind === 'port') {
    root.className = 'm2-port';
    const ring = document.createElement('span');
    ring.className = 'm2-port-ring';
    const mark = document.createElement('span');
    mark.className = 'm2-port-mark';
    root.append(ring, mark, label);
    return root;
  }

  root.className = cn('m2-pin', spec.variant === 'ring' && 'is-ring');
  root.style.setProperty('--r2', `${Math.round(spec.radius * 2)}px`);
  const ring = document.createElement('span');
  ring.className = 'm2-pin-ring';
  const dot = document.createElement('span');
  dot.className = 'm2-pin-dot';
  dot.textContent = spec.text;
  root.append(ring, dot, label);
  return root;
}

function SceneOverlays({
  overlayKey,
  activeString,
  interactive,
  hoverFromMap,
  focusFromMap,
}: SceneOverlaysPropsT) {
  const map = useMap();
  const entriesRef = useRef<OverlayEntryT[]>([]);

  useEffect(() => {
    const specs = JSON.parse(overlayKey) as OverlaySpecT[];
    const created = specs.map(spec => {
      const element = buildOverlayElement(spec);
      if (interactive) {
        element.tabIndex = 0;
        element.setAttribute('role', 'button');
        element.setAttribute('aria-label', [spec.name, spec.sub].filter(Boolean).join(' · '));
        element.addEventListener('mouseenter', () => hoverFromMap(spec.emit));
        element.addEventListener('mouseleave', () => hoverFromMap(null));
        element.addEventListener('focus', () => hoverFromMap(spec.emit));
        element.addEventListener('blur', () => hoverFromMap(null));
        element.addEventListener('click', () => focusFromMap(spec.emit));
        element.addEventListener('keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          focusFromMap(spec.emit);
        });
      } else {
        element.style.pointerEvents = 'none';
      }

      const overlay = new kakao.maps.CustomOverlay({
        map,
        position: new kakao.maps.LatLng(spec.lat, spec.lng),
        content: element,
        xAnchor: spec.kind === 'lane' || spec.kind === 'air' ? 0 : 0.5,
        yAnchor: 0.5,
        clickable: interactive,
        zIndex: spec.zIndex,
      });

      return { overlay, entry: { element, match: spec.match, base: spec.base } };
    });
    entriesRef.current = created.map(({ entry }) => entry);

    return () => {
      created.forEach(({ overlay }) => overlay.setMap(null));
      entriesRef.current = [];
    };
  }, [map, overlayKey, interactive, hoverFromMap, focusFromMap]);

  useEffect(() => {
    const active = activeString === null ? null : activeString.split(' ');
    entriesRef.current.forEach(({ element, match, base }) => {
      element.style.opacity = String(opacityFor(active, match, base));
      element.classList.toggle('is-hl', active !== null && keysOverlap(match, active));
    });
  }, [activeString, overlayKey]);

  return null;
}
