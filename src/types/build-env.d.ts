// Constants the build puts into the code (vite.config.ts, `define`).

/** md5[:10] of public/room.json: the model is fetched as room.json?v=<this>. */
declare const __ROOM_VERSION__: string;

/** The artifact build routes by the hash (#resume), the site by the path (/resume): see src/modules/room/routes.ts. */
declare const __HASH_ROUTES__: boolean;
