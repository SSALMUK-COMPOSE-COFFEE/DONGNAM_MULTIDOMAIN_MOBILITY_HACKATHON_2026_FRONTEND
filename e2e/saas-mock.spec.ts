import { type Page, expect, test } from '@playwright/test';

const LOGIN_PATH = '/test/login';

const enterAs = async (
  page: Page,
  role: 'platform' | 'shipper' | 'forwarder',
  shipperOrgId?: string
) => {
  const banner = page.getByRole('region', { name: '데모 환경' });
  if ((await banner.count()) === 0) {
    await page.getByRole('button', { name: '데모로 둘러보기' }).click();
    await page.waitForURL(/\/test\/app\/platform/);
  }

  const home = page.getByRole('region', { name: '데모 환경' });

  if (role === 'platform') {
    const button = home.getByRole('button', { name: '플랫폼', exact: true });
    if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
  } else if (role === 'shipper') {
    const select = home.getByRole('combobox', { name: /^화주/ });
    const orgId = shipperOrgId ?? 'shipper-jinju';
    if ((await select.inputValue()) !== orgId) await select.selectOption(orgId);
  } else {
    const select = home.getByRole('combobox', { name: /^포워더/ });
    if ((await select.inputValue()) !== 'forwarder-dongnam') {
      await select.selectOption('forwarder-dongnam');
    }
  }

  await page.waitForURL(new RegExp(`/test/app/${role}`));
};

const logout = async (page: Page) => {
  await page.getByRole('button', { name: '로그아웃' }).click();
  await page.waitForURL(/\/test\/login/);
};

const menu = (page: Page, name: RegExp) =>
  page.getByRole('complementary', { name: '주 메뉴' }).getByRole('link', { name });

const expectPlatformPlanStatus = async (page: Page, status: '확정' | '변경 확정 대기') => {
  await menu(page, /공동적재 계획/).click();
  const row = page
    .getByRole('main')
    .first()
    .getByRole('row')
    .filter({ hasText: 'MV FRESH HARMONY' })
    .first();
  await expect(row.getByText(status, { exact: true })).toBeVisible();
};

