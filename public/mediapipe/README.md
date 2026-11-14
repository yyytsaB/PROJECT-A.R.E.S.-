# Local MediaPipe pose assets

The app uses `@mediapipe/tasks-vision` version `0.10.32` (Apache-2.0).

`pose_landmarker_lite.task` is the official Google MediaPipe Pose Landmarker Lite float16 model, revision 1:

- Source: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
- SHA-256: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`
- Size: 5,777,746 bytes.
- Documentation: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js
- Upstream project and licensing: https://github.com/google-ai-edge/mediapipe

`npm run dev` and `npm run build` copy the matching WASM runtime from the installed package into `public/mediapipe/wasm/`. Generated runtime copies are ignored by Git and are included in the built app. No runtime CDN or external model download is required. The browser loads the package and local model only after the user starts a webcam session.
