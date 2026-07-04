# Qortium Profile Manager

A profile and stats Q-App for the Qortium ecosystem. Set a bio and status tied to your Qortium name, view account stats (minting level, blocks minted, balance, groups, names, QDN resources), and look up stats for any other account on the network.

Built to be forked — see [Naming](#naming) below.

## Build

```
npm install
npm run build
```

Output is a single HTML file at `dist/index.html`, ready to publish as a Qortium APP.

## Home Display Settings

When launched from Qortium Home, the app reads display settings from render URL
params and live `postMessage` events: `theme`, `accent`, `textSize`, `lang`, and
`uiStyle`.

`uiStyle` supports `classic` and `modern`. Missing or unknown values default to
`classic`, matching Home's QDN app contract. Classic uses the bundled Lexend font,
Home-style green-tinted tokens, and wider layouts; Modern preserves the original
MUI/Inter-centered design.

When changing app styling, keep the existing `useIframeListener` -> state atoms ->
theme/token provider path intact, and verify both styles with `npm run build`.

## Naming

The name this app publishes under is set in `src/apps.ts`:

```ts
profile: { qdn: 'Profile', label: 'Profile' },
```

Change `qdn` to whatever name you've registered on your network, then publish under that name. Update the same registry entry in any other apps that link to this one.
