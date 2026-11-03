import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';

const SIGNUP_PATH = '/test/signup';
const LOGIN_PATH = '/test/login';
const RAW_LOT_ID = /\blot-[a-z0-9-]+/;
const MOBILE_WIDTH = 390;
const LOSS_TEXT = /^\d+\.\d% · 도착 검수 학습 \d+건$/;
const LOSS_CHIP = /^근거: 도착 검수 학습 \d+건$/;
const ASSUMED_LOSS_TEXT = /^\d+\.\d% · 기본값\(가정\)$/;
const ASSUMED_LOSS_CHIP = '근거: 기본값 가정';
const ASSUMED_LOSS_NOTE = '가정: 아직 도착 검수 기록이 없어 정한 기본값입니다.';
const LOSS_CARD = '내 출하 예상 손실률 (해상)';

const assumeDefaultLoss = (page: Page) =>
  page.addInitScript(() => {
    const urls = new WeakMap<XMLHttpRequest, string>();
    const open = XMLHttpRequest.prototype.open;
    const responseText = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText');
    const assumed = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(assumed);
      if (!value || typeof value !== 'object') return value;

      return Object.fromEntries(
        Object.entries(value).map(([key, item]) =>
          key === 'expected_loss' && item && typeof item === 'object'
            ? [key, { ...item, basis: '기본값(가정)', n_observations: 0, source: null }]
            : [key, assumed(item)]
        )
      );
    };

    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      ...args: Parameters<XMLHttpRequest['open']>
    ) {
      urls.set(this, String(args[1]));

      return open.apply(this, args);
    } as XMLHttpRequest['open'];
    Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
      configurable: true,
      get(this: XMLHttpRequest) {
        const text = String(responseText?.get?.call(this) ?? '');
        const url = urls.get(this) ?? '';
        if (!/\/(saas\/shipper|intake)\/lots/.test(url) || !text.includes('expected_loss')) {
          return text;
        }

        return JSON.stringify(assumed(JSON.parse(text)));
      },
    });
  });

type AwaitingOptionsT = { addPlan?: boolean; awaitingIndexes?: number[] | null };

const ADDED_PLAN_ID = 'e2e-added-plan';
const ADDED_VESSEL = 'MV E2E 추가 계획';

const markPlansAwaitingShipper = (page: Page, options: AwaitingOptionsT = {}) =>
  page.addInitScript(
    ({ addPlan, awaitingIndexes, addedPlanId, addedVessel }) => {
      const urls = new WeakMap<XMLHttpRequest, string>();
      const open = XMLHttpRequest.prototype.open;
      const responseText = Object.getOwnPropertyDescriptor(
        XMLHttpRequest.prototype,
        'responseText'
      );
      const state = { sourcePlanId: '' };
      const isRecord = (value: unknown): value is Record<string, unknown> =>
        !!value && typeof value === 'object';
      const withAddedPlan = (plans: unknown[]) => {
        const source = plans.find(isRecord);
        if (!addPlan || !source) return plans;
        state.sourcePlanId = String(source.plan_id);
        const created = new Date(String(source.created_at));
        created.setDate(created.getDate() - 1);

        return [
          ...plans,
          {
            ...source,
            plan_id: addedPlanId,
            created_at: created.toISOString(),
            vessel: addedVessel,
          },
        ];
      };
      const withAddedRow = (rows: unknown[]) => {
        const source = rows.find(isRecord);
        if (!addPlan || !source) return rows;
        const half = (key: string) => Math.round(Number(source[key] ?? 0) / 2);

        return [
          ...rows,
          {
            ...source,
            plan_id: addedPlanId,
            vessel: addedVessel,
            baseline_cost: half('baseline_cost'),
            shared_cost: half('shared_cost'),
            savings: half('savings'),
            fee: half('fee'),
            fee_before_refund: half('fee_before_refund'),
            shipper_gain: half('shipper_gain'),
            quality_refund: 0,
          },
        ];
      };

      XMLHttpRequest.prototype.open = function (
        this: XMLHttpRequest,
        ...args: Parameters<XMLHttpRequest['open']>
      ) {
        const url = String(args[1]);
        urls.set(this, url);
        if (state.sourcePlanId && url.includes(`/saas/shipper/plans/${addedPlanId}`)) {
          args[1] = url.replace(addedPlanId, state.sourcePlanId);
        }

        return open.apply(this, args);
      } as XMLHttpRequest['open'];
      Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
        configurable: true,
        get(this: XMLHttpRequest) {
          const text = String(responseText?.get?.call(this) ?? '');
          const url = urls.get(this) ?? '';
          if (/\/saas\/shipper\/settlements(\?|$)/.test(url)) {
            const rows: unknown = JSON.parse(text);

            return Array.isArray(rows) ? JSON.stringify(withAddedRow(rows)) : text;
          }
          if (!/\/saas\/shipper\/plans(\?|$)/.test(url)) return text;
          const plans: unknown = JSON.parse(text);
          if (!Array.isArray(plans)) return text;

          return JSON.stringify(
            withAddedPlan(plans).map((plan, index) =>
              isRecord(plan) && (!awaitingIndexes || awaitingIndexes.includes(index))
                ? { ...plan, status: 'pending_shipper_confirmation' }
                : plan
            )
          );
        },
      });
    },
    {
      addPlan: options.addPlan ?? false,
      awaitingIndexes: options.awaitingIndexes ?? null,
      addedPlanId: ADDED_PLAN_ID,
      addedVessel: ADDED_VESSEL,
    }
  );

