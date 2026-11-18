import { initialState } from '../src/types/game';
import { test, expect } from './helpers/test';

// Keep signaling local: these tests own layout and button wiring, not WebRTC.
const peerModule = `
class Emitter {
  handlers = {};
  on(name, handler) { (this.handlers[name] ??= []).push(handler); return this; }
  emit(name, value) { for (const handler of this.handlers[name] ?? []) handler(value); }
}
export default class Peer extends Emitter {
  destroyed = false;
  disconnected = false;
  constructor(id) {
    super(); this.id = id;
    window.connectLayoutGuest = () => {
      const conn = new Emitter();
      conn.peer = 'layout-guest'; conn.open = false;
      conn.send = () => {};
      conn.close = () => { conn.open = false; conn.emit('close'); };
      this.emit('connection', conn); conn.open = true; conn.emit('open');
    };
    setTimeout(() => this.emit('open', id), 0);
  }
  destroy() { this.destroyed = true; }
}`;

for (const { locale, width } of ['ja-JP', 'en-US'].flatMap(locale => [900, 1440].map(width => ({ locale, width })))) {
  test.describe(`${locale} ${width}px`, () => {
    test.use({ locale, viewport: { width, height: 720 } });
    for (const waitingPlayer of ['host', 'guest'] as const) {
      test(`keeps End Stop actions compact when ${waitingPlayer} is waiting`, async ({ page }, testInfo) => {
        await page.route('**/node_modules/.vite/deps/peerjs.js*', route => route.fulfill({ contentType: 'text/javascript', body: peerModule }));
        await page.addInitScript(({ state }) => {
          sessionStorage.setItem('sv-evolve:host-session:versioned:LAYOUT', JSON.stringify({
            sessionSchemaVersion: 1, room: 'LAYOUT', appVersion: '1.1.1', savedAt: '2026-11-19T00:00:00Z', state,
          }));
        }, { state: { ...initialState, gameStatus: 'playing', turnPlayer: waitingPlayer,
          endStop: { host: waitingPlayer === 'guest', guest: waitingPlayer === 'host' },
          pendingEndTurn: waitingPlayer === 'guest' ? 'guest' : null } });
        await page.goto('/game?host=true&room=LAYOUT');
        await page.waitForFunction(() => typeof (window as unknown as { connectLayoutGuest?: unknown }).connectLayoutGuest === 'function');
        await page.evaluate(() => (window as unknown as { connectLayoutGuest: () => void }).connectLayoutGuest());
        await page.getByRole('button', { name: locale === 'ja-JP' ? 'セッションを復帰する' : 'Resume Previous Session' }).click();
        const finish = page.getByRole('button', { name: locale === 'ja-JP' ? '処理完了・ターンを受け取る' : 'Finish Quick Actions & Start Turn' });
        const request = page.getByRole('button', { name: locale === 'ja-JP' ? '終了をリクエスト' : 'Request End Turn' });
        const button = waitingPlayer === 'guest' ? finish : request;
        await expect(button).toBeEnabled();
        await expect(button).toHaveCSS('white-space', 'nowrap');
        expect(await button.evaluate(element => parseFloat(getComputedStyle(element).height))).toBeCloseTo(28, 1);
        const buttonHeight = (await button.boundingBox())!.height;
        expect(buttonHeight).toBeLessThanOrEqual(28);
        expect(await button.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath('end-stop.png'), fullPage: true });
        const section = page.getByTestId('board-section-bottom');
        const heightBefore = (await section.boundingBox())!.height;
        if (waitingPlayer === 'guest') {
          await expect(button.getByRole('status')).toBeVisible();
          await button.click();
          await expect(finish).toHaveCount(0);
        } else {
          await button.click();
          const cancel = page.getByRole('button', { name: locale === 'ja-JP' ? '終了要求を取り消す' : 'Cancel End Request' });
          await expect(cancel).toBeEnabled();
          expect((await cancel.boundingBox())!.height).toBeCloseTo(buttonHeight, 1);
          await cancel.click();
          await expect(request).toBeEnabled();
        }
        expect((await section.boundingBox())!.height).toBe(heightBefore);
      });
    }
  });
}
