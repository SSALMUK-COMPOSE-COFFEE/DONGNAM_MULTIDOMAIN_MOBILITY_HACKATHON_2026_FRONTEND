'use client';

import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { type CSSProperties, type KeyboardEvent, useId, useMemo, useRef, useState } from 'react';

import {
  type AllocationContainerT,
  type AllocationPlanT,
  type AllocationScenarioT,
  allocationGroupAt,
  allocationGroupStart,
  buildAllocationPreview,
} from '@/components/container-allocation-preview/model';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import './preview.css';

const PAGE_SIZE = 40;
const COLUMNS = 4;

type ContainerAllocationPreviewPropsT = {
  plan: AllocationPlanT;
  scenario: AllocationScenarioT;
  viewerShipperId?: string;
  defaultOpen?: boolean;
};

export function ContainerAllocationPreview({
  plan,
  scenario,
  viewerShipperId,
  defaultOpen = false,
}: ContainerAllocationPreviewPropsT) {
  const labelId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const containers = useMemo(
    () => buildAllocationPreview(plan, scenario, viewerShipperId),
    [plan, scenario, viewerShipperId]
  );
  const [pickedId, setPickedId] = useState('');
  const selected = containers.find(container => container.id === pickedId) ?? containers[0];

  return (
    <details
      className="allocation-preview"
      open={open}
      onToggle={event => setOpen(event.currentTarget.open)}
    >
      <summary>
        <h2>배치 미리보기</h2>
        <span className="allocation-preview-summary-sub">
          2D · 3D
          <ChevronDown size={16} aria-hidden />
        </span>
      </summary>
      {open && (
        <div className="allocation-preview-content">
          {selected ? (
            <>
              <div className="allocation-preview-heading">
                <div>
                  <label id={labelId}>컨테이너</label>
                  <Select value={selected.id} onValueChange={setPickedId}>
                    <SelectTrigger aria-labelledby={labelId} className="allocation-preview-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {containers.map(container => (
                        <SelectItem key={container.id} value={container.id}>
                          {container.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="allocation-preview-count">
                  <strong>
                    {selected.occupied.toLocaleString()}{' '}
                    <span>/ {selected.capacity.toLocaleString()}</span>
                  </strong>
                  <span>파렛트 · 빈자리 {selected.empty.toLocaleString()}</span>
                </div>
              </div>
              <AllocationBoard key={selected.id} container={selected} />
            </>
          ) : (
            <p className="allocation-preview-empty">이 계획에는 해상 배정 컨테이너가 없습니다.</p>
          )}
        </div>
      )}
    </details>
  );
}

function AllocationBoard({ container }: { container: AllocationContainerT }) {
  const id = useId();
  const [pickedIndex, setPickedIndex] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const twoRefs = useRef(new Map<number, HTMLButtonElement>());
  const threeRefs = useRef(new Map<number, SVGGElement>());
  const total = Math.max(container.capacity, container.occupied);
  const selectedIndex = Math.min(pickedIndex, Math.max(total - 1, 0));
  const pageStart = Math.floor(selectedIndex / PAGE_SIZE) * PAGE_SIZE;
  const cells = Array.from(
    { length: Math.min(PAGE_SIZE, Math.max(total - pageStart, 0)) },
    (_, index) => pageStart + index
  );
  const inspectedIndex = hoverIndex ?? selectedIndex;
  const inspected = allocationGroupAt(container, inspectedIndex);
  const selectedGroup = allocationGroupAt(container, selectedIndex);
  const choose = (index: number) => {
    setPickedIndex(index);
    setHoverIndex(null);
  };
  const labelOf = (index: number) => {
    const group = allocationGroupAt(container, index);
    const overflow = index >= container.capacity ? ', 정원 초과' : '';
    return group
      ? `${index + 1} 번 칸, ${group.shipper}, ${group.product}, 이 화물 ${group.pallets}파렛트${overflow}`
      : `${index + 1} 번 칸, 빈자리`;
  };
  const navigate = (
    event: KeyboardEvent<HTMLButtonElement | SVGGElement>,
    index: number,
    target: '2d' | '3d'
  ) => {
    const moves: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      ArrowUp: index - COLUMNS,
      ArrowDown: index + COLUMNS,
      Home: event.ctrlKey ? 0 : Math.floor(index / COLUMNS) * COLUMNS,
      End: event.ctrlKey
        ? total - 1
        : Math.min(Math.floor(index / COLUMNS) * COLUMNS + COLUMNS - 1, total - 1),
      PageUp: index - PAGE_SIZE,
      PageDown: index + PAGE_SIZE,
    };
    if (event.key in moves) {
      event.preventDefault();
      const next = Math.max(0, Math.min(moves[event.key], total - 1));
      choose(next);
      requestAnimationFrame(() =>
        (target === '2d' ? twoRefs : threeRefs).current.get(next)?.focus()
      );
    } else if (target === '3d' && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      choose(index);
    }
  };
  const groupStyle = (index: number) => {
    const group = allocationGroupAt(container, index);
    return { '--allocation-color': group?.color ?? '#eef2f6' } as CSSProperties;
  };
  const rows = Math.ceil(cells.length / COLUMNS);
  const depth = (index: number) =>
    Math.floor((index - pageStart) / COLUMNS) + ((index - pageStart) % COLUMNS);
  const isoCells = [...cells].sort((left, right) => depth(left) - depth(right) || left - right);
  const width = (rows + COLUMNS) * 24 + 70;
  const height = (rows + COLUMNS) * 12 + 105;
  const point = (column: number, row: number, z = 0) => [
    rows * 24 + 35 + (column - row) * 24,
    57 + (column + row) * 12 - z,
  ];
  const polygon = (points: number[][]) => points.map(item => item.join(',')).join(' ');

  return (
    <>
      {container.overflow > 0 && (
        <p role="alert" className="allocation-preview-warning">
          정원보다 {container.overflow.toLocaleString()}파렛트 많습니다. 초과 칸을 함께 표시했으며,
          적재 가능한 배정으로 볼 수 없습니다.
        </p>
      )}
      {container.issues.length > 0 && (
        <div role="status" className="allocation-preview-warning">
          {container.issues.map(issue => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      )}
      <div className="allocation-preview-mobile-views" role="group" aria-label="미리보기 방식">
        <button type="button" aria-pressed={view === '2d'} onClick={() => setView('2d')}>
          2D 평면
        </button>
        <button type="button" aria-pressed={view === '3d'} onClick={() => setView('3d')}>
          3D 보기
        </button>
      </div>
      <div className="allocation-preview-boards">
        <div
          role="group"
          className={`allocation-preview-panel ${view === '2d' ? 'is-active' : ''}`}
          aria-labelledby={`${id}-2d`}
        >
          <div className="allocation-preview-panel-head">
            <h3 id={`${id}-2d`}>2D 평면</h3>
            <span>한 칸 = 1파렛트</span>
          </div>
          <div
            className="allocation-preview-grid"
            role="group"
            aria-label={`${container.id} 평면 배정`}
          >
            {cells.map(index => {
              const group = allocationGroupAt(container, index);
              return (
                <button
                  key={index}
                  ref={element => {
                    if (element) twoRefs.current.set(index, element);
                    else twoRefs.current.delete(index);
                  }}
                  type="button"
                  className="allocation-preview-cell"
                  style={groupStyle(index)}
                  data-empty={!group}
                  data-selected={selectedIndex === index}
                  data-overflow={index >= container.capacity}
                  aria-pressed={selectedIndex === index}
                  aria-label={labelOf(index)}
                  title={labelOf(index)}
                  tabIndex={selectedIndex === index ? 0 : -1}
                  onFocus={() => choose(index)}
                  onClick={() => choose(index)}
                  onKeyDown={event => navigate(event, index, '2d')}
                  onPointerEnter={() => setHoverIndex(index)}
                  onPointerLeave={() => setHoverIndex(null)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          {!cells.length && <p className="allocation-preview-empty">표시할 칸이 없습니다.</p>}
        </div>
        <div
          role="group"
          className={`allocation-preview-panel ${view === '3d' ? 'is-active' : ''}`}
          aria-labelledby={`${id}-3d`}
        >
          <div className="allocation-preview-panel-head">
            <h3 id={`${id}-3d`}>3D 보기</h3>
            <span>같은 배정의 입체 표현</span>
          </div>
          {cells.length > 0 && (
            <svg
              className="allocation-preview-svg"
              viewBox={`0 0 ${width} ${height}`}
              role="group"
              aria-label={`${container.id} 입체 배정`}
            >
              <polygon
                points={polygon([
                  point(0, 0, 38),
                  point(COLUMNS, 0, 38),
                  point(COLUMNS, 0),
                  point(0, 0),
                ])}
                fill="#e3ebf3"
                stroke="#9caec2"
              />
              <polygon
                points={polygon([point(0, 0, 38), point(0, rows, 38), point(0, rows), point(0, 0)])}
                fill="#edf2f7"
                stroke="#9caec2"
              />
              <polygon
                points={polygon([
                  point(0, 0),
                  point(COLUMNS, 0),
                  point(COLUMNS, rows),
                  point(0, rows),
                ])}
                fill="#f7f9fc"
                stroke="#9caec2"
              />
              {isoCells.map(index => {
                const localIndex = index - pageStart;
                const column = localIndex % COLUMNS;
                const row = Math.floor(localIndex / COLUMNS);
                const group = allocationGroupAt(container, index);
                const z = group ? 24 : 0;
                const a = point(column + 0.12, row + 0.12, z),
                  b = point(column + 0.88, row + 0.12, z),
                  c = point(column + 0.88, row + 0.88, z),
                  d = point(column + 0.12, row + 0.88, z);
                const center = point(column + 0.5, row + 0.5, z);
                return (
                  <g
                    key={index}
                    ref={element => {
                      if (element) threeRefs.current.set(index, element);
                      else threeRefs.current.delete(index);
                    }}
                    role="button"
                    tabIndex={selectedIndex === index ? 0 : -1}
                    aria-label={labelOf(index)}
                    aria-pressed={selectedIndex === index}
                    className="allocation-preview-cube"
                    onClick={() => choose(index)}
                    onFocus={() => choose(index)}
                    onKeyDown={event => navigate(event, index, '3d')}
                    onPointerEnter={() => setHoverIndex(index)}
                    onPointerLeave={() => setHoverIndex(null)}
                  >
                    {group && (
                      <>
                        <polygon
                          points={polygon([
                            d,
                            c,
                            point(column + 0.88, row + 0.88),
                            point(column + 0.12, row + 0.88),
                          ])}
                          fill={group.color}
                          style={{ filter: 'brightness(.72)' }}
                        />
                        <polygon
                          points={polygon([
                            b,
                            c,
                            point(column + 0.88, row + 0.88),
                            point(column + 0.88, row + 0.12),
                          ])}
                          fill={group.color}
                          style={{ filter: 'brightness(.86)' }}
                        />
                      </>
                    )}
                    <polygon
                      points={polygon([a, b, c, d])}
                      fill={group?.color ?? '#eef2f6'}
                      stroke={index >= container.capacity ? '#b42318' : '#b1bece'}
                      strokeWidth={index >= container.capacity ? 2 : 1}
                      strokeDasharray={group ? '' : '3 2'}
                    />
                    {selectedIndex === index && (
                      <>
                        <polygon
                          points={polygon([a, b, c, d])}
                          fill="none"
                          stroke="#112f58"
                          strokeWidth="5"
                        />
                        <polygon
                          points={polygon([a, b, c, d])}
                          fill="none"
                          stroke="#fff"
                          strokeWidth="2"
                        />
                      </>
                    )}
                    <text
                      x={center[0]}
                      y={center[1] + 3}
                      textAnchor="middle"
                      fill={group ? '#fff' : '#526175'}
                      fontSize="9"
                      fontWeight="600"
                      pointerEvents="none"
                    >
                      {index + 1}
                    </text>
                  </g>
                );
              })}
              <text x={width - 20} y={height - 15} textAnchor="end" fill="#526175" fontSize="10">
                논리적 슬롯 배치
              </text>
            </svg>
          )}
        </div>
      </div>
      {total > PAGE_SIZE && (
        <div className="allocation-preview-pages">
          <button
            type="button"
            disabled={pageStart === 0}
            onClick={() => choose(Math.max(0, pageStart - PAGE_SIZE))}
            aria-label="이전 칸 보기"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <span>
            {pageStart + 1}–{pageStart + cells.length} / {total.toLocaleString()}칸
          </span>
          <button
            type="button"
            disabled={pageStart + PAGE_SIZE >= total}
            onClick={() => choose(pageStart + PAGE_SIZE)}
            aria-label="다음 칸 보기"
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      )}
      <div className="allocation-preview-selection" aria-live="polite">
        <span>{total > 0 ? `${inspectedIndex + 1}번 칸` : '선택 정보'}</span>
        {inspected ? (
          <>
            <strong>{inspected.shipper}</strong>
            <span>{inspected.product}</span>
            <span>이 화물 {inspected.pallets.toLocaleString()}파렛트</span>
          </>
        ) : (
          <strong>{total > 0 ? '빈자리 · 배정 없음' : '표시할 배정이 없습니다'}</strong>
        )}
      </div>
      <div className="allocation-preview-legend" role="group" aria-label="화주별 배정 선택">
        {container.groups.map(group => (
          <button
            type="button"
            key={group.key}
            aria-pressed={selectedGroup?.key === group.key}
            onClick={() => choose(allocationGroupStart(container, group.key))}
          >
            <span aria-hidden style={{ background: group.color }} />
            <span>
              {group.shipper}
              {!group.private && ` · ${group.product}`}
            </span>
            <b>{group.pallets.toLocaleString()}P</b>
          </button>
        ))}
        <span className="allocation-preview-legend-empty">
          <i aria-hidden />
          빈자리 {container.empty.toLocaleString()}P
        </span>
      </div>
      <p className="allocation-preview-note">
        배정 수량을 같은 크기의 칸으로 나눈 미리보기입니다. 실제 치수·적층·중량 분포를 반영한 적재
        도면은 아닙니다. 칸을 선택하거나 방향키로 이동해 배정을 확인할 수 있습니다.
      </p>
    </>
  );
}
