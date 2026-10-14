# Hep Tam Ekran

A small Firefox extension that opens Firefox in fullscreen mode (the same mode as pressing **F11**) every time the browser starts and whenever a new window is opened.

*"Hep Tam Ekran" is Turkish for "Always Fullscreen".*

## Why

I wanted to create my own add-on that switches Firefox to fullscreen every time I open it.

## Features

- Switches every browser window to fullscreen when Firefox starts, including windows brought back by session restore.
- Switches every new window to fullscreen (Ctrl+N, a tab dragged out into its own window, and so on).
- Leaves these windows alone:
  - private windows
  - small popup windows opened by websites, such as "Sign in with Google"
  - minimized windows
- Respects the user: if you leave fullscreen with F11, the extension does not force you back. It only acts at startup, on first install, and on new windows.
- Requests no permissions and collects no data.

## Installation

### Signed version (recommended)

1. Download the signed `.xpi` file from the [Releases](../../releases) page.
2. Drag the file onto a Firefox window and click **Add**.

The add-on is signed by Mozilla for self-distribution, so it stays installed in regular Firefox releases.

### Temporary install (for development)

1. Clone or download this repository.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…** and select `manifest.json`.

A temporary add-on is removed when Firefox is closed.

## How it works

The whole extension is one background script, [`background.js`](background.js). It listens for three events:

| Event | When it fires | What the extension does |
|---|---|---|
| `runtime.onStartup` | Firefox starts | Switches all eligible windows to fullscreen |
| `runtime.onInstalled` (`reason: "install"`) | The extension is installed | Same as above, so the result is visible right away |
| `windows.onCreated` | A new window opens | Switches that window to fullscreen |

Fullscreen is set with `browser.windows.update(id, { state: "fullscreen" })`. In Firefox this triggers the same fullscreen mode as the F11 key.

## Design decisions

- **Using the API instead of simulating an F11 key press.** F11 is a toggle. A simulated key press would turn fullscreen *off* on a window that is already fullscreen. The API sets a target state instead, and the extension first checks the current state.
- **Skipping popups by window type.** Firefox reports website popups (windows opened without a toolbar) as `type: "popup"`, so only windows with `type: "normal"` are changed.
- **Rechecking new windows.** Firefox keeps setting up a new window for a short time after it is created and can reset the window's state during that time. The extension therefore checks the window again after 0.5 s and 1.5 s and reapplies fullscreen if needed.
- **No sweep when the background script restarts.** Manifest V3 background scripts in Firefox are event pages: they are suspended when idle and restarted when an event arrives. If the script switched *all* windows to fullscreen every time it started, a window the user had left with F11 would be forced back as soon as another window opened. Existing windows are therefore only touched on browser startup and first install.

## Known limitations

- **A brief flash at startup.** Firefox starts extensions after the first window is shown, so the window appears in normal size for a moment before switching to fullscreen. An extension cannot avoid this.
- **The first ~2 seconds of a new window.** If you leave fullscreen with F11 during the recheck period, the window may be switched back once.
- **Private windows** are never changed, even if the extension is allowed to run in private windows.
- **Firefox for Android** is not supported, because the `windows` API does not exist there.

## Project structure

```
hep-tam-ekran/
├── manifest.json   # Manifest V3, add-on ID, data collection declaration ("none")
└── background.js   # All of the extension's logic
```

## Testing

The logic was tested with a simulated version of the Firefox `windows` and `runtime` APIs that uses a virtual clock. The test covers:

- which windows are changed at startup
- the recheck after a simulated reset by Firefox
- respecting an F11 exit when another window opens
- windows that are closed or minimized during the recheck
- errors from the API

Manual testing was done on Firefox for Windows 11.

## Development note

The code and this README were written by an AI assistant (Claude by Anthropic). My part:

- coming up with the idea and deciding how the extension should behave
- planning the project together with the assistant
- testing it in Firefox on Windows 11
- signing and publishing it through addons.mozilla.org