const expectLossCard = async (page: Page) => {
  const card = page.getByRole('region', { name: LOSS_CARD });
  await expect(card).toBeVisible();
  await expect(card.getByRole('definition')).toHaveText(/^\d+\.\d%$/);
  await expect(card.getByText(/내 물량의 약 \d+\.\d%가 상품성을 잃을 수 있다는 뜻/)).toBeVisible();
  const rows = card.getByRole('list', { name: '품목·목적지별 예상 손실률' }).getByRole('listitem');
  await expect(rows.first()).toContainText(/\d+\.\d%/);
  await expect(rows.first().locator('.m2-chip')).toHaveText(LOSS_CHIP);
  await expect(card.getByRole('link', { name: '출하별로 보기' })).toHaveAttribute(
    'href',
    /\/app\/shipper\/lots$/
  );

  return card;
};

const expectLossColumn = async (page: Page) => {
  const main = page.getByRole('main').first();
  await expect(main.getByRole('columnheader', { name: /예상 손실률/ })).toBeVisible();
  const cell = main
    .locator('tbody')
    .getByRole('row')
    .first()
    .getByRole('cell')
    .filter({ hasText: /\d+\.\d%/ });
  await expect(cell).toHaveCount(1);
  await expect(cell.locator('.m2-chip')).toHaveText(LOSS_CHIP);
  await page.setViewportSize({ width: MOBILE_WIDTH, height: 844 });
  await expect(cell.getByText('예상 손실')).toBeVisible();
  await expect(cell).toContainText(/\d+\.\d%/);
  await page.setViewportSize({ width: 1440, height: 900 });
};

const menu = (page: Page, name: RegExp) =>
  page.getByRole('complementary', { name: '주 메뉴' }).getByRole('link', { name });

const expectNoSeriousAxe = async (page: Page, screen: string, scope = 'main') => {
  await page.waitForFunction(() =>
    document.getAnimations().every(animation => animation.playState !== 'running')
  );
  const result = await new AxeBuilder({ page }).include(scope).analyze();
  const blocking = result.violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.slice(0, 5).map(({ target }) => target.join(' ')),
    }));

  expect(blocking, `${screen} axe serious·critical`).toEqual([]);
};

const expectNoRawLotId = async (page: Page) => {
  const text = await page.getByRole('main').first().innerText();

  expect(text).not.toMatch(RAW_LOT_ID);
};

