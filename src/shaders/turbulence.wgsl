// Taken from https://thebookofshaders.com/13/
fn turbulence(x: vec3<f32>, H: f32, numOctaves: i32) -> f32 {
    var t = 0.0;

    for(var i = 0; i < numOctaves; i++) {
        let f  = pow(2.0, f32(i));
        let a =  pow(f, -H);
        t += a * abs(noise(f * x));
    }
    return t;
}

#include noise.wgsl
