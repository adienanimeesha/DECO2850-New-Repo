# Aquarium Pepper’s Ghost display

Normal aquarium: <http://localhost:3000/pet.html>

Click **Pepper’s Ghost view ↗** at the bottom right of the normal aquarium to open the reflected display with calibration controls. The link is hidden in ghost mode so it does not appear in the reflection.

Single-surface reflected display: <http://localhost:3000/pet.html?display=ghost>

Open with calibration visible: <http://localhost:3000/pet.html?display=ghost&calibrate=1>

Use your server’s port if it is not 3000. The display is a single image, with no assumed pyramid, reflector angle or forced orientation.

## Controls

- **C:** show/hide calibration. This also works in normal mode to access the mode switch.
- **F:** enter/leave browser fullscreen in ghost mode or while calibration is open. A fullscreen button is also provided.
- **Escape:** hide calibration; the browser handles exiting fullscreen.
- **Hide controls:** remove the calibration UI from the reflected output. It is not simply faded out.
- **Reopen controls:** press **C**, or click/tap anywhere on the ghost display. This also works when ghost mode opens without calibration visible.
- **Switch mode:** compare the unchanged normal view against the reflected-display view without reconnecting or restarting the journey.
- **Reset calibration:** reset scale, offsets, brightness and both flips.

Calibration values are stored only in this browser’s localStorage (`jelly-aquarium-calibration-v1`). Scale ranges from 0.4 to 1.5; offsets from −40% to 40% of scene width/height; brightness from 0.25 to 1.5. Horizontal mirroring and vertical flipping are independent. Normal mode ignores calibration transforms and brightness. The URL selects the mode; saved calibration never automatically enables it.

Calibrate with controls visible, then hide them before viewing the reflection. Fullscreen needs a user gesture; if unsupported, use the browser’s fullscreen command. Increasing scale or offset intentionally permits clipping for a smaller physical reflector; reduce scale if Jelly’s travel path is cut off.

## Rendering changes

The original aquarium filled its 960 × 620 canvas with a bright water gradient, broad light shafts, tank borders and a sandy floor. Those large illuminated shapes suggest a flat rectangle in a reflection. Ghost mode clears every frame to opaque `#000000`, and its surrounding page and frame are also black. It removes those broad surfaces while retaining separated glowing plants and coral. Thirty-four hollow cyan bubble rings rise at different sizes and speeds, with small white highlights and soft local glows. Bubbles fade at the top and bottom; decorations and memories drift subtly at different rates. Additional environmental motion respects reduced-motion preferences.

Jelly retains the same SVG artwork, selected outfit, swimming coordinates, bobbing, rotation and departure/return timing. A soft lilac glow in ghost mode improves separation without blurring the character itself. Plants, coral and every returned memory have local coloured glows, while their source artwork stays sharp. Normal rendering runs through the original environment drawing unchanged. Returned memories render at full opacity with no ground shadows in ghost mode; saved white-paper drawings may still appear as small illuminated cards.

Ghost mode fits the complete 48:31 scene proportionally inside the screen, leaving black margins rather than stretching the scene. Calibration transforms and brightness apply only to the canvas, so controls stay readable when the scene is mirrored or flipped. The canvas cursor is hidden in ghost mode.

`pet.html` is a display client: vocabulary choices, collision and storybook interactions live on `mobile.html`. Ghost mode changes neither those screens nor their assets, scripts, missions or state transitions. In the existing journey flow Jelly leaves the aquarium during the mobile adventure and returns afterwards; ghost mode deliberately preserves that behaviour.

## Code

- `public/pet.html`: display stylesheet/script wiring.
- `public/css/aquarium-display.css`: black surroundings, proportional viewport and local calibration panel.
- `public/js/aquarium-display.js`: mode, calibration, local persistence, fullscreen and keyboard controls. No socket or shared-state writes.
- `public/js/aquarium.js`: normal/ghost rendering branches sharing the same socket, memories, outfit and character timing.
- `test/aquarium-display.test.js`: default-mode preservation, black rendering, calibration/reset/persistence, fullscreen, shared-state immutability and phase/stale-snapshot behaviour.

No new dependencies or artwork were added.

## Verification and physical setup

The full automated suite passes (169 tests), including the existing mobile/robot Socket.IO and progression tests. Chrome checks verify black corner pixels and page background, preserved aspect ratio, calibration/mirroring, reload persistence, fullscreen and normal-mode isolation. Browser screenshots were inspected for both modes and calibration.

The optical result still needs testing on the physical screen and reflector. Start with neutral brightness, choose mirroring/flipping based on the actual reflection, adjust scene scale/position, then hide controls. Software brightness cannot change an LCD’s physical black level or eliminate ambient reflections. Brightness, room lighting and reflector alignment must be tuned on the hardware.

Optics reference: [University of Arizona OSC Outreach — Pepper’s Ghost](https://wp.optics.arizona.edu/oscoutreach/peppers-ghost/) recommends a bright foreground against black. This implementation uses that principle without adopting a multi-face pyramid layout.
