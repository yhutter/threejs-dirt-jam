import { dot, mul, float, sub, fract, floor, Fn, sin, vec3, mix } from "three/tsl"

// Taken from https://www.shadertoy.com/view/Xsl3Dl
// Transpiled with: https://threejs.org/examples/?q=tsl#webgpu_tsl_transpiler
const hash3D = /*@__PURE__*/ Fn(([p_immutable]) => {
    const p = p_immutable.toVar();
    p.assign(vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))));

    return float(-1.0).add(mul(2.0, fract(sin(p).mul(43758.5453123))));

}, { p: 'vec3', return: 'vec3' })

const noise = /*@__PURE__*/ Fn(([p]) => {

    const i = floor(p);
    const f = fract(p);
    const u = f.mul(f).mul(sub(3.0, mul(2.0, f)));

    return mix(mix(mix(dot(hash3D(i.add(vec3(0.0, 0.0, 0.0))), f.sub(vec3(0.0, 0.0, 0.0))), dot(hash3D(i.add(vec3(1.0, 0.0, 0.0))), f.sub(vec3(1.0, 0.0, 0.0))), u.x), mix(dot(hash3D(i.add(vec3(0.0, 1.0, 0.0))), f.sub(vec3(0.0, 1.0, 0.0))), dot(hash3D(i.add(vec3(1.0, 1.0, 0.0))), f.sub(vec3(1.0, 1.0, 0.0))), u.x), u.y), mix(mix(dot(hash3D(i.add(vec3(0.0, 0.0, 1.0))), f.sub(vec3(0.0, 0.0, 1.0))), dot(hash3D(i.add(vec3(1.0, 0.0, 1.0))), f.sub(vec3(1.0, 0.0, 1.0))), u.x), mix(dot(hash3D(i.add(vec3(0.0, 1.0, 1.0))), f.sub(vec3(0.0, 1.0, 1.0))), dot(hash3D(i.add(vec3(1.0, 1.0, 1.0))), f.sub(vec3(1.0, 1.0, 1.0))), u.x), u.y), u.z);

}, { p: 'vec3', return: 'float' });


export { noise }