const expectFitsMobile = async (page: Page, screen: string) => {
  await page.setViewportSize({ width: MOBILE_WIDTH, height: 844 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, `${screen} 가로 넘침(px)`).toBeLessThanOrEqual(0);
  await page.setViewportSize({ width: 1440, height: 900 });
};

const seasonNumbers = async (page: Page) => {
  const card = page.getByRole('region', { name: '이번 시즌 내가 아낀 금액' });
  await expect(card).toBeVisible();
  const valueOf = (label: string) =>
    card
      .locator('div')
      .filter({ has: page.locator('dt', { hasText: label }) })
      .locator('dd');

  return {
    savings: (await valueOf('아낀 금액').innerText()).trim(),
    fee: (await valueOf('수수료').innerText()).trim(),
    gain: (await valueOf('내 몫').innerText()).trim(),
  };
};

test('새 화주가 화면만으로 선과장을 등록하고 수출 시기 밖 출하를 등록한 뒤 홈 시즌 카드를 본다', async ({
  page,
}) => {
  const stamp = Date.now();

  await test.step('가입하면 홈에서 선과장 등록으로 안내한다', async () => {
    await page.goto(SIGNUP_PATH);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await page.getByLabel('회사 이름').fill(`온보딩 검증 농가 ${stamp}`);
    await page.getByLabel('담당자 이름').fill('검증 담당');
    await page.getByLabel('이메일').fill(`onboarding-${stamp}@example.com`);
    await page.getByLabel('비밀번호').fill('password-1');
    await page.getByRole('button', { name: '가입하고 시작하기' }).click();
    await page.waitForURL(/\/test\/app\/shipper/);

    const main = page.getByRole('main').first();
    await expect(main.getByRole('heading', { name: '먼저 선과장을 등록하세요' })).toBeVisible();
    await expect(main.getByText('먼저 선과장을 등록하세요')).toHaveCount(1);
    await expect(main.getByRole('link', { name: '선과장 등록하기' })).toHaveCount(1);
    await expectNoSeriousAxe(page, '화주 홈(가입 직후)');
    await main.getByRole('link', { name: '선과장 등록하기' }).click();
    await page.waitForURL(/\/test\/app\/shipper\/onboarding/);
  });

  await test.step('빈 칸으로 내면 오류가 입력칸에 연결된다', async () => {
    const form = page.getByRole('form', { name: '선과장 등록' });
    await form.getByRole('button', { name: '선과장 등록' }).click();
    const name = form.getByLabel('선과장 이름');
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toBeFocused();
    await expect(name).toHaveAccessibleDescription('선과장 이름을 넣으세요.');
    await expect(form.getByLabel('위도')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByLabel('딸기')).toHaveAccessibleDescription(
      '취급 품목을 하나 이상 고르세요.'
    );
    await expectNoSeriousAxe(page, '선과장 등록');
  });

  await test.step('지도 대신 좌표를 직접 넣어 선과장을 등록한다', async () => {
    const form = page.getByRole('form', { name: '선과장 등록' });
    await form.getByLabel('선과장 이름').fill('검증 선과장');
    await form.getByLabel('주소 · 지역').fill('경남 진주시 문산읍');
    await form.getByLabel('위도').fill('36.180');
    await form.getByLabel('경도').fill('128.107');
    await form.getByLabel('딸기').check();
    await form.getByRole('button', { name: '선과장 등록' }).click();

    const main = page.getByRole('main').first();
    const done = main.getByRole('heading', { name: '선과장 등록을 마쳤어요' });
    await expect(done).toBeVisible();
    await expect(done).toBeFocused();
    await expect(main.getByRole('link', { name: '첫 출하 등록하기' })).toBeVisible();
    await expectFitsMobile(page, '선과장 등록');
  });

  await test.step('좌표를 고친 선과장을 더 등록하고 기본 선과장으로 바꾼다', async () => {
    const main = page.getByRole('main').first();
    const form = page.getByRole('form', { name: '선과장 등록' });
    await expect(main.getByRole('heading', { name: '다른 선과장 추가' })).toBeVisible();
    await form.getByLabel('선과장 이름').fill('문산 선별장');
    await form.getByLabel('주소 · 지역').fill('경남 진주시 문산읍');
    await form.getByLabel('위도').fill('35.180');
    await form.getByLabel('경도').fill('128.107');
    await form.getByLabel('딸기').check();
    await form.getByRole('button', { name: '선과장 등록' }).click();

    const done = main.getByRole('heading', { name: '선과장을 하나 더 등록했어요' });
    await expect(done).toBeFocused();
    await expect(main.getByText(/문산 선별장에서 집하하려면/)).toBeVisible();
    await main.getByRole('button', { name: '문산 선별장 기본 선과장으로 지정' }).click();
    await expect(
      main.getByRole('listitem').filter({ hasText: '문산 선별장' }).getByText('기본 선과장')
    ).toBeVisible();
    await expect(main.getByText(/문산 선별장에서 집하하려면/)).toHaveCount(0);
    await expect(done).toBeFocused();
    await expectNoSeriousAxe(page, '선과장 추가');
    await main.getByRole('link', { name: '출하 등록하기' }).click();
    await page.waitForURL(/\/test\/app\/shipper\/lots/);
  });

  await test.step('새로고침해도 등록한 선과장이 남아 있다', async () => {
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    const form = page.getByRole('region', { name: '새 출하 등록' });
    await expect(form.getByLabel('선과장')).toHaveValue('문산 선별장 · 경남 진주시 문산읍');
  });

  await test.step('수출 시기 밖 출하일이면 미리보기와 등록 결과에 경고가 뜬다', async () => {
    const form = page.getByRole('region', { name: '새 출하 등록' });
    const ready = form.getByLabel('출하 가능일');
    await ready.fill('2027-07-01');
    const warning = form
      .getByRole('status')
      .filter({ hasText: /딸기 수출 시기\(11~5월\) 밖의 출하일입니다/ });
    await expect(warning).toBeVisible();
    await expect(ready).toHaveAccessibleDescription(/수출 시기/);
    const previewLoss = form.locator('.m2-lines > div').filter({ hasText: '예상 손실률 (해상)' });
    await expect(previewLoss.locator('b')).toHaveText(LOSS_TEXT);
    await expectNoSeriousAxe(page, '출하 등록(경고)');

    await form.getByRole('button', { name: '출하 등록' }).click();
    const main = page.getByRole('main').first();
    await expect(main.getByRole('status').filter({ hasText: '수출 시기 밖 출하' })).toBeVisible();
    const row = main.getByRole('row').filter({ hasText: '딸기 07/01 · 1파렛트' });
    await expect(row).toHaveCount(1);
    const edit = row.getByRole('button', { name: '딸기 07/01 · 1파렛트 수정' });
    await expect(edit).toBeVisible();
    await expect(main.getByText(/판매기한 = .*2027-07-08/)).toBeVisible();
    await expect(main.getByText(/2026-11-24/)).toHaveCount(0);
    await expect(
      main
        .getByRole('region', { name: '등록 결과' })
        .locator('.m2-lines > div')
        .filter({ hasText: '예상 손실률 (해상)' })
        .locator('b')
    ).toHaveText(LOSS_TEXT);
    await expectLossColumn(page);
    await expectNoRawLotId(page);

    await edit.click();
    await expect(page.getByRole('dialog', { name: '출하 수정' })).toBeVisible();
    await expectNoSeriousAxe(page, '출하 수정 창', '[role="dialog"]');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: '출하 수정' })).toHaveCount(0);
    await expect(edit).toBeFocused();

    const remove = row.getByRole('button', { name: '딸기 07/01 · 1파렛트 삭제' });
    await remove.click();
    await expect(page.getByRole('alertdialog', { name: '출하를 삭제할까요?' })).toBeVisible();
    await expectNoSeriousAxe(page, '출하 삭제 확인', '[role="alertdialog"]');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(remove).toBeFocused();

    await expectNoSeriousAxe(page, '내 출하');
    await expectFitsMobile(page, '내 출하');
  });

  await test.step('새 화주 홈 시즌 카드는 아직 0원이다', async () => {
    await menu(page, /^홈/).click();
    await page.waitForURL(/\/test\/app\/shipper$/);
    expect(await seasonNumbers(page)).toEqual({ savings: '0원', fee: '0원', gain: '0원' });
    const card = await expectLossCard(page);
    await expect(card.getByRole('listitem')).toHaveCount(1);
    await expect(card.getByRole('listitem').first()).toContainText('딸기 → ');
    await expectNoRawLotId(page);
    await expectNoSeriousAxe(page, '화주 홈(손실률 카드)');
  });
});

