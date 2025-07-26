import * as TSL from "three/build/three.tsl"

// Taken from https://iquilezles.org/articles/fbm/
const fbm =  /*@__PURE__*/ TSL.Fn(([x, H, numOctaves]) => {
    let t = TSL.float(0.0).toVar()
    TSL.Loop(numOctaves, ({ i }) => {
        const f = TSL.pow(TSL.float(2.0), TSL.float(i))
        const a = TSL.pow(f, H.negate())
        const noise = TSL.mx_noise_float(f.mul(x))
        t.addAssign(a.mul(noise))
    })
    return t
})

// Taken from https://thebookofshaders.com/13/
const turbulence =  /*@__PURE__*/ TSL.Fn(([x, H, numOctaves]) => {
    let t = TSL.float(0.0).toVar()
    TSL.Loop(numOctaves, ({ i }) => {
        const f = TSL.pow(TSL.float(2.0), TSL.float(i))
        const a = TSL.pow(f, H.negate())
        const noise = TSL.mx_noise_float(f.mul(x)).abs()
        t.addAssign(a.mul(noise))
    })
    return t
})

export { fbm, turbulence }
