import * as THREE from "three/webgpu"
import * as TSL from "three/tsl"
import { FolderApi, Pane } from "tweakpane"
import { turbulence } from "./shaders"

type Uniform<T> = TSL.ShaderNodeObject<THREE.UniformNode<T>>

type LandscapeDebugParams = {
    color1: number,
    color2: number,
    seed: number,
    noiseScaleFactor: number,
    noiseFrequencyFactor: number,
    hurstExponent: number,
    numOctaves: number,
    wireframe: boolean,
    animate: boolean
}

class Landscape {
    debugParams: LandscapeDebugParams
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    pane: Pane
    landscapeMesh: THREE.Mesh
    landscapeMaterial: THREE.MeshBasicNodeMaterial
    landscapeFolder: FolderApi
    uLandscapeColor1: Uniform<THREE.Color>
    uLandscapeColor2: Uniform<THREE.Color>
    uLandscapeSeed: Uniform<number>
    uLandscapeNoiseScaleFactor: Uniform<number>
    uLandscapeNoiseFrequencyFactor: Uniform<number>
    uLandscapeHurstExponent: Uniform<number>
    uLandscapeNumOctaves: Uniform<number>
    // TODO: Uniforms of bools are not possible currently
    uLandscapeAnimate: Uniform<number>

    constructor(resolution: number, scene: THREE.Scene, camera: THREE.PerspectiveCamera, pane: Pane) {
        this.debugParams = {
            color1: 0xce6561,
            color2: 0xffffff,
            seed: 2,
            noiseScaleFactor: 0.6,
            noiseFrequencyFactor: 2.5,
            hurstExponent: 0.9,
            numOctaves: 4,
            wireframe: false,
            animate: false,
        }
        this.scene = scene
        this.camera = camera
        this.pane = pane

        // Uniforms
        this.uLandscapeColor1 = TSL.uniform(new THREE.Color(this.debugParams.color1))
        this.uLandscapeColor2 = TSL.uniform(new THREE.Color(this.debugParams.color2))
        this.uLandscapeSeed = TSL.uniform(this.debugParams.seed)
        this.uLandscapeNoiseScaleFactor = TSL.uniform(this.debugParams.noiseScaleFactor)
        this.uLandscapeNoiseFrequencyFactor = TSL.uniform(this.debugParams.noiseFrequencyFactor)
        this.uLandscapeHurstExponent = TSL.uniform(this.debugParams.hurstExponent)
        this.uLandscapeNumOctaves = TSL.uniform(this.debugParams.numOctaves)
        this.uLandscapeAnimate = TSL.uniform(this.debugParams.animate ? 1 : 0)

        // Positioning and Coloring of Vertices

        const fixedSeed = TSL.positionGeometry.xyz.add(TSL.vec3(this.uLandscapeSeed))
        const animatedSeed = fixedSeed.add(TSL.time.mul(0.2))
        const noiseSeed = TSL.select(this.uLandscapeAnimate.equal(1), animatedSeed, fixedSeed)

        // Noise Value goes from 0 to 1
        const noiseValue = turbulence(TSL.vec3(noiseSeed).mul(this.uLandscapeNoiseFrequencyFactor), this.uLandscapeHurstExponent, this.uLandscapeNumOctaves)

        const displacement = noiseValue.mul(this.uLandscapeNoiseScaleFactor)
        const finalColor = TSL.mix(this.uLandscapeColor1, this.uLandscapeColor2, noiseValue)

        this.landscapeMaterial = new THREE.MeshBasicNodeMaterial({
            wireframe: this.debugParams.wireframe,
            positionNode: TSL.positionLocal.add(TSL.vec3(0, 0, displacement)),
            colorNode: finalColor,
        })

        this.landscapeMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2, resolution, resolution),
            this.landscapeMaterial
        )

        this.landscapeMesh.rotation.x = -Math.PI * 0.5
        this.camera.lookAt(this.landscapeMesh.position)
        this.scene.add(this.landscapeMesh)

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
        this.landscapeFolder.addBinding(this.debugParams, "noiseScaleFactor", { label: "Noise Scale Factor", min: 0, max: 3, step: 0.01 }).on("change", event => {
            this.uLandscapeNoiseScaleFactor.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams, "noiseFrequencyFactor", { label: "Noise Frequency Factor", min: 0, max: 3, step: 0.1 }).on("change", event => {
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

    }
}

export { Landscape }