test('목업 모드에서 화주 등록부터 포워더 확정까지 이어진다', async ({ page }) => {
  await page.goto(LOGIN_PATH);
  await expect(page.getByRole('heading', { name: '데모 계정으로 둘러보기' })).toBeVisible();

  await test.step('화주가 새 출하를 등록한다', async () => {
    await enterAs(page, 'shipper');
    const main = page.getByRole('main').first();
    await expect(main.getByRole('heading', { level: 1 })).toContainText('진주 딸기 수출농가 A');
    const registered = main.getByRole('row').filter({ hasText: '등록됨' });
    await expect(registered).toHaveCount(1);

    await main.getByRole('button', { name: '한 파렛트 늘리기' }).click();
    await main.getByRole('button', { name: '출하 등록' }).click();
    await expect(registered).toHaveCount(2);
    await logout(page);
  });

  await test.step('플랫폼이 출하 풀에서 계획을 만든다', async () => {
    await enterAs(page, 'platform');
    const main = page.getByRole('main').first();
    await expect(main.getByRole('heading', { name: '출하 풀' })).toBeVisible();
    await expect(main.getByRole('checkbox', { name: /lot-.* 선택$/ })).toHaveCount(3);

    await main.getByRole('checkbox', { name: '등록된 출하 모두 선택' }).check();
    await expect(main.getByRole('button', { name: '계획 생성' })).toBeEnabled();
    await main.getByRole('button', { name: '계획 생성' }).click();
    await page.waitForURL(/\/platform\/plans\/detail\?plan_id=/);

    await expect(main.getByRole('heading', { name: '포워더 배정' })).toBeVisible();
    await expect(main.getByRole('combobox', { name: '포워더' })).toHaveText('동남 콜드체인 포워딩');
    await expect(main.getByRole('img', { name: '20칸 중 17칸 적재' }).first()).toBeVisible();
  });

  await test.step('플랫폼이 감축 재최적화를 적용한다', async () => {
    const main = page.getByRole('main').first();
    await main.getByRole('button', { name: '한 파렛트 줄이기' }).click();
    await main.getByRole('button', { name: '한 파렛트 줄이기' }).click();
    await main.getByRole('button', { name: '진주 2파렛트 취소하고 다시 짜기' }).click();
    await expect(
      main.getByRole('heading', { name: /^3가지 안을 다시 계산했습니다/ })
    ).toBeVisible();

    await main.getByRole('button', { name: '이 안으로 적용' }).first().click();
    await expect(main.getByRole('button', { name: '적용됨' })).toBeVisible();
    await expect(main).toContainText(/실행 지시[\s\S]{0,80}화주 확인 대기/);
    await expectPlatformPlanStatus(page, '변경 확정 대기');
    await logout(page);
  });

  await test.step('당겨 실린 화주가 계획을 확정한다', async () => {
    await enterAs(page, 'shipper', 'shipper-miryang');
    const main = page.getByRole('main').first();
    await expect(main.getByText(/확정을 기다리는 계획이 1건/)).toBeVisible();

    await menu(page, /계획 확정/).click();
    await main.getByRole('link', { name: '확정하러 가기' }).click();
    await page.waitForURL(/\/shipper\/plans\/detail\?plan_id=/);

    await expect(
      main.getByRole('img', { name: /^CA-01 17\/20 파렛트, 내 출하 6, 다른 화주/ })
    ).toBeVisible();
    await expect(main).not.toContainText('진주 딸기 수출농가 A');
    await expect(main).not.toContainText('산청 딸기 수출농가 B');

    await main.getByRole('button', { name: '수락', exact: true }).click();
    await expect(main).toContainText(/실행 지시[\s\S]{0,80}포워더 확정 대기/);
    await logout(page);
  });

  await test.step('포워더가 실행 지시를 확정한다', async () => {
    await enterAs(page, 'forwarder');
    const main = page.getByRole('main').first();
    await expect(main.getByRole('link', { name: '확정할 실행 지시 1건' })).toBeVisible();

    await menu(page, /실행 지시/).click();
    await expect(main.getByRole('heading', { name: '실행 지시 v2' })).toBeVisible();
    await expect(main).toContainText('정산 금액 비공개');
    await expect(main).not.toContainText(/\d원/);

    await main.getByRole('button', { name: '실행 지시 확정' }).click();
    await expect(main.getByText(/내 확정 대기 0건 · 회신 대기 1건 · 끝난 지시 0건/)).toBeVisible();
    await expect(main.getByRole('button', { name: '확정됨 · v2' })).toBeVisible();

    const accept = main.getByRole('button', { name: '수락', exact: true });
    await expect(accept.first()).toBeVisible();
    while ((await accept.count()) > 0) {
      const remaining = await accept.count();
      await accept.first().click();
      await expect(accept).toHaveCount(remaining - 1);
    }

    await expect(
      main.getByText(/진행 중 0건 · 내 확정 대기 0건 · 회신 대기 0건 · 끝난 지시 1건/)
    ).toBeVisible();
    const done = main.getByRole('row').filter({ hasText: 'MV FRESH HARMONY' });
    await expect(done).toContainText('확정 완료');

    await done.getByRole('link', { name: '항차 상세' }).click();
    await page.waitForURL(/\/forwarder\/plans\/detail\?plan_id=/);
    await expect(main.getByRole('button', { name: '확정됨 · v2' })).toBeVisible();
    await expect(main.getByRole('button', { name: '수락', exact: true })).toHaveCount(0);
    await expect(main.getByRole('checkbox', { name: / 미완료$/ })).toHaveCount(0);
    await logout(page);
  });

  await test.step('플랫폼 목록에서 계획이 확정으로 바뀐다', async () => {
    await enterAs(page, 'platform');
    await expectPlatformPlanStatus(page, '확정');
  });
});