test('데모 화주 홈 시즌 카드 숫자가 정산 화면 합계와 같고 화주 화면에 원시 로트 id가 없다', async ({
  page,
}) => {
  await page.goto(LOGIN_PATH);
  await expect(page.getByRole('heading', { name: '데모 계정으로 둘러보기' })).toBeVisible();
  await page
    .getByRole('button', { name: /들어가기/ })
    .nth(1)
    .click();
  await page.waitForURL(/\/test\/app\/shipper/);

  const home = await seasonNumbers(page);
  expect(home.savings).not.toBe('0원');
  await expect(page.getByText(/내 파렛트 \d+ \/ 컨테이너 전체 \d+/)).toBeVisible();
  await expectLossCard(page);
  await expectNoRawLotId(page);
  await expectNoSeriousAxe(page, '화주 홈');
  await expectFitsMobile(page, '화주 홈');

  await menu(page, /^정산/).click();
  await page.waitForURL(/\/test\/app\/shipper\/settlements/);
  const main = page.getByRole('main').first();
  const stat = (label: string) =>
    main
      .locator('.m2-card')
      .filter({ has: page.locator('.m2-lbl', { hasText: label }) })
      .locator('.m2-num')
      .first();
  const flat = (text: string) => text.replace(/\s+/g, '');
  expect(flat(await stat('내 절감 합계').innerText())).toBe(home.savings);
  expect(flat(await stat('수수료').innerText())).toBe(home.fee);
  expect(flat(await stat('내 몫').innerText())).toBe(home.gain);
  await expect(
    main.getByRole('columnheader', { name: /비교 기준\s*혼자 항공으로 보냈다면 드는 예상 비용/ })
  ).toBeVisible();
  await expect(main.getByText(/실제 운영비|공개 운임/)).toHaveCount(0);
  await expect(main.getByRole('list', { name: '적용 규칙 설명' })).toBeVisible();
  await expectNoRawLotId(page);
  await expectNoSeriousAxe(page, '정산');
  await page.setViewportSize({ width: MOBILE_WIDTH, height: 844 });
  await expect(
    main.locator('.m2-lines').getByText('같이 실을 때 드는 예상 비용').first()
  ).toBeVisible();
  await expectNoSeriousAxe(page, '정산(390px)');
  await expectFitsMobile(page, '정산');

  await menu(page, /내 출하/).click();
  await page.waitForURL(/\/test\/app\/shipper\/lots/);
  await expect(page.getByRole('main').first().getByRole('row').nth(1)).toBeVisible();
  await expectLossColumn(page);
  await expectNoRawLotId(page);
  await expectNoSeriousAxe(page, '내 출하(데모)');
});

