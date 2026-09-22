import vertexFile from 'crt-shader/glsl/vertex.glsl?raw';
import horizontalFile from 'crt-shader/glsl/horizontal.glsl?raw';
import verticalFile from 'crt-shader/glsl/vertical.glsl?raw';
import opticsFile from 'crt-shader/glsl/optics.glsl?raw';
import * as strings from 'crt-shader/glsl';
import { PRESETS } from 'crt-shader/presets';
import { WIDTH, HEIGHT } from './pattern.js';

// This example owns the WebGL2 pipeline. It does not use CRTRenderer.
// Vite's ?raw loads the actual exported GLSL; ?shaders=strings selects JS exports.
export async function mount({ source, host, preset, params }) {
  const shaders = params.get('shaders') === 'strings' ? strings : {
    vertex: vertexFile, horizontal: horizontalFile, vertical: verticalFile, optics: opticsFile,
  };
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH; canvas.height = HEIGHT;
  canvas.setAttribute('aria-label', 'Raw GLSL CRT procedural test pattern');
  host.append(canvas);
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL 2 is required.');
  const floatTargets = !!gl.getExtension('EXT_color_buffer_float');
  const settings = PRESETS[preset];
  const programs = [shaders.horizontal, shaders.vertical, shaders.optics].map(fragment => {
    const program = gl.createProgram();
    for (const [type, text] of [[gl.VERTEX_SHADER, shaders.vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, text); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader); gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const names = ['tex', 'sourceSize', 'outputSize', 'viewOrigin', 'viewSize', 'bypass', ...Object.keys(settings)];
    return { program, uniforms: Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)])) };
  });
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const textures = [], framebuffers = [];
  function texture(filter = gl.NEAREST) {
    const value = gl.createTexture(); textures.push(value);
    gl.bindTexture(gl.TEXTURE_2D, value);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return value;
  }
  function target(width, height, filter) {
    const value = texture(filter);
    gl.texImage2D(gl.TEXTURE_2D, 0, floatTargets ? gl.RGBA16F : gl.RGBA8,
      width, height, 0, gl.RGBA, floatTargets ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
    const framebuffer = gl.createFramebuffer(); framebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, value, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Incomplete CRT framebuffer.');
    return { texture: value, framebuffer };
  }
  // Horizontal reconstruction keeps native source rows; vertical expands them.
  const horizontal = target(WIDTH, source.height, gl.NEAREST);
  const vertical = target(WIDTH, HEIGHT, gl.LINEAR);
  const input = texture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  function pass(stage, input, framebuffer, width, height) {
    const { program, uniforms } = programs[stage];
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.viewport(0, 0, width, height);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, input);
    gl.uniform1i(uniforms.tex, 0);
    gl.uniform2f(uniforms.sourceSize, source.width, source.height);
    gl.uniform2f(uniforms.outputSize, WIDTH, HEIGHT);
    gl.uniform2f(uniforms.viewOrigin, 0, 0);
    gl.uniform2f(uniforms.viewSize, source.width, source.height);
    gl.uniform1f(uniforms.bypass, 0);
    for (const [name, value] of Object.entries(settings)) gl.uniform1f(uniforms[name], value);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  pass(0, input, horizontal.framebuffer, WIDTH, source.height);
  pass(1, horizontal.texture, vertical.framebuffer, WIDTH, HEIGHT);
  pass(2, vertical.texture, null, WIDTH, HEIGHT);
  return { canvas, gl, floatTargets, dispose() {
    programs.forEach(({ program }) => gl.deleteProgram(program));
    textures.forEach(value => gl.deleteTexture(value));
    framebuffers.forEach(value => gl.deleteFramebuffer(value));
    gl.deleteBuffer(quad);
  } };
}
