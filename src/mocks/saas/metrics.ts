import { HttpResponse, http } from 'msw';

import { api, authorize, fail } from '@/mocks/saas/access';
import businessYearsFixture from '@/mocks/saas/fixtures/business-years.json';
import platformBusinessEmptyFixture from '@/mocks/saas/fixtures/platform-business-empty.json';
import platformBusinessFixture from '@/mocks/saas/fixtures/platform-business.json';
import platformMetricsEmptyFixture from '@/mocks/saas/fixtures/platform-metrics-empty.json';
import platformMetricsFixture from '@/mocks/saas/fixtures/platform-metrics.json';
import type { BusinessYearsT, PlatformBusinessT, PlatformMetricsT } from '@/types/saas-platform';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_INVALID = '월은 YYYY-MM 형식이어야 합니다';
const YEARS_INVALID = '기간은 1~5년이어야 합니다';
const SUBSIDY_INVALID = '지원금은 0 이상이어야 합니다';
const SHARE_INVALID = '포워더 몫 비율은 0~1 이어야 합니다';
const MAX_YEARS = 5;

const metrics = platformMetricsFixture as unknown as PlatformMetricsT;
const metricsEmpty = platformMetricsEmptyFixture as unknown as PlatformMetricsT;
const business = platformBusinessFixture as unknown as PlatformBusinessT;
const businessEmpty = platformBusinessEmptyFixture as unknown as PlatformBusinessT;
const years = businessYearsFixture as unknown as BusinessYearsT;

const SEEDED_MONTH = metrics.month;

const targetMonth = (url: URL) => {
  const month = url.searchParams.get('month');
  if (!month) return SEEDED_MONTH;

  return MONTH_PATTERN.test(month) ? month : null;
};

const shareParam = (url: URL) => {
  const raw = url.searchParams.get('sensitivity_forwarder_share');
  if (raw === null) return null;

  const share = Number(raw);

  return Number.isFinite(share) && share >= 0 && share <= 1 ? share : Number.NaN;
};

const withShare = <T extends { forwarder_share: number }>(lines: T[], share: number | null) =>
  share === null
    ? lines
    : lines.map((line, index) =>
        index === lines.length - 1 ? { ...line, forwarder_share: share } : line
      );

export const metricsHandlers = [
  http.get(api('/saas/platform/metrics'), ({ request }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    const month = targetMonth(new URL(request.url));
    if (!month) return fail(422, MONTH_INVALID);

    return HttpResponse.json(month === SEEDED_MONTH ? metrics : { ...metricsEmpty, month });
  }),

  http.get(api('/saas/platform/business'), ({ request }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    const url = new URL(request.url);
    const month = targetMonth(url);
    if (!month) return fail(422, MONTH_INVALID);

    const share = shareParam(url);
    if (Number.isNaN(share)) return fail(422, SHARE_INVALID);

    const base = month === SEEDED_MONTH ? business : { ...businessEmpty, month };

    return HttpResponse.json({ ...base, lines: withShare(base.lines, share) });
  }),

  http.get(api('/saas/platform/business/years'), ({ request }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    const url = new URL(request.url);
    const count = Number(url.searchParams.get('years') ?? MAX_YEARS);
    if (!Number.isInteger(count) || count < 1 || count > MAX_YEARS) {
      return fail(422, YEARS_INVALID);
    }

    const subsidies = url.searchParams.getAll('subsidies').map(Number);
    if (subsidies.some(value => !Number.isFinite(value) || value < 0)) {
      return fail(422, SUBSIDY_INVALID);
    }

    const subsidyOf = (year: number, fallback: number) =>
      subsidies.length ? (subsidies[year - 1] ?? 0) : fallback;

    const lines = years.lines.map(line => {
      let cumulativeBefore = 0;
      let cumulativeAfter = 0;
      const rows = line.rows.slice(0, count).map(row => {
        const subsidy = subsidyOf(row.year, row.subsidy);
        const netAfter = row.net_before_subsidy + subsidy;
        cumulativeBefore += row.net_before_subsidy;
        cumulativeAfter += netAfter;

        return {
          ...row,
          subsidy,
          net_after_subsidy: netAfter,
          cumulative_before_subsidy: cumulativeBefore,
          cumulative_after_subsidy: cumulativeAfter,
        };
      });
      const firstYear = (pick: (row: (typeof rows)[number]) => number) =>
        rows.find(row => pick(row) >= 0)?.year ?? null;

      return {
        ...line,
        rows,
        breakeven_year_before_subsidy: firstYear(row => row.net_before_subsidy),
        breakeven_year_after_subsidy: firstYear(row => row.net_after_subsidy),
        payback_year_before_subsidy: firstYear(row => row.cumulative_before_subsidy),
        payback_year_after_subsidy: firstYear(row => row.cumulative_after_subsidy),
      };
    });

    return HttpResponse.json({
      ...years,
      years: count,
      volumes: years.volumes.slice(0, count),
      subsidies: subsidies.length
        ? years.subsidies.slice(0, count).map(item => ({
            ...item,
            amount: subsidyOf(item.year, item.amount),
            source: '쿼리로 넣은 가정',
          }))
        : years.subsidies.slice(0, count),
      lines,
    });
  }),
];
