import { cp, mkdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const target = new URL('public/mediapipe/wasm/', root);
await mkdir(target, { recursive: true });
await cp(new URL('node_modules/@mediapipe/tasks-vision/wasm/', root), target, { recursive: true });
