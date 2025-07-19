// Taken from https://www.shadertoy.com/view/Xsl3Dl
fn noise(p: vec3<f32>) -> f32 {
    let i: vec3<f32> = floor(p);
    let f: vec3<f32> = fract(p);
    let u: vec3<f32> = f * f * (3. - 2. * f);
    return mix(mix(mix(dot(hash3D(i + vec3<f32>(0., 0., 0.)), f - vec3<f32>(0., 0., 0.)), dot(hash3D(i + vec3<f32>(1., 0., 0.)), f - vec3<f32>(1., 0., 0.)), u.x), mix(dot(hash3D(i + vec3<f32>(0., 1., 0.)), f - vec3<f32>(0., 1., 0.)), dot(hash3D(i + vec3<f32>(1., 1., 0.)), f - vec3<f32>(1., 1., 0.)), u.x), u.y), mix(mix(dot(hash3D(i + vec3<f32>(0., 0., 1.)), f - vec3<f32>(0., 0., 1.)), dot(hash3D(i + vec3<f32>(1., 0., 1.)), f - vec3<f32>(1., 0., 1.)), u.x), mix(dot(hash3D(i + vec3<f32>(0., 1., 1.)), f - vec3<f32>(0., 1., 1.)), dot(hash3D(i + vec3<f32>(1., 1., 1.)), f - vec3<f32>(1., 1., 1.)), u.x), u.y), u.z);
} 

fn hash3D(p: vec3<f32>) -> vec3<f32> {
    let p_new = vec3<f32>(
        dot(p, vec3<f32>(127.1, 311.7, 74.7)),
        dot(p, vec3<f32>(269.5, 183.3, 246.1)),
        dot(p, vec3<f32>(113.5, 271.9, 124.6)),
    );
    return -1.0 + 2.0 * fract(sin(p_new) * 43758.5453123);
}