test('도착 검수 기록이 없는 출하는 예상 손실률을 기본값 가정으로 밝힌다', async ({ page }) => {
  await assumeDefaultLoss(page);
  await page.goto(LOGIN_PATH);
  await expect(page.getByRole('heading', { name: '데모 계정으로 둘러보기' })).toBeVisible();
  await page
    .getByRole('button', { name: /들어가기/ })
    .nth(1)
    .click();
  await page.waitForURL(/\/test\/app\/shipper/);

  const card = page.getByRole('region', { name: LOSS_CARD });
  await expect(card.getByRole('definition')).toHaveText(/^\d+\.\d%$/);
  const rows = card.getByRole('list', { name: '품목·목적지별 예상 손실률' }).getByRole('listitem');
  await expect(rows.first()).toContainText(/\d+\.\d%/);
  for (const chip of await rows.locator('.m2-chip').all()) {
    await expect(chip).toHaveText(ASSUMED_LOSS_CHIP);
    await expect(chip).toHaveClass(/m2-chip-warn/);
  }
  await expect(card.getByText(/학습 \d+건/)).toHaveCount(0);
  await expect(card.getByText(ASSUMED_LOSS_NOTE)).toBeVisible();
  await expectNoSeriousAxe(page, '화주 홈(손실률 가정)');
  await expectFitsMobile(page, '화주 홈(손실률 가정)');

  await menu(page, /내 출하/).click();
  await page.waitForURL(/\/test\/app\/shipper\/lots/);
  const main = page.getByRole('main').first();
  const cell = main
    .locator('tbody')
    .getByRole('row')
    .first()
    .getByRole('cell')
    .filter({ hasText: /\d+\.\d%/ });
  await expect(cell).toHaveCount(1);
  await expect(cell.locator('.m2-chip')).toHaveText(ASSUMED_LOSS_CHIP);
  await expect(main.locator('tbody .m2-chip-ok')).toHaveCount(0);

  const form = page.getByRole('region', { name: '새 출하 등록' });
  await form.getByLabel('출하 가능일').fill('2027-03-02');
  await expect(
    form.locator('.m2-lines > div').filter({ hasText: '예상 손실률 (해상)' }).locator('b')
  ).toHaveText(ASSUMED_LOSS_TEXT);
  await form.getByRole('button', { name: '출하 등록' }).click();
  await expect(
    main
      .getByRole('region', { name: '등록 결과' })
      .locator('.m2-lines > div')
      .filter({ hasText: '예상 손실률 (해상)' })
      .locator('b')
  ).toHaveText(ASSUMED_LOSS_TEXT);
  await expectNoSeriousAxe(page, '내 출하(손실률 가정)');
});

