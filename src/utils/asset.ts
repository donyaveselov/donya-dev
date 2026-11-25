// The files of public/ at runtime. The site has them at its root ('/'), so that a page one folder down (/resume)
// finds them too; the artifact build keeps them next to its page ('./'). See `base` in vite.config.ts.
export const asset = (path: string): string => `${import.meta.env.BASE_URL}${path}`;
