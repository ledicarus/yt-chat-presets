# YouTube Chat Presets

A browser extension for YouTube live chat. It adds a speech-bubble "YT" button to the chat header. Click it to show a panel with:

- a **username** field, and one **button per preset message**
- `[x]` in a preset is replaced with the username you typed
- `:shortcode:` emotes (including channel member emotes) are inserted as real emotes
- an **auto-send** checkbox (off by default: the message is only placed in the chat box)
- **Edit** / **+ New** to rename, change, add or delete presets

The default preset is `:_Donors: <( [x] IS PART OF THE DONOR CLASS!!!)`. Change it with **Edit**; the `:_Donors:` emote only works in a channel where you can use that emote.

## Install (Opera, Opera GX, Chrome, Edge, Brave)

1. Unzip this folder somewhere permanent (the browser loads it from there, so don't delete or move it).
2. Open the extensions page: `opera://extensions` (Opera/GX), `chrome://extensions` (Chrome), `edge://extensions` (Edge).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and choose the folder that contains `manifest.json`.
5. Open a YouTube live stream (or its popped-out chat) and reload the page.

## Using emotes

The first time you use a preset with an emote, open YouTube's emoji picker (the smiley in the chat box) once and search for that emote. The extension copies it, remembers it, and from then on inserts it for you.

## Notes

- You need to be signed in to YouTube and able to chat.
- It only runs on YouTube live chat pages and stores its settings in your browser (nothing is sent anywhere).
- To update, replace the folder's files with the new version, then switch the extension off and on.
