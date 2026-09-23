import { CanvasTexture, Color, Mesh, MeshBasicMaterial, NearestFilter,
  NoToneMapping, OrthographicCamera, PlaneGeometry, Scene, SRGBColorSpace,
  WebGLRenderer } from 'three';
import { WIDTH, HEIGHT, DPR } from './pattern.js';

// One deterministic scene for native Three, pmndrs and R3F. The package's scene
// adapters consume the existing renderer's target, never a second context.
export function createScene(source) {
  const scene = new Scene();
  scene.background = new Color(0x000000); // CRT output is deliberately opaque.
  const camera = new OrthographicCamera(-4 / 3, 4 / 3, 1, -1, 0.1, 10);
  camera.position.z = 2;
  const texture = new CanvasTexture(source);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  const geometry = new PlaneGeometry(8 / 3, 2);
  const material = new MeshBasicMaterial({ map: texture });
  scene.add(new Mesh(geometry, material));
  return { scene, camera, dispose() {
    geometry.dispose(); material.dispose(); texture.dispose();
  } };
}

export function createRenderer(host) {
  const renderer = new WebGLRenderer({ alpha: false, antialias: false, preserveDrawingBuffer: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(DPR);
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.domElement.setAttribute('aria-label', 'CRT procedural scene');
  host.append(renderer.domElement);
  return renderer;
}
