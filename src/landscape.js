import * as THREE from "three/build/three.webgpu"
import * as TSL from "three/build/three.tsl"
import { Pane } from "tweakpane"
import { turbulence } from "./shaders"

class Landscape {

    /**
        * Represents a procedural generated landscape
        * @param {THREE.Scene} scene - Scene reference
        * @param {THREE.PerspectiveCamera} camera - Camera reference
        * @param {Pane} pane - Tweakpane reference
    */
    constructor(scene, camera, pane) {
        this.debugParams = {
            color1: 0xe4e4ef,
            color2: 0x181818,
            seed: 2,
            shift: 0.002,
            noiseAmplitudeFactor: 0.6,
            noiseFrequencyFactor: 2.5,
            hurstExponent: 0.9,
            numOctaves: 4,
            wireframe: false,
            animate: false,
        }
        this.scene = scene
        this.camera = camera
        this.pane = pane

        // Lights
        this.light = new THREE.DirectionalLight(0xffffff, 1.0)
        this.light.position.set(-1, 1, 0)
        this.light.target.position.set(0, 0, 0)
        this.scene.add(this.light.target)
        this.scene.add(this.light)


        const lightHelper = new THREE.DirectionalLightHelper(this.light)
        this.scene.add(lightHelper)

        this.landscapeMaterial = new THREE.MeshStandardNodeMaterial({
            wireframe: this.debugParams.wireframe,
        })

        const resolution = 128
        this.landscapeGeometry = new THREE.PlaneGeometry(2, 2, resolution, resolution)

        this.landscapeMesh = new THREE.Mesh(
            this.landscapeGeometry,
            this.landscapeMaterial
        )

        this.landscapeGeometry.rotateX(-Math.PI * 0.5)
        this.camera.lookAt(this.landscapeMesh.position)
        this.scene.add(this.landscapeMesh)

        // Uniforms
        this.uLandscapeColor1 = TSL.uniform(new THREE.Color(this.debugParams.color1))
        this.uLandscapeColor2 = TSL.uniform(new THREE.Color(this.debugParams.color2))
        this.uLandscapeSeed = TSL.uniform(this.debugParams.seed)
        this.uLandscapeNoiseScaleFactor = TSL.uniform(this.debugParams.noiseAmplitudeFactor)
        this.uLandscapeNoiseFrequencyFactor = TSL.uniform(this.debugParams.noiseFrequencyFactor)
        this.uLandscapeHurstExponent = TSL.uniform(this.debugParams.hurstExponent)
        this.uLandscapeNumOctaves = TSL.uniform(this.debugParams.numOctaves)
        this.uLandscapeAnimate = TSL.uniform(this.debugParams.animate ? 1 : 0)
        this.uShift = TSL.uniform(this.debugParams.shift)

        const displacement = TSL.Fn(({ position }) => {
            const fixedSeed = position.xz.add(this.uLandscapeSeed)
            const animatedSeed = fixedSeed.add(TSL.time.mul(0.2))
            const noiseSeed = TSL.select(this.uLandscapeAnimate.equal(1), animatedSeed, fixedSeed)

            const noiseValue = turbulence(TSL.vec3(noiseSeed).mul(this.uLandscapeNoiseFrequencyFactor), this.uLandscapeHurstExponent, this.uLandscapeNumOctaves)
            const displacement = noiseValue.mul(this.uLandscapeNoiseScaleFactor)
            return displacement
        })


        // Position
        const elevation = displacement({ position: TSL.positionLocal })
        const position = TSL.positionLocal.add(TSL.vec3(0, elevation, 0))
        this.landscapeMaterial.positionNode = position

        // Calculate normals using neighbour technique
        let positionA = TSL.positionLocal.add(TSL.vec3(this.uShift, 0.0, 0.0))
        let positionB = TSL.positionLocal.add(TSL.vec3(0.0, 0.0, this.uShift.negate()))

        positionA = positionA.add(TSL.vec3(0.0, displacement({ position: positionA }), 0.0))
        positionB = positionB.add(TSL.vec3(0.0, displacement({ position: positionB }), 0.0))

        const toA = positionA.sub(position).normalize()
        const toB = positionB.sub(position).normalize()
        const normal = TSL.cross(toA, toB).normalize()

        this.landscapeMaterial.normalNode = TSL.transformNormalToView(normal)
        this.landscapeMaterial.colorNode = TSL.mix(this.uLandscapeColor1, this.uLandscapeColor2, elevation)

        this.landscapeFolder = this.pane.addFolder({ title: "Landscape", expanded: true })
    }

    setup() {
        this.landscapeFolder.addBinding(this.debugParams, "wireframe", { label: "Wireframe" }).on("change", event => {
            this.landscapeMaterial.wireframe = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams, "color1", { label: "Color1", view: "color", color: { type: "float" } }).on("change", event => {
            this.uLandscapeColor1.value.set(event.value)
        })
        this.landscapeFolder.addBinding(this.debugParams, "color2", { label: "Color2", view: "color", color: { type: "float" } }).on("change", event => {
            this.uLandscapeColor2.value.set(event.value)
        })
        this.landscapeFolder.addBinding(this.debugParams, "seed", { label: "Seed", min: 0, max: 100, step: 1 }).on("change", event => {
            this.uLandscapeSeed.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams, "noiseAmplitudeFactor", { label: "Noise Amplitude", min: 0, max: 3, step: 0.01 }).on("change", event => {
            this.uLandscapeNoiseScaleFactor.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams, "noiseFrequencyFactor", { label: "Noise Frequency", min: 0, max: 3, step: 0.1 }).on("change", event => {
            this.uLandscapeNoiseFrequencyFactor.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams, "hurstExponent", { label: "Hurst Exponent", min: 0, max: 1, step: 0.1 }).on("change", event => {
            this.uLandscapeHurstExponent.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams, "numOctaves", { label: "Num Octaves", min: 1, max: 10, step: 1 }).on("change", event => {
            this.uLandscapeNumOctaves.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams, "animate", { label: "Animate" }).on("change", event => {
            this.uLandscapeAnimate.value = event.value ? 1 : 0
        })
        this.landscapeFolder.addBinding(this.debugParams, "shift", { label: "Shift", min: 0, max: 5, step: 0.001 }).on("change", event => {
            this.uShift.value = event.value
        })
    }
}

export { Landscape }
