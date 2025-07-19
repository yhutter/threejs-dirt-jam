import * as TSL from "three/tsl"
import noiseShader from "./shaders/noise.wgsl"
import fbmShader from "./shaders/fbm.wgsl"
import turbulenceShader from "./shaders/turbulence.wgsl"

const noise = /*@__PURE__*/ TSL.wgslFn(noiseShader)
const fbm =  /*@__PURE__*/ TSL.wgslFn(fbmShader)
const turbulence =  /*@__PURE__*/ TSL.wgslFn(turbulenceShader)

export { noise, fbm, turbulence }
