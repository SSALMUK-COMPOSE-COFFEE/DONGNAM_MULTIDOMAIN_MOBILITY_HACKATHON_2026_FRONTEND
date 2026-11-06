const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const JONGSEONG_COUNT = 28;

export const subjectParticle = (word: string) => {
  const code = word.trim().slice(-1).charCodeAt(0);
  if (Number.isNaN(code) || code < HANGUL_START || code > HANGUL_END) return '이(가)';

  return (code - HANGUL_START) % JONGSEONG_COUNT === 0 ? '가' : '이';
};
