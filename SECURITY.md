# Security

## Reporting a problem

Please do **not** open a public issue for a security problem. Report it privately through GitHub: the **Security** tab of this repository → **Report a vulnerability**. You will get a reply as soon as the maintainer can, usually within a week.

Please include what you found, how to reproduce it, and what an attacker could do with it.

## What is in scope

Motionhaus runs on your own Mac and handles your accounts, so these matter most:

- Anything that could leak a channel's login (Instagram page token, YouTube refresh token, Meta or Google app secret), for example into a log, a video, a commit or another channel's folder.
- Anything that lets one channel post with another channel's login.
- Ways for content the unattended maker reads (a web page, a README, a feed) to make it post, publish, sign in, change timers, or read or write outside its channel's folder.
- Command injection through file names, captions, story titles or feed content.

## Keeping your own setup safe

- Logins live in `~/.config/motionhaus/channels/<channel>.env` (mode 600) and the shared `.env`, both outside version control. Never commit them, paste them into issues, or share logs without checking them.
- If a token may have leaked, revoke it: remove the app from your Facebook or Google account settings and sign in again with `shorts insta-auth` or `shorts auth`.
- Keep the unattended maker's permission settings as shipped; they are what keeps it inside its channel folder.

## Supported versions

Only the latest commit on `main` gets fixes.