test('초대로 들어온 멤버도 관리자가 등록한 선과장 이후 출하를 보고 등록한다', async ({ page }) => {
  await page.goto(LOGIN_PATH);
  await expect(page.getByRole('heading', { name: '데모 계정으로 둘러보기' })).toBeVisible();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  const result = await page.evaluate(async () => {
    const call = async (method: string, path: string, body: unknown = null) => {
      const response = await fetch(`/test/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'freshswitch' },
        body: body === null ? null : JSON.stringify(body),
      });
      const text = await response.text();

      return { status: response.status, data: text ? JSON.parse(text) : null };
    };
    const stamp = Date.now();
    const admin = { email: `admin-${stamp}@example.com`, password: 'password-1', name: '관리자' };
    const member = { email: `member-${stamp}@example.com`, password: 'password-2', name: '멤버' };

    await call('POST', '/auth/signup', {
      ...admin,
      org_type: 'shipper',
      org_name: `초대 검증 농가 ${stamp}`,
    });
    const invitation = await call('POST', '/saas/org/invitations', { role: 'member' });
    await call('POST', '/auth/logout');
    await call('POST', '/auth/signup', { ...member, invite_code: invitation.data.code });
    await call('POST', '/auth/logout');

    await call('POST', '/auth/login', { email: admin.email, password: admin.password });
    const packhouse = await call('POST', '/saas/shipper/packhouses', {
      name: '검증 선과장',
      region: '경남 진주',
      product_ids: ['strawberry'],
    });
    await call('POST', '/auth/logout');

    const login = await call('POST', '/auth/login', {
      email: member.email,
      password: member.password,
    });
    const created = await call('POST', '/saas/shipper/lots', {
      product: 'strawberry',
      pallets: 2,
      ready_date: '2026-12-01',
      shipper: '',
      destination: 'Singapore',
      sell_window: 'normal',
      scenario_id: 'default',
    });
    const lots = await call('GET', '/saas/shipper/lots');

    return {
      invitation: invitation.status,
      packhouse: packhouse.status,
      login: login.status,
      created: created.status,
      lots: Array.isArray(lots.data) ? lots.data.length : -1,
    };
  });

  expect(result).toEqual({ invitation: 201, packhouse: 201, login: 200, created: 201, lots: 1 });
});

test('목업 모드에서 세 역할이 같은 컨테이너의 콜드체인을 자기 범위로 본다', async ({ page }) => {
  await page.goto(LOGIN_PATH);

  await test.step('플랫폼이 조치를 수락·완료하고 측정 기록을 내려받는다', async () => {
    await enterAs(page, 'platform');
    await menu(page, /콜드체인 관제/).click();
    await page.waitForURL(/\/platform\/coldchain/);
    const main = page.getByRole('main').first();
    await expect(main.getByText('열린 조치 4건', { exact: true })).toBeVisible();

    await main
      .getByRole('button', { name: /조치 수락$/ })
      .first()
      .click();
    await expect(main.getByText('수락됨', { exact: true }).first()).toBeVisible();
    await expect(main.getByText('열린 조치 4건', { exact: true })).toBeVisible();

    await main
      .getByRole('button', { name: /조치 완료$/ })
      .first()
      .click();
    await expect(main.getByText('열린 조치 3건', { exact: true })).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      main.getByRole('button', { name: '측정 기록 CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('CA-01-readings.csv');
    await logout(page);
  });

  await test.step('포워더는 조치를 보지만 금액은 보지 않는다', async () => {
    await enterAs(page, 'forwarder');
    await menu(page, /콜드체인/).click();
    await page.waitForURL(/\/forwarder\/coldchain/);
    const main = page.getByRole('main').first();
    await expect(main.getByRole('button', { name: /조치 완료$/ }).first()).toBeVisible();
    await expect(main.getByText('요청 문장').first()).toBeVisible();
    await expect(main).not.toContainText(/\d원/);
    await logout(page);
  });

  await test.step('화주는 내 화물 상태에서 자기 로트만 본다', async () => {
    await enterAs(page, 'shipper');
    await page.goto('/test/app/shipper/coldchain');
    const main = page.getByRole('main').first();
    await expect(main.getByRole('heading', { name: '내 화물 상태' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'CA-01 품온 · 전원' })).toBeVisible();
    await expect(main.locator('td[title="lot-jinju-sb-1"]')).toHaveText(
      /^딸기 \d{2}\/\d{2} · \d+파렛트$/
    );
    await expect(main).not.toContainText('lot-jinju-sb-1');
    await expect(main).not.toContainText('lot-sancheong-sb-1');
    await expect(main).not.toContainText('lot-miryang-sb-1');
    await expect(main.getByRole('button', { name: /조치 (수락|완료)$/ })).toHaveCount(0);
    await expect(main.getByRole('button', { name: '측정 기록 CSV' })).toBeEnabled();
  });
});

test('목업 모드에서 플랫폼만 데모 초기화를 하고 쿨다운 동안 남은 초를 본다', async ({ page }) => {
  const banner = page.getByRole('region', { name: '데모 환경' });
  const resetButton = banner.getByRole('button', { name: /데모 초기화|초 뒤 다시 초기화/ });
  const remainingSeconds = async () => {
    const match = (await resetButton.textContent())?.match(/^(\d+)초 뒤 다시 초기화$/);
    expect(match).not.toBeNull();

    return Number(match?.[1]);
  };

  await page.clock.install();
  await page.goto(LOGIN_PATH);

  await test.step('화주와 포워더에게는 초기화 버튼이 없다', async () => {
    await enterAs(page, 'shipper');
    await expect(banner).toBeVisible();
    await expect(resetButton).toHaveCount(0);
    await logout(page);

    await enterAs(page, 'forwarder');
    await expect(banner).toBeVisible();
    await expect(resetButton).toHaveCount(0);
    await logout(page);
  });

  await test.step('플랫폼이 확인 창을 거쳐 초기화하면 플랫폼 홈에 남는다', async () => {
    await enterAs(page, 'platform');
    await expect(resetButton).toHaveText('데모 초기화');
    await resetButton.click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('다른 사람');
    await expect(dialog).not.toContainText('모든 데모 사용자가 로그아웃');
    await dialog.getByRole('button', { name: '초기화', exact: true }).click();
    await expect(page).toHaveURL(/\/test\/app\/platform/);
    await expect(resetButton).toHaveText(/^\d+초 뒤 다시 초기화$/);
    await expect(resetButton).toBeDisabled();
  });

  await test.step('쿨다운 동안 버튼이 꺼지고 남은 초가 줄어든다', async () => {
    const before = await remainingSeconds();
    await page.clock.runFor(3000);
    await expect.poll(remainingSeconds).toBeLessThan(before);
  });

  await test.step('새로고침해도 버튼은 꺼진 채 남은 초를 보여 준다', async () => {
    await page.reload();
    await expect(resetButton).toHaveText(/^\d+초 뒤 다시 초기화$/);
    await expect(resetButton).toBeDisabled();
  });

  await test.step('남은 초를 모르는 화면에서 누르면 429의 남은 초로 버튼이 꺼진다', async () => {
    await page.evaluate(() => localStorage.removeItem('fs.saas.sandbox-reset-until:wmock00000001'));
    await page.reload();
    await expect(resetButton).toHaveText('데모 초기화');
    await resetButton.click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: '초기화', exact: true })
      .click();

    await expect(page.getByText(/방금 초기화했습니다\. \d+초 뒤에 다시 시도하세요/)).toBeVisible();
    await expect(resetButton).toHaveText(/^\d+초 뒤 다시 초기화$/);
    await expect(resetButton).toBeDisabled();
    await expect(page).toHaveURL(/\/test\/app\/platform/);
  });

  await test.step('쿨다운이 끝나면 버튼이 다시 켜진다', async () => {
    await page.clock.runFor(61_000);
    await expect(resetButton).toHaveText('데모 초기화');
    await expect(resetButton).toBeEnabled();
  });
});

test('목업 모드에서 포워더가 실행 카드에 번호를 넣고 VGM·젯셋·요청 서류를 본다', async ({
  page,
}) => {
  await page.goto(LOGIN_PATH);

  await test.step('플랫폼이 감축 재최적화를 적용한다', async () => {
    await enterAs(page, 'platform');
    await menu(page, /공동적재 계획/).click();
    const main = page.getByRole('main').first();
    await main
      .getByRole('row')
      .filter({ hasText: 'MV FRESH HARMONY' })
      .first()
      .getByRole('link', { name: '상세' })
      .click();
    await page.waitForURL(/\/platform\/plans\/detail\?plan_id=/);

    await main.getByRole('button', { name: '한 파렛트 줄이기' }).click();
    await main.getByRole('button', { name: '한 파렛트 줄이기' }).click();
    await main.getByRole('button', { name: '진주 2파렛트 취소하고 다시 짜기' }).click();
    await main.getByRole('button', { name: '이 안으로 적용' }).first().click();
    await expect(main.getByRole('button', { name: '적용됨' })).toBeVisible();
    await logout(page);
  });

  await test.step('포워더가 실행 카드에서 번호를 저장한다', async () => {
    await enterAs(page, 'forwarder');
    const main = page.getByRole('main').first();
    await main
      .getByRole('row')
      .filter({ hasText: 'MV FRESH HARMONY' })
      .first()
      .getByRole('link', { name: '상세' })
      .click();
    await page.waitForURL(/\/forwarder\/plans\/detail\?plan_id=/);

    const card = main.getByRole('article', { name: 'CA-01 실행 카드' });
    const mockChips = card.getByText('가상 번호', { exact: true });
    await expect(mockChips).toHaveCount(3);
    await expect(card).toContainText('아직 입력하지 않았습니다');

    await card.getByLabel('컨테이너 번호').fill('CSQU3054384');
    await card.getByRole('button', { name: '번호 저장' }).click();
    await expect(
      page.getByText(
        '컨테이너 번호 체크디지트가 틀립니다: CSQU305438의 체크디지트는 3입니다(올바른 번호 CSQU3054383)'
      )
    ).toBeVisible();
    await expect(mockChips).toHaveCount(3);

    await card.getByLabel('부킹 번호').fill('BK-FS-0001');
    const containerInput = card.getByLabel('컨테이너 번호');
    await containerInput.fill('CSQU3054383');
    await containerInput.press('Enter');
    await expect(page.getByText('CA-01 실행 번호를 저장했습니다.')).toBeVisible();
    await expect(mockChips).toHaveCount(1);
    await expect(card).toContainText(/입력 \d{2}\.\d{2}|입력 \d/);
    await expect(containerInput).toHaveValue('CSQU3054383');
    await expect(containerInput).toBeFocused();

    const second = main.getByRole('article', { name: 'CA-02 실행 카드' });
    await second.getByLabel('컨테이너 번호').fill('TGHU1234567');
    await second.getByRole('button', { name: '번호 저장' }).click();
    await expect(page.getByText('CA-02 실행 번호를 저장했습니다.')).toBeVisible();
  });

  await test.step('VGM 가정 항목·젯셋 사전 배정·요청 서류 종류를 보고 금액은 보지 않는다', async () => {
    const main = page.getByRole('main').first();
    const vgm = main.getByRole('table', { name: 'CA-01 VGM 항목' });
    await expect(vgm.getByRole('row', { name: /^컨테이너 자중/ })).toContainText('가정');
    await expect(vgm.getByRole('row', { name: /^화물 순중량/ })).not.toContainText('가정');
    await expect(main.getByRole('article', { name: 'CA-01 실행 카드' })).toContainText(
      /VGM [\d,]+kg = 화물 순중량/
    );

    const gensets = main.getByRole('list', { name: '배터리 젯셋 사전 배정' });
    await expect(gensets).toContainText('[배터리 젯셋 사전 배정]');
    await expect(gensets).toContainText('CA-02(TGHU1234567)');
    const documents = main.getByRole('list', { name: '외부 요청 서류' });
    const correction = documents
      .getByRole('listitem')
      .filter({ has: page.getByText('SI·VGM 정정', { exact: true }) });
    await expect(correction.first()).toBeVisible();
    await expect(correction.filter({ hasText: '부킹 변경' })).toHaveCount(0);
    await expect(main.getByRole('region', { name: '컨테이너 실행 카드' })).not.toContainText(
      /\d\s*원/
    );
  });
});

test('다른 탭에서 로그인·로그아웃하면 기존 탭이 새 세션을 따라간다', async ({ context, page }) => {
  await page.goto(LOGIN_PATH);
  const pinned = page.waitForRequest(
    request => request.url().includes('/api/saas/') && !!request.headers()['x-org-id']
  );
  await enterAs(page, 'shipper');
  const main = page.getByRole('main').first();
  await expect(main.getByRole('heading', { level: 1 })).toContainText('진주 딸기 수출농가 A');
  expect((await pinned).headers()['x-org-id']).toBe('shipper-jinju');

  const other = await context.newPage();
  await other.goto(LOGIN_PATH);
  await enterAs(other, 'platform');

  await page.waitForURL(/\/test\/app\/platform/);
  await expect(page.getByRole('main').first().getByRole('heading', { level: 1 })).not.toContainText(
    '진주 딸기 수출농가 A'
  );

  await logout(other);
  await page.waitForURL(/\/test\/login/);
});

test('다른 탭이 조직을 바꾼 신호를 보내면 기존 탭이 저장된 조직으로 me 를 다시 읽는다', async ({
  context,
  page,
}) => {
  await page.goto(LOGIN_PATH);
  await enterAs(page, 'shipper');
  await expect(page.getByRole('main').first().getByRole('heading', { level: 1 })).toContainText(
    '진주 딸기 수출농가 A'
  );

  const other = await context.newPage();
  await other.goto(LOGIN_PATH);

  const reread = page.waitForRequest(
    request =>
      new URL(request.url()).pathname.endsWith('/api/me') &&
      request.headers()['x-org-id'] === 'shipper-switched'
  );
  await other.evaluate(() => {
    localStorage.setItem(
      'fs.saas.org',
      JSON.stringify({ state: { orgId: 'shipper-switched' }, version: 0 })
    );
    new BroadcastChannel('fs.saas.session').postMessage({ kind: 'switch', at: Date.now() });
  });

  await reread;
  await expect(page.getByRole('main').first().getByRole('heading', { level: 1 })).toContainText(
    '진주 딸기 수출농가 A'
  );
});
