import * as THREE from "three/build/three.webgpu"
import * as TSL from "three/build/three.tsl"
import { Pane } from "tweakpane"
import { fbm } from "./shaders"

class Landscape {

    /**
        * Represents a procedural generated landscape
        * @param {THREE.Scene} scene - Scene reference
        * @param {THREE.PerspectiveCamera} camera - Camera reference
        * @param {Pane} pane - Tweakpane reference
    */
    constructor(scene, camera, pane) {
        this.debugParams = {
            baseColor: 0xebdbb2,
            peakColor: 0x1c2021,
            seed: 53,
            shift: 0.002,
            noiseAmplitude: 0.5,
            noiseFrequency: 3.0,
            hurstExponent: 0.9,
            numOctaves: 4,
            wireframe: false,
            lightColor: 0xffffff
        }
        this.scene = scene
        this.camera = camera
        this.pane = pane

        this.landscapeMaterial = new THREE.MeshBasicNodeMaterial({
            wireframe: this.debugParams.wireframe,
            side: THREE.DoubleSide
        })

        const resolution = 256
        this.landscapeGeometry = new THREE.PlaneGeometry(2, 2, resolution, resolution)

        this.landscapeMesh = new THREE.Mesh(
            this.landscapeGeometry,
            this.landscapeMaterial
        )

        this.landscapeGeometry.rotateX(-Math.PI * 0.5)
        this.camera.lookAt(this.landscapeMesh.position)
        this.scene.add(this.landscapeMesh)

        // Uniforms
        this.uLightColor = TSL.uniform(new THREE.Color(this.debugParams.lightColor))
        this.uBaseColor = TSL.uniform(new THREE.Color(this.debugParams.baseColor))
        this.uPeakColor = TSL.uniform(new THREE.Color(this.debugParams.peakColor))
        this.uSeed = TSL.uniform(this.debugParams.seed)
        this.uNoiseAmplitude = TSL.uniform(this.debugParams.noiseAmplitude)
        this.uNoiseFrequency = TSL.uniform(this.debugParams.noiseFrequency)
        this.uHurstExponent = TSL.uniform(this.debugParams.hurstExponent)
        this.uNumOctaves = TSL.uniform(this.debugParams.numOctaves)
        this.uShift = TSL.uniform(this.debugParams.shift)

        const displacement = TSL.Fn(({ position }) => {
            const noiseSeed = position.xz.add(this.uSeed)
            const noiseValue = fbm(TSL.vec3(noiseSeed).mul(this.uNoiseFrequency), this.uHurstExponent, this.uNumOctaves)
            return noiseValue.mul(this.uNoiseAmplitude)
        })

        // Position
        const elevation = displacement({ position: TSL.positionLocal })
        const position = TSL.positionLocal.add(TSL.vec3(0, elevation, 0))

        // Calculate normals using neighbour technique
        let positionA = TSL.positionLocal.add(TSL.vec3(this.uShift, 0.0, 0.0))
        let positionB = TSL.positionLocal.add(TSL.vec3(0.0, 0.0, this.uShift.negate()))

        positionA = positionA.add(TSL.vec3(0.0, displacement({ position: positionA }), 0.0))
        positionB = positionB.add(TSL.vec3(0.0, displacement({ position: positionB }), 0.0))

        const toA = positionA.sub(position).normalize()
        const toB = positionB.sub(position).normalize()
        const calculatedNormal = TSL.cross(toA, toB).normalize()

        const finalPosition = TSL.cameraProjectionMatrix.mul(TSL.modelViewMatrix.mul(position))
        const vPosition = finalPosition.toVertexStage()
        const vNormal = TSL.modelWorldMatrix.mul(TSL.vec4(calculatedNormal, 0.0).xyz).toVertexStage()

        const baseColor = TSL.mix(this.uBaseColor, this.uPeakColor, TSL.smoothstep(0.0, 0.75, elevation))

        // Lighting
        let lighting = TSL.vec3(0.0)
        const normal = vNormal.normalize()
        const viewDirection = TSL.cameraPosition.sub(vPosition.normalize())

        // Diffuse Lighting
        const lightDirection = TSL.vec3(2.0, 1.0, 1.0).normalize()
        let dp = TSL.max(0.0, TSL.dot(lightDirection, normal))

        // Toon
        dp = dp.mul(TSL.smoothstep(0.5, 0.505, dp))

        const diffuse = dp.mul(this.uLightColor)

        // Phong specular
        const r = TSL.normalize(TSL.reflect(lightDirection.negate(), normal))
        let phongValue = TSL.max(0.0, TSL.dot(viewDirection, r))
        phongValue = TSL.pow(phongValue, 32)
        let specular = TSL.vec3(phongValue)
        specular = TSL.smoothstep(0.5, 0.51, specular)

        // Lighting is sum of all light sources
        lighting = diffuse

        // Calculate final color
        const finalColor = baseColor.mul(lighting).add(specular)

        this.landscapeMaterial.vertexNode = finalPosition
        this.landscapeMaterial.fragmentNode = finalColor

        this.landscapeFolder = this.pane.addFolder({ title: "Landscape", expanded: true })
    }

    setup() {
        this.landscapeFolder.addBinding(this.debugParams, "wireframe", { label: "Wireframe" }).on("change", event => {
            this.landscapeMaterial.wireframe = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams, "lightColor", { label: "Light Color", view: "color", color: { type: "float" } }).on("change", event => {
            this.uLightColor.value.set(event.value)
        })
        this.landscapeFolder.addBinding(this.debugParams, "baseColor", { label: "Base Color", view: "color", color: { type: "float" } }).on("change", event => {
            this.uBaseColor.value.set(event.value)
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

    update(dt, elapsedTime) {
        this.landscapeMesh.rotation.y = elapsedTime
    }
}

export { Landscape }
