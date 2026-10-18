# Segra feedback service

The public GitHub Pages site uses a separate Sites/Vinext service for shared feedback storage.

- Site project: `appgprj_6ad4f5e563008191ac9a9fb77d75b9ee`
- Service origin: https://segra-community-feedback.chibangarx.chatgpt.site
- D1 binding: `DB`
- API: `/api/feedback` (GET public feed, POST new message); `/api/feedback/token` (short-lived submission capability)
- Runtime secrets: `FEEDBACK_TOKEN_SECRET`, `FEEDBACK_ADMIN_SECRET`. Configure with native Sites environment tools; never commit or put these values in frontend code.

To edit the server, use the Sites skill to open the existing project by the exact project ID above. Preserve its public audience and D1 migration history. Source is saved in that project's source repository.

Moderation uses `DELETE /api/feedback?id=<message-id>` with `Authorization: Bearer <FEEDBACK_ADMIN_SECRET>`. This soft-hides the message (`hidden=1`) and preserves the database record. Obtain/rotate the secret through the owner's Sites environment tools; do not expose it in a browser or commit it. The feed never returns client hashes or submission nonces.

Submission limits: name 2–40 chars; message 10–1500; fixed categories; empty honeypot; signed token; 2-second minimum delay; one-hour expiry; maximum five stored submissions per daily visitor hash per hour. IP-based HMAC is used only for abuse limiting, and raw IPs are not saved in D1. The platform may share a proxy address, so limits may apply to visitors on the same network. Duplicate retries with the same nonce return the original record.

Messages are public and anonymous; users must acknowledge public visibility in the form. No accounts, email collection or locally fabricated reviews are used. The initial technical QA message was soft-hidden after verification.

The release `v1.9.21` already recognises FiveM through the GTA integration and the remote games catalogue. This website update documents that existing support; it does not replace the installed executable or promise automatic kill detection on every RP server HUD.
