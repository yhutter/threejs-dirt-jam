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
            valleyColor: 0xebdbb2,
            peakColor: 0x1c2021,
            seed: 2,
            shift: 0.002,
            noiseAmplitude: 0.6,
            noiseFrequency: 2.5,
            hurstExponent: 0.9,
            numOctaves: 4,
            wireframe: false,
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
            side: THREE.DoubleSide
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
        this.uValleyColor = TSL.uniform(new THREE.Color(this.debugParams.valleyColor))
        this.uPeakColor = TSL.uniform(new THREE.Color(this.debugParams.peakColor))
        this.uSeed = TSL.uniform(this.debugParams.seed)
        this.uNoiseAmplitude = TSL.uniform(this.debugParams.noiseAmplitude)
        this.uNoiseFrequency = TSL.uniform(this.debugParams.noiseFrequency)
        this.uHurstExponent = TSL.uniform(this.debugParams.hurstExponent)
        this.uNumOctaves = TSL.uniform(this.debugParams.numOctaves)
        this.uShift = TSL.uniform(this.debugParams.shift)

        const displacement = TSL.Fn(({ position }) => {
            const noiseSeed = position.xz.add(this.uSeed)
            const noiseValue = turbulence(TSL.vec3(noiseSeed).mul(this.uNoiseFrequency), this.uHurstExponent, this.uNumOctaves)
            return noiseValue.mul(this.uNoiseAmplitude)
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
        this.landscapeMaterial.colorNode = TSL.mix(this.uValleyColor, this.uPeakColor, elevation)

        this.landscapeFolder = this.pane.addFolder({ title: "Landscape", expanded: true })
    }

    setup() {
        this.landscapeFolder.addBinding(this.debugParams, "wireframe", { label: "Wireframe" }).on("change", event => {
            this.landscapeMaterial.wireframe = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams, "valleyColor", { label: "Valley Color", view: "color", color: { type: "float" } }).on("change", event => {
            this.uValleyColor.value.set(event.value)
        })
        this.landscapeFolder.addBinding(this.debugParams, "peakColor", { label: "Peak Color", view: "color", color: { type: "float" } }).on("change", event => {
            this.uPeakColor.value.set(event.value)
        })
        this.landscapeFolder.addBinding(this.debugParams, "seed", { label: "Seed", min: 0, max: 100, step: 1 }).on("change", event => {
            this.uSeed.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams, "noiseAmplitude", { label: "Noise Amplitude", min: 0, max: 3, step: 0.01 }).on("change", event => {
            this.uNoiseAmplitude.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams, "noiseFrequency", { label: "Noise Frequency", min: 0, max: 3, step: 0.1 }).on("change", event => {
            this.uNoiseFrequency.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams, "hurstExponent", { label: "Hurst Exponent", min: 0, max: 1, step: 0.1 }).on("change", event => {
            this.uHurstExponent.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams, "numOctaves", { label: "Num Octaves", min: 1, max: 10, step: 1 }).on("change", event => {
            this.uNumOctaves.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams, "shift", { label: "Shift", min: 0, max: 5, step: 0.001 }).on("change", event => {
            this.uShift.value = event.value
        })
    }
}

export { Landscape }