test('화주 정산 화면이 1024·1280·390px에서 가로로 넘치지 않는다', async ({ page }) => {
  await page.goto(LOGIN_PATH);
  await expect(page.getByRole('heading', { name: '데모 계정으로 둘러보기' })).toBeVisible();
  await page
    .getByRole('button', { name: /들어가기/ })
    .nth(1)
    .click();
  await page.waitForURL(/\/test\/app\/shipper/);
  await menu(page, /^정산/).click();
  await page.waitForURL(/\/test\/app\/shipper\/settlements/);
  await expect(page.getByRole('main').first().getByRole('table').first()).toBeVisible();

  for (const width of [1024, 1280, MOBILE_WIDTH]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `정산 ${width}px 가로 넘침(px)`).toBeLessThanOrEqual(0);
  }
});

test('화주 확인 대기 계획은 홈 이번 시즌 금액에서 빼고 제외 건수를 밝힌다', async ({ page }) => {
  await markPlansAwaitingShipper(page);
  await page.goto(LOGIN_PATH);
  await expect(page.getByRole('heading', { name: '데모 계정으로 둘러보기' })).toBeVisible();
  await page
    .getByRole('button', { name: /들어가기/ })
    .nth(1)
    .click();
  await page.waitForURL(/\/test\/app\/shipper/);

  const home = await seasonNumbers(page);
  expect(home).toEqual({ savings: '0원', fee: '0원', gain: '0원' });
  const card = page.getByRole('region', { name: '이번 시즌 내가 아낀 금액' });
  await expect(
    card.getByText(/^화주 확인 대기 \d+건 제외 \(확인 전 절감액은 합의 전 제안값\)$/)
  ).toBeVisible();
  await expect(card.getByText('내가 확인한 계획이 생기면 여기에 쌓입니다.')).toBeVisible();
  await expectNoSeriousAxe(page, '화주 홈(확인 대기)');
});

