<?php
// A TEMPLATE of the private copy of the analytics' Telegram settings. Nothing runs PHP any more: the host serves files
// only, and the analytics are the Cloudflare Worker in worker/, which takes these values as secrets (README,
// «Analytics and notifications»):
//
//   cd worker
//   npx wrangler secret put TG_TOKEN       # tg_token below
//   npx wrangler secret put TG_CHAT_ID     # tg_chat_id below
//   npx wrangler secret put DIGEST_KEY     # the key of GET /digest?key=...
//
// The copy lives on the host OUTSIDE the site's folder, where the deploy never writes and the web never serves it:
//
//   <home>/donya-private/analytics.php       (the site is <home>/www/donya.dev; <home> is the FTP login's home)
//
// (folder 700, file 600). It is only a place to keep the values: to set the secrets again, download it over FTP and
// pipe each value into `wrangler secret put` without printing it. Never commit the real values.
return [
    // the Telegram bot (@BotFather) and the chat its messages go to: write anything to the bot, open
    // https://api.telegram.org/bot<token>/getUpdates and take result[0].message.chat.id
    'tg_token' => '123456789:REPLACE-WITH-THE-BOT-TOKEN',
    'tg_chat_id' => '123456789',
];
