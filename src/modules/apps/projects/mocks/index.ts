// "Screenshots" for the project documents, by shot kind: Verifikat and Kompi screens rebuilt in HTML from the real
// products (verifikat.ts, kompi.ts), and real screenshots of the Wax site.
import type { Lang } from '../../../../types';
import { esc } from '../../../desktop/dom';
import waxLanding from '../../../../assets/wax-landing.jpg?inline';
import waxReveal from '../../../../assets/wax-reveal.jpg?inline';
import { kompyPdf, kompyQuiz, kompyReport } from './kompi';
import { batches, exports, verify } from './verifikat';

/** An SVG frame of the document's 480 x 300 picture slot. */
function frame(body: string, bg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" class="xpa-mock-svg" role="img"><rect width="480" height="300" fill="${bg}"/>${body}</svg>`;
}

const photo = (src: string) => (): string => frame(`<image href="${src}" width="480" height="300"/>`, '#000');

export type MockFn = (lang: Lang) => string;

export const MOCKS: Readonly<Record<string, MockFn>> = {
  verify,
  batches,
  exports,
  'wax-landing': photo(waxLanding),
  'wax-reveal': photo(waxReveal),
  'kompy-quiz': kompyQuiz,
  'kompy-report': kompyReport,
  'kompy-pdf': kompyPdf,
};

/** A shot whose kind has no drawing yet: a plain frame with its title. */
export function genericMock(lang: Lang, title?: string): string {
  return frame(
    '<rect x="40" y="40" width="400" height="220" rx="6" fill="#fff" stroke="#cfd6df"/>' +
      `<text x="240" y="155" text-anchor="middle" font-family="Tahoma,Verdana,sans-serif" font-size="14" fill="#6b7785">${esc(title ?? (lang === 'ru' ? 'Скриншот скоро' : 'Screenshot soon'))}</text>`,
    '#eef1f6',
  );
}