test('일부 계획만 화주 확인 대기면 홈 시즌 금액과 정산 합계가 같고 대기 계획은 따로 묶인다', async ({
  page,
}) => {
  await markPlansAwaitingShipper(page, { addPlan: true, awaitingIndexes: [1] });
  await page.goto(LOGIN_PATH);
  await expect(page.getByRole('heading', { name: '데모 계정으로 둘러보기' })).toBeVisible();
  await page
    .getByRole('button', { name: /들어가기/ })
    .nth(1)
    .click();
  await page.waitForURL(/\/test\/app\/shipper/);

  const home = await seasonNumbers(page);
  expect(home.savings).not.toBe('0원');
  const card = page.getByRole('region', { name: '이번 시즌 내가 아낀 금액' });
  await expect(
    card.getByText('화주 확인 대기 1건 제외 (확인 전 절감액은 합의 전 제안값)')
  ).toBeVisible();

  await menu(page, /^정산/).click();
  await page.waitForURL(/\/test\/app\/shipper\/settlements/);
  const main = page.getByRole('main').first();
  const stat = (label: string) =>
    main
      .locator('.m2-card')
      .filter({ has: page.locator('.m2-lbl', { hasText: label }) })
      .locator('.m2-num')
      .first();
  const flat = (text: string) => text.replace(/\s+/g, '');
  expect(flat(await stat('내 절감 합계').innerText())).toBe(home.savings);
  expect(flat(await stat('수수료').innerText())).toBe(home.fee);
  expect(flat(await stat('내 몫').innerText())).toBe(home.gain);
  await expect(
    main.locator('.m2-card').filter({ has: page.locator('.m2-lbl', { hasText: '내 절감 합계' }) })
  ).toContainText('확인 대기 1건 제외');

  const settled = main.getByRole('region', { name: '계획별 정산' });
  const confirmedTable = settled.getByRole('table').first();
  await expect(confirmedTable.locator('tbody tr')).toHaveCount(1);
  await expect(confirmedTable.getByText(ADDED_VESSEL)).toHaveCount(0);
  await expect(confirmedTable.getByText('확인 대기', { exact: true })).toHaveCount(0);

  const group = settled.getByRole('region', { name: '화주 확인 대기 (합의 전 제안값)' });
  await expect(
    group.getByRole('heading', { level: 3, name: '화주 확인 대기 (합의 전 제안값)' })
  ).toBeVisible();
  const awaitingTable = group.getByRole('table', { name: '화주 확인 대기 (합의 전 제안값)' });
  const awaitingRows = awaitingTable.locator('tbody tr');
  await expect(awaitingRows).toHaveCount(1);
  await expect(awaitingRows.first()).toContainText(ADDED_VESSEL);
  await expect(awaitingRows.first().getByText('확인 대기', { exact: true })).toBeVisible();
  await expect(awaitingRows.first()).toHaveClass(/is-dis/);
  await expectNoSeriousAxe(page, '정산(확인 대기 포함)');

  await page.setViewportSize({ width: 1024, height: 900 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, '정산(확인 대기 포함) 1024px 가로 넘침(px)').toBeLessThanOrEqual(0);

  await page.setViewportSize({ width: MOBILE_WIDTH, height: 844 });
  await expect(awaitingRows.first().getByText('확인 대기', { exact: true })).toBeVisible();
  await expect(
    awaitingRows.first().locator('.m2-lines').getByText('같이 실을 때 드는 예상 비용')
  ).toBeVisible();
  await expectNoSeriousAxe(page, '정산(확인 대기 포함, 390px)');
  await expectFitsMobile(page, '정산(확인 대기 포함)');
});
