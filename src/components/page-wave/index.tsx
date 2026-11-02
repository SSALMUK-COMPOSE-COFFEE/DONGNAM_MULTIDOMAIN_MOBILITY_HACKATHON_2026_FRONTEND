/** 발표 자료 하단의 물결. 화면 맨 아래에 깔고 내용 뒤에 둔다 */
export function PageWave() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none mt-12 block h-36 w-full"
      viewBox="0 0 1920 144"
      preserveAspectRatio="none"
    >
      <path
        d="M0 104 C 320 64, 620 56, 960 72 S 1600 58, 1920 26 L 1920 144 L 0 144 Z"
        fill="#dfeafc"
      />
      <path
        d="M0 104 C 320 64, 620 56, 960 72 S 1600 58, 1920 26"
        fill="none"
        stroke="var(--navy)"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
