import { describe, expect, it } from 'vitest';
import { DEFAULT_ROUTE, ROUTES } from '../modules/room/routes';
import { routeName, routeOf } from './router.service';

describe('routeOf', () => {
  it('is the plain room for no route or an unknown one', () => {
    for (const name of ['', 'nonsense', 'toString', 'constructor', 'debug'])
      expect(routeOf(name), name).toEqual(DEFAULT_ROUTE);
  });
  it('lays a route over the plain room', () => {
    expect(routeOf('night')).toEqual({ ...DEFAULT_ROUTE, preview: 1.5 });
    expect(routeOf('pcdota')).toEqual({ ...DEFAULT_ROUTE, sit: 'desktop', forced: 'play', game: 'dota' });
    expect(routeOf('resume')).toEqual({ ...DEFAULT_ROUTE, resume: true });
  });
});

describe('routeName', () => {
  it('reads the path in every form the host serves a route folder', () => {
    expect(routeName('/resume', '')).toBe('resume');
    expect(routeName('/resume/', '')).toBe('resume');
    expect(routeName('/resume/index.html', '')).toBe('resume');
    expect(routeName('/', '')).toBe('');
  });
  it('lets an old link hash win, but not a bare #', () => {
    expect(routeName('/', '#resume')).toBe('resume');
    expect(routeName('/night', '#pc')).toBe('pc');
    expect(routeName('/night', '#')).toBe('night');
  });
});

describe('the route table', () => {
  it('is plain folder names (the build writes a page for each)', () => {
    for (const name of Object.keys(ROUTES)) expect(name).toMatch(/^[a-z0-9]+$/);
  });
});
