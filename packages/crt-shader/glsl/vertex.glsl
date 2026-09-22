#version 300 es
/* crt-shader — generated from shaders.js; do not edit.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Brooklyn (OutThisLife)
 * Article inspiration: https://datagubbe.se/crt/ and https://datagubbe.se/crt2/
 * Preserve the accompanying LICENSE and NOTICE.md when copying or porting.
 */
in vec2 a_position; out vec2 uv;
void main(){uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}