"use strict"

import * as THREE from "three/webgpu"
import { noise, fbm, turbulence } from "./shader-utils.jsm"
import { Pane } from "tweakpane"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import Stats from "stats-gl"
import { time, vec3, vec4, uniform, select, modelWorldMatrix, positionGeometry, cameraViewMatrix, cameraProjectionMatrix, remapClamp, mix } from "three/tsl"


class App {

    constructor(id) {
        const canvas = document.getElementById(id)

        this.debugParams = {
            backgroundColor: 0x181818,
            landscape: {
                remapLowerThreshold: 0.065,
                color1: 0x181818,
                color2: 0x8f89b2,
                seed: 2,
                noiseScaleFactor: 0.6,
                noiseFrequencyFactor: 2.5,
                hurstExponent: 0.9,
                numOctaves: 4,
                wireframe: false,
                animate: false,
            }
        }



        this.sizes = {
            width: window.innerWidth,
            height: window.innerHeight
        }

        this.renderer = new THREE.WebGPURenderer({
            canvas: canvas,
            antialias: true,
        })
        this.renderer.setSize(this.sizes.width, this.sizes.height)
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
        this.scene = new THREE.Scene()

        this.camera = new THREE.PerspectiveCamera(75, this.sizes.width / this.sizes.height, 0.001, 1000)
        this.camera.position.set(0, 1, 1.5)

        // Uniforms
        this.uLandscapeColor1 = uniform(new THREE.Color(this.debugParams.landscape.color1))
        this.uLandscapeColor2 = uniform(new THREE.Color(this.debugParams.landscape.color2))
        this.uLandscapeSeed = uniform(this.debugParams.landscape.seed)
        this.uLandscapeNoiseScaleFactor = uniform(this.debugParams.landscape.noiseScaleFactor)
        this.uLandscapeNoiseFrequencyFactor = uniform(this.debugParams.landscape.noiseFrequencyFactor)
        this.uLandscapeRemapLowerThreshold = uniform(this.debugParams.landscape.remapLowerThreshold)
        this.uLandscapeHurstExponent = uniform(this.debugParams.landscape.hurstExponent)
        this.uLandscapeNumOctaves = uniform(this.debugParams.landscape.numOctaves)
        this.uLandscapeAnimate = uniform(this.debugParams.landscape.animate ? 1 : 0)

        // TSL Shader Code
        const modelPosition = modelWorldMatrix.mul(vec4(positionGeometry, 1.0))

        const fixedSeed = modelPosition.xyz.add(vec3(this.uLandscapeSeed))
        const animatedSeed = fixedSeed.add(time.mul(0.2))
        const noiseSeed = select(this.uLandscapeAnimate.equal(1), animatedSeed, fixedSeed)
        const noiseValue = turbulence(vec3(noiseSeed).mul(this.uLandscapeNoiseFrequencyFactor), this.uLandscapeHurstExponent, this.uLandscapeNumOctaves)

        const displacement = noiseValue.mul(this.uLandscapeNoiseScaleFactor)
        const displacedPosition = vec4(modelPosition.x, modelPosition.y.add(displacement), modelPosition.z, modelPosition.w)
        const heightDisplacement = remapClamp(displacedPosition.normalize().y, this.uLandscapeRemapLowerThreshold, 1.0, 0.0, 1.0)
        const viewPosition = cameraViewMatrix.mul(displacedPosition)
        const projectedPosition = cameraProjectionMatrix.mul(viewPosition)
        const finalColor = mix(this.uLandscapeColor1, this.uLandscapeColor2, heightDisplacement)

        const resolution = 128
        this.landscape = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2, resolution, resolution),
            new THREE.MeshBasicNodeMaterial({
                wireframe: this.debugParams.landscape.wireframe,
                vertexNode: projectedPosition,
                fragmentNode: finalColor
            })
        )

        this.landscape.rotation.x = -Math.PI * 0.5
        this.camera.lookAt(this.landscape)

        this.scene.add(this.landscape)
        this.renderer.setClearColor(new THREE.Color(this.debugParams.backgroundColor))

        this.pane = new Pane()
        this.debugFolder = this.pane.addFolder({ title: "Dirt Jam", expanded: true })
        this.landscapeFolder = this.pane.addFolder({ title: "Landscape", expanded: true })

        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enableDamping = true

        this.stats = new Stats()
        document.body.appendChild(this.stats.dom)

        this.clock = new THREE.Clock()

        window.addEventListener("resize", () => this.resize())
    }

    async setup() {
        await this.renderer.init()

        this.debugFolder.addBinding(this.debugParams, "backgroundColor", { label: "Background Color", view: "color", color: { type: "float" } }).on("change", event => {
            this.renderer.setClearColor(event.value)
        })

        this.landscapeFolder.addBinding(this.debugParams.landscape, "wireframe", { label: "Wireframe" }).on("change", event => {
            this.landscape.material.wireframe = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "color1", { label: "Color1", view: "color", color: { type: "float" } }).on("change", event => {
            this.uLandscapeColor1.value.set(event.value)
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "color2", { label: "Color2", view: "color", color: { type: "float" } }).on("change", event => {
            this.uLandscapeColor2.value.set(event.value)
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "seed", { label: "Seed", min: 0, max: 100, step: 1 }).on("change", event => {
            this.uLandscapeSeed.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "noiseScaleFactor", { label: "Noise Scale Factor", min: 0, max: 3, step: 0.01 }).on("change", event => {
            this.uLandscapeNoiseScaleFactor.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "noiseFrequencyFactor", { label: "Noise Frequency Factor", min: 0, max: 3, step: 0.1 }).on("change", event => {
            this.uLandscapeNoiseFrequencyFactor.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "hurstExponent", { label: "Hurst Exponent", min: 0, max: 1, step: 0.1 }).on("change", event => {
            this.uLandscapeHurstExponent.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "numOctaves", { label: "Num Octaves", min: 1, max: 10, step: 1 }).on("change", event => {
            this.uLandscapeNumOctaves.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "remapLowerThreshold", { label: "Remap Lower Threshold", min: -1.0, max: 1.0, step: 0.001 }).on("change", event => {
            this.uLandscapeRemapLowerThreshold.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "animate", { label: "Animate" }).on("change", event => {
            this.uLandscapeAnimate.value = event.value ? 1 : 0
        })
    }

    resize() {
        this.sizes.width = window.innerWidth
        this.sizes.height = window.innerHeight
        this.camera.aspect = this.sizes.width / this.sizes.height
        this.renderer.setSize(this.sizes.width, this.sizes.height)
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
        this.camera.updateProjectionMatrix()
    }

    update(deltaTime) {
        this.stats.begin()
        this.controls.update()
        this.renderer.render(this.scene, this.camera)
        this.stats.end()
        this.stats.update()
    }

    tick() {
        const deltaTime = this.clock.getDelta() * 1000
        this.update(deltaTime)
        window.requestAnimationFrame(() => this.tick())
    }

    async run() {
        await this.setup()
        this.tick()
    }
}

export { App }
