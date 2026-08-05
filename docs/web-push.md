# Web Push Notifications

Free push notifications delivered to the browser via the [Web Push Protocol](https://developer.mozilla.org/en-US/docs/Web/API/Push_API),
powered by the [`web-push`](https://www.npmjs.com/package/web-push) library and VAPID keys — no third-party service required.

## How it works

1. The frontend registers a **service worker** and calls the browser `PushManager.subscribe()` API
   using our VAPID public key. The browser returns a **push subscription** (endpoint + keys).
2. The frontend sends that subscription to `POST /api/v1/push/subscriptions`.
3. Notifications are delivered automatically: every in-app notification created through
   `NotificationService.create()` (e.g. the welcome notification) is also sent as a web push to the
   recipient's subscribed devices. You can also push ad-hoc via `POST /api/v1/push/send`.
4. The server pushes the message through the browser's push service (Chrome/Firefox/Edge/Safari's
   own free infrastructure) and the service worker displays it.

## Setup

1. Generate VAPID keys once and keep them:

   ```bash
   pnpm generate:vapid
   ```

2. Add them to your `.env` (see `.env.example`):

   ```env
   VAPID_SUBJECT=mailto:noreply@nodist.dev   # must be a mailto: or https: URL
   VAPID_PUBLIC_KEY=your-public-key
   VAPID_PRIVATE_KEY=your-private-key
   ```

   The server validates these at boot — the app will refuse to start if they are missing.

## API

Base URL: `{API_PREFIX}/push` (default `/api/v1/push`)

| Method | Endpoint              | Auth | Description                                            |
| ------ | --------------------- | ---- | ------------------------------------------------------ |
| GET    | `/vapid-public-key`   | No   | VAPID public key the frontend needs to subscribe       |
| POST   | `/subscriptions`      | Yes  | Register a device subscription                         |
| GET    | `/subscriptions`      | Yes  | List the current user's subscriptions                  |
| DELETE | `/subscriptions/:id`  | Yes  | Remove a subscription (owner only)                     |
| POST   | `/send`               | Yes  | Send a push to the user (admins can target any user via `recipient`. This route for testing right now) |

### Register a subscription

```json
POST /api/v1/push/subscriptions
Authorization: Bearer <accessToken>

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": { "p256dh": "...", "auth": "..." },
  "userAgent": "Mozilla/5.0 ..."
}
```

### Send a push notification

```json
POST /api/v1/push/send
Authorization: Bearer <accessToken>

{
  "title": "New message",
  "message": "You have a new message from Parvej",
  "url": "/inbox/123",
  "data": { "entity": "message", "entityId": "123" }
}
```

> This endpoint is for ad-hoc pushes. When you create an in-app notification via
> `NotificationService.create({ recipient, type, title, message, data })`, a web push is sent
> to that recipient's devices automatically (its `title`, `message`, and `data` are forwarded).

Response: `{ "success": true, "data": { "sent": 1, "failed": 0, "removedExpired": 0 } }`
Subscriptions that the push service reports as invalid (HTTP 404/410) are automatically removed.

## Frontend integration

A sample service worker is served at `/sw.js` (see `public/sw.js`). Copy it into your frontend's
public folder (it must live on the same origin as your page), then:

```js
// 1. Register the service worker
const registration = await navigator.serviceWorker.register('/sw.js');
await navigator.serviceWorker.ready;

// 2. Fetch our VAPID public key
const { data } = await fetch('/api/v1/push/vapid-public-key').then((r) => r.json());

// 3. Subscribe the browser to push
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(data.publicKey),
});

// 4. Send the subscription to our API
await fetch('/api/v1/push/subscriptions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify(subscription),
});
```

`PushManager.subscribe` requires a secure context (HTTPS or `localhost`) and the
`applicationServerKey` must be the **base64-encoded** VAPID public key converted to a
`Uint8Array` (use any of the well-known `urlBase64ToUint8Array` helpers — see
[MDN's example](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe#examples)).

> **Note for cross-origin frontends:** if your frontend runs on a different origin than this API,
> the service worker must be hosted by the frontend origin (where your pages live). The `/sw.js`
> file here is a ready-made reference to copy.
