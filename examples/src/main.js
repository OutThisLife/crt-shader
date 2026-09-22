import { PRESETS } from 'crt-shader/presets';
import { createPattern } from './pattern.js';
import './style.css';

const routes = {
  r3f: { title: 'React Three Fiber CRT', description: 'A demand-mode Canvas uses the pmndrs composer and CRT component on its own renderer. Tone mapping precedes CRT.', load: () => import('./r3f.js') },
  postprocessing: { title: 'pmndrs CRTPass', description: 'Half-float composer buffers → linear ToneMappingEffect → CRTPass. Not the native Three.js Pass class.', load: () => import('./postprocessing.js') },
  three: { title: 'Native Three.js CRTPass', description: 'RenderPass → OutputPass → CRTPass. The native adapter takes display-encoded input on the existing renderer.', load: () => import('./three.js') },
  react: { title: 'React CRTImage', description: 'The package component owns image preparation and a shared runtime. This example mounts under React StrictMode.', load: () => import('./react.js') },
  glsl: { title: 'Raw WebGL2 / GLSL', description: 'Exported GLSL files drive an owned horizontal → vertical → optics pipeline. Add ?shaders=strings to use the JS shader exports instead.', load: () => import('./glsl.js') },
  vanilla: { title: 'Vanilla image / canvas', description: 'An owned core runtime renders a procedural canvas. Add ?input=image to load the same artwork as a decoded PNG.', load: () => import('./vanilla.js') },
};
const name = location.pathname.split('/').filter(Boolean)[0] || 'vanilla';
const route = routes[name];
if (!route) throw new Error(`Unknown example: ${name}`);
const params = new URLSearchParams(location.search);
const preset = Object.hasOwn(PRESETS, params.get('preset')) ? params.get('preset') : 'reference';
const select = document.querySelector('#preset');
for (const key of Object.keys(PRESETS)) select.add(new Option(key, key));
select.value = preset;
select.addEventListener('change', () => {
  params.set('preset', select.value);
  location.search = params.toString();
});
document.querySelector(`nav a[href="/${name}/"]`).setAttribute('aria-current', 'page');
document.querySelector('#title').textContent = route.title;
document.querySelector('#description').textContent = route.description;
const source = createPattern();
document.querySelector('#source').append(source);
const { mount } = await route.load();
const example = await mount({ source, host: document.querySelector('#output'), preset, params });
window.example = { ...example, ready: true, integration: name, preset };
document.querySelector('#status').textContent = 'Rendered · original procedural artwork · opaque black matte';
window.addEventListener('pagehide', () => example.dispose(), { once: true });
