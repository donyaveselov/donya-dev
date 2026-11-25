<?php
// The analytics' private configuration: a TEMPLATE. The real file lives on the host OUTSIDE the site's folder, where
// the deploy never writes and the web never serves it:
//
//   <home>/donya-private/analytics.php       (the site is <home>/www/donya.dev; <home> is the FTP login's home)
//
// To set it up (README, «Аналитика и уведомления»):
//   1. In ISPmanager's file manager (or over FTP) create the folder donya-private next to www (not inside it), with
//      permissions 700, and copy this file into it as analytics.php, permissions 600.
//   2. Fill in tg_token (from @BotFather) and tg_chat_id: write anything to the bot, open
//      https://api.telegram.org/bot<token>/getUpdates in a browser and take result[0].message.chat.id.
//   3. Set digest_key to a long random string (e.g. `openssl rand -hex 24`) if the digest is run over HTTP.
// The folders logs/ and state/ are created next to this file on the first event.
//
// Never commit the real values. Another path for this file: the DONYA_ANALYTICS_CONFIG environment variable.
return [
    // false: collect.php takes the events and does nothing with them (no log, no message)
    'enabled' => true,

    // the Telegram bot and the chat its messages go to
    'tg_token' => '123456789:REPLACE-WITH-THE-BOT-TOKEN',
    'tg_chat_id' => '123456789',

    // a message per visit (true) or only the log and the daily digest (false)
    'notify' => true,

    // the hour (Phuket time, 0-23) the daily digest is sent in; the cron calls digest.php every hour
    'digest_hour' => 9,

    // the secret for https://donya.dev/api/digest.php?key=... (not needed when cron runs it with the php binary)
    'digest_key' => 'REPLACE-WITH-A-LONG-RANDOM-STRING',

    // the pages allowed to send events
    // 'allowed_origins' => ['https://donya.dev', 'https://www.donya.dev'],

    // where the logs and the state go (default: logs/ and state/ next to this file)
    // 'log_dir' => __DIR__ . '/logs',
    // 'state_dir' => __DIR__ . '/state',

    // testing: no Telegram calls, the messages are appended to <log_dir>/telegram.log instead
    // 'dry_run' => true,
];
