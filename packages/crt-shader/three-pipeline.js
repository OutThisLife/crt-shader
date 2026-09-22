import {
  BufferGeometry, Float32BufferAttribute, GLSL3, HalfFloatType, LinearFilter,
  Mesh, NearestFilter, NoBlending, NoColorSpace, OrthographicCamera,
  RawShaderMaterial, Scene, UnsignedByteType, Vector2, Vector4, WebGLRenderTarget,
} from 'three';
import {vertex, horizontal, vertical, optics} from './shaders.js';
import {PRESETS} from './presets.js';
import {resolveSettings} from './input.js';

const settingKeys = Object.keys(PRESETS.reference);
const stripVersion = source => source.replace(/^#version 300 es\n/, '');
const transfer = `
vec3 encodeSRGB(vec3 c) {
  c = max(c, vec3(0.));
  return mix(1.055 * pow(c, vec3(1. / 2.4)) - .055, 12.92 * c, lessThanEqual(c, vec3(.0031308)));
}
vec3 decodeSRGB(vec3 c) {
  c = max(c, vec3(0.));
  return mix(pow((c + .055) / 1.055, vec3(2.4)), c / 12.92, lessThanEqual(c, vec3(.04045)));
}`;
// texelFetch makes input sampling independent of the caller's texture filters.
// Encode before averaging: the frozen pipeline consumes display-encoded pixels.
const prepare = `precision highp float;
in vec2 uv; out vec4 frag;
uniform sampler2D tex;
uniform bool encodeInput;
${transfer}
vec3 readPixel(ivec2 p) {
  vec3 c = texelFetch(tex, clamp(p, ivec2(0), textureSize(tex, 0) - 1), 0).rgb;
  return encodeInput ? encodeSRGB(c) : c;
}
void main() {
  vec2 p = uv * vec2(textureSize(tex, 0)) - .5;
  ivec2 base = ivec2(floor(p));
  vec2 f = fract(p);
  frag = vec4(mix(mix(readPixel(base), readPixel(base + ivec2(1, 0)), f.x),
                  mix(readPixel(base + ivec2(0, 1)), readPixel(base + ivec2(1)), f.x), f.y), 1.);
}`;
const copy = `precision highp float;
in vec2 uv; out vec4 frag;
uniform sampler2D tex;
uniform bool encodeInput, decodeOutput, nearestInput;
${transfer}
void main() {
  ivec2 size = textureSize(tex, 0);
  vec3 c = nearestInput ? texelFetch(tex, min(ivec2(uv * vec2(size)), size - 1), 0).rgb : texture(tex, uv).rgb;
  if (encodeInput) c = encodeSRGB(c);
  if (decodeOutput) c = decodeSRGB(c);
  frag = vec4(c, 1.);
}`;

function material(fragmentShader, uniforms) {
  return new RawShaderMaterial({
    glslVersion: GLSL3, vertexShader: stripVersion(vertex),
    fragmentShader: stripVersion(fragmentShader), uniforms,
    depthTest: false, depthWrite: false, blending: NoBlending, toneMapped: false,
  });
}

/** Shared implementation; adapters deliberately keep their different Pass ABIs. */
export class CRTPipeline {
  constructor(options = {}) {
    this.options = {};
    this.size = new Vector2(1, 1);
    this.cssSize = new Vector2();
    this.screenSize = new Vector2();
    this.savedViewport = new Vector4();
    this.savedCurrentViewport = new Vector4();
    this.savedScissor = new Vector4();
    this.savedCurrentScissor = new Vector4();
    this.targets = new Map();
    this.resources = null;
    this.disposed = false;
    this._inputSize = {width: 0, height: 0};
    this.counters = {renders: 0, drawCalls: 0, targetAllocations: 0, preparationPasses: 0};
    this.setOptions(options);
  }

  setOptions(options = {}) {
    if (this.disposed) throw new Error('CRT pass has been disposed.');
    const next = {...this.options, ...options};
    for (const key of Object.keys(next)) {
      if (!settingKeys.includes(key) && !['preset', 'inputResolution', 'mode'].includes(key)) {
        throw new TypeError(`Unknown CRT option: ${key}`);
      }
      if (next[key] === undefined) delete next[key];
    }
    const resolution = next.inputResolution ?? 'auto';
    if (resolution !== 'auto' && (!Number.isInteger(resolution) || resolution < 1)) {
      throw new RangeError('CRT inputResolution must be auto or a positive integer.');
    }
    const mode = next.mode ?? 'crt';
    if (!['crt', 'pixelated', 'original'].includes(mode)) throw new RangeError(`Unknown CRT mode: ${mode}`);
    const overrides = Object.fromEntries(settingKeys.filter(key => next[key] !== undefined).map(key => [key, next[key]]));
    const settings = resolveSettings(next.preset ?? 'reference', overrides);
    this.options = next;
    this.settings = settings;
    this.mode = mode;
    this.inputResolution = resolution;
    return this;
  }

  setSize(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
      throw new RangeError('CRT output dimensions must be positive.');
    }
    this.size.set(Math.round(width), Math.round(height));
  }

  initialize(renderer) {
    if (this.disposed) throw new Error('CRT pass has been disposed.');
    if (this.resources) return;
    this.floatTargets = renderer.extensions.has('EXT_color_buffer_float');
    const uniforms = {
      tex: {value: null}, sourceSize: {value: new Vector2()}, outputSize: {value: new Vector2()},
      viewOrigin: {value: new Vector2()}, viewSize: {value: new Vector2()}, bypass: {value: 0},
      ...Object.fromEntries(settingKeys.map(key => [key, {value: this.settings[key]}])),
    };
    const stages = [horizontal, vertical, optics].map(shader => material(shader, uniforms));
    const preparation = material(prepare, {tex: {value: null}, encodeInput: {value: false}});
    const copier = material(copy, {
      tex: {value: null}, encodeInput: {value: false}, decodeOutput: {value: false}, nearestInput: {value: false},
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute('a_position', new Float32BufferAttribute([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1], 2));
    // The frozen vertex shader names its attribute a_position, not position.
    geometry.setDrawRange(0, 6);
    const mesh = new Mesh(geometry, preparation);
    mesh.frustumCulled = false;
    const scene = new Scene();
    scene.add(mesh);
    this.resources = {uniforms, stages, preparation, copier, geometry, mesh, scene, camera: new OrthographicCamera()};
  }

  get inputSize() { return {...this._inputSize}; }
  get stats() {
    return {...this.counters, inputSize: this.inputSize, outputSize: {width: this.size.x, height: this.size.y},
      targets: this.targets.size, floatTargets: this.floatTargets ?? null, disposed: this.disposed};
  }

  target(key, width, height, filter = NearestFilter, type = this.floatTargets ? HalfFloatType : UnsignedByteType) {
    let target = this.targets.get(key);
    if (!target) {
      target = new WebGLRenderTarget(width, height, {
        type, minFilter: filter, magFilter: filter, colorSpace: NoColorSpace,
        depthBuffer: false, stencilBuffer: false, generateMipmaps: false,
      });
      target.texture.name = `CRT ${key}`;
      this.targets.set(key, target);
      this.counters.targetAllocations++;
    } else target.setSize(width, height);
    return target;
  }

  draw(renderer, shader, texture, target, width, height) {
    const {mesh, scene, camera} = this.resources;
    shader.uniforms.tex.value = texture;
    mesh.material = shader;
    renderer.setRenderTarget(target);
    renderer.setViewport(0, 0, width / renderer.getPixelRatio(), height / renderer.getPixelRatio());
    renderer.setScissorTest(false);
    renderer.render(scene, camera);
    this.counters.drawCalls++;
  }

  copy(renderer, texture, target, width, height, {encode = false, decode = false, nearest = false} = {}) {
    const shader = this.resources.copier;
    shader.uniforms.encodeInput.value = encode;
    shader.uniforms.decodeOutput.value = decode;
    shader.uniforms.nearestInput.value = nearest;
    this.draw(renderer, shader, texture, target, width, height);
  }

  prepare(renderer, input, linearInput) {
    const {width, height} = input;
    renderer.getSize(this.cssSize);
    const longest = this.inputResolution === 'auto'
      ? Math.max(32, Math.ceil(Math.max(this.cssSize.x, this.cssSize.y) / 384 * 32 / 8) * 8)
      : this.inputResolution;
    const scale = Math.min(1, longest / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
    this._inputSize = {width: w, height: h};
    let sw = width, sh = height, texture = input.texture, level = 0;
    // Even at native resolution, isolate nearest sampling and RGBA8 input from
    // the caller's target. Never change caller texture filtering or color space.
    do {
      const nw = Math.max(w, Math.ceil(sw / 2)), nh = Math.max(h, Math.ceil(sh / 2));
      const target = this.target(`prepare-${level}`, nw, nh, NearestFilter, UnsignedByteType);
      this.resources.preparation.uniforms.encodeInput.value = linearInput && level === 0;
      this.draw(renderer, this.resources.preparation, texture, target, nw, nh);
      texture = target.texture;
      sw = nw; sh = nh; level++;
    } while (sw !== w || sh !== h);
    for (const [key, target] of this.targets) {
      if (key.startsWith('prepare-') && Number(key.slice(8)) >= level) {
        target.dispose(); this.targets.delete(key);
      }
    }
    this.counters.preparationPasses = level;
    return texture;
  }

  render(renderer, input, output, {linearInput = false, linearOutput = false} = {}) {
    this.initialize(renderer);
    const width = output?.width ?? renderer.getDrawingBufferSize(this.screenSize).x;
    const height = output?.height ?? this.screenSize.y;
    this.setSize(width, height);
    const savedTarget = renderer.getRenderTarget();
    const cubeFace = renderer.getActiveCubeFace(), mipLevel = renderer.getActiveMipmapLevel();
    const autoClear = renderer.autoClear, xr = renderer.xr.enabled;
    const scissorTest = renderer.getScissorTest();
    const gl = renderer.getContext();
    const currentScissorTest = gl.isEnabled(gl.SCISSOR_TEST);
    this.savedCurrentScissor.fromArray(gl.getParameter(gl.SCISSOR_BOX));
    renderer.getViewport(this.savedViewport);
    renderer.getCurrentViewport(this.savedCurrentViewport);
    renderer.getScissor(this.savedScissor);
    renderer.autoClear = false;
    renderer.xr.enabled = false;
    try {
      if (this.mode === 'original') {
        this._inputSize = {width: input.width, height: input.height};
        this.counters.preparationPasses = 0;
        this.copy(renderer, input.texture, output, width, height, {encode: linearInput && !linearOutput});
      } else {
        const prepared = this.prepare(renderer, input, linearInput);
        if (this.mode === 'pixelated') {
          this.copy(renderer, prepared, output, width, height, {decode: linearOutput, nearest: true});
        } else {
          const {uniforms, stages} = this.resources;
          const {width: sw, height: sh} = this._inputSize;
          uniforms.sourceSize.value.set(sw, sh);
          uniforms.viewSize.value.set(sw, sh);
          uniforms.outputSize.value.set(width, height);
          for (const key of settingKeys) uniforms[key].value = this.settings[key];
          const horizontalTarget = this.target('horizontal', width, sh);
          const verticalTarget = this.target('vertical', width, height, LinearFilter);
          this.draw(renderer, stages[0], prepared, horizontalTarget, width, sh);
          this.draw(renderer, stages[1], horizontalTarget.texture, verticalTarget, width, height);
          const destination = linearOutput ? this.target('encoded-output', width, height, LinearFilter) : output;
          this.draw(renderer, stages[2], verticalTarget.texture, destination, width, height);
          if (linearOutput) this.copy(renderer, destination.texture, output, width, height, {decode: true});
        }
      }
      this.counters.renders++;
    } finally {
      renderer.autoClear = autoClear;
      renderer.xr.enabled = xr;
      renderer.setViewport(this.savedViewport);
      renderer.setScissor(this.savedScissor);
      renderer.setScissorTest(scissorTest);
      // setRenderTarget resets the active viewport, even when the caller used
      // setViewport after binding its target. Preserve both logical and active
      // viewport state without retaining changes on the borrowed target.
      if (savedTarget) {
        const viewport = savedTarget.viewport;
        savedTarget.viewport = this.savedCurrentViewport;
        try { renderer.setRenderTarget(savedTarget, cubeFace, mipLevel); }
        finally { savedTarget.viewport = viewport; }
      } else renderer.setRenderTarget(null, cubeFace, mipLevel);
      renderer.state.scissor(this.savedCurrentScissor);
      renderer.state.setScissorTest(currentScissorTest);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const target of this.targets.values()) target.dispose();
    this.targets.clear();
    if (this.resources) {
      const {stages, preparation, copier, geometry, scene} = this.resources;
      for (const shader of [...stages, preparation, copier]) shader.dispose();
      geometry.dispose(); scene.clear();
      this.resources = null;
    }
  }
}
