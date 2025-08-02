import * as THREE from "three/build/three.webgpu"
import { Pane } from "tweakpane"
import { OrbitControls } from "three/examples/jsm/Addons.js"
import Stats from "stats-gl"
import * as TSL from "three/build/three.tsl"
import { fbm, turbulence } from "./shaders"

class App {

    /**
        * @param {string} canvasId - Id of main canvas element used for rendering 
    */
    constructor(canvasId) {
        const canvas = document.getElementById(canvasId)
        this.debugParams = {
            backgroundColor: 0x2e3440,
            showStats: false,
            landscape: {
                resolution: 512,
                noiseFunction: 0,
                noiseFunctionOptions: {
                    "Fbm": 0,
                    "Turbulence": 1
                },
                spin: true,
                spinTime: 0,
                spinSpeed: 0.2,
                baseColor: 0x81a1c1,
                peakColor: 0xd8dee9,
                seed: 53,
                shift: 0.002,
                noiseAmplitude: 0.5,
                noiseFrequency: 3.0,
                hurstExponent: 0.9,
                numOctaves: 4,
                wireframe: false,
                lightColor: 0xffffff
            }
        }

        this.size = {
            width: window.innerWidth,
            height: window.innerHeight
        }

        this.renderer = new THREE.WebGPURenderer({
            antialias: true,
            canvas: canvas
        })
        this.renderer.setSize(this.size.width, this.size.height)
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))

        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(75, this.size.width / this.size.height, 0.01, 1000)
        this.camera.position.set(0, 1, 1.5)

        this.renderer.setClearColor(new THREE.Color(this.debugParams.backgroundColor))

        this.pane = new Pane()

        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enableDamping = true

        this.stats = new Stats({
            trackGPU: true,
            trackHz: true,
            trackCPT: false,
            logsPerSecond: 4,
            graphsPerSecond: 30,
            samplesLog: 40,
            samplesGraph: 10,
            precision: 2,
            horizontal: true,
            minimal: false,
            mode: 0
        })
        this.stats.dom.hidden = !this.debugParams.showStats
        document.body.appendChild(this.stats.dom)

        this.clock = new THREE.Clock()

        window.addEventListener("resize", () => this.resize())

        // Setup landscape
        this.landscapeMaterial = new THREE.MeshBasicNodeMaterial({
            wireframe: this.debugParams.landscape.wireframe,
        })

        this.landscapeGeometry = new THREE.PlaneGeometry(2, 2, this.debugParams.landscape.resolution, this.debugParams.landscape.resolution)

        this.landscapeMesh = new THREE.Mesh(
            this.landscapeGeometry,
            this.landscapeMaterial
        )

        this.landscapeGeometry.rotateX(-Math.PI * 0.5)
        this.camera.lookAt(this.landscapeMesh.position)
        this.scene.add(this.landscapeMesh)
    }

    landscapeShader() {
        // Uniforms
        this.uLightColor = TSL.uniform(new THREE.Color(this.debugParams.landscape.lightColor))
        this.uBaseColor = TSL.uniform(new THREE.Color(this.debugParams.landscape.baseColor))
        this.uPeakColor = TSL.uniform(new THREE.Color(this.debugParams.landscape.peakColor))
        this.uSeed = TSL.uniform(this.debugParams.landscape.seed)
        this.uNoiseAmplitude = TSL.uniform(this.debugParams.landscape.noiseAmplitude)
        this.uNoiseFrequency = TSL.uniform(this.debugParams.landscape.noiseFrequency)
        this.uHurstExponent = TSL.uniform(this.debugParams.landscape.hurstExponent)
        this.uNumOctaves = TSL.uniform(this.debugParams.landscape.numOctaves)
        this.uShift = TSL.uniform(this.debugParams.landscape.shift)
        this.uNoiseFunction = TSL.uniform(this.debugParams.landscape.noiseFunction)

        const displacement = TSL.Fn(({ position }) => {
            const noiseSeed = position.xz.add(this.uSeed)
            const fbmNoise = fbm(TSL.vec3(noiseSeed).mul(this.uNoiseFrequency), this.uHurstExponent, this.uNumOctaves)
            const turbulenceNoise = turbulence(TSL.vec3(noiseSeed).mul(this.uNoiseFrequency), this.uHurstExponent, this.uNumOctaves)
            const noiseValue = TSL.select(this.uNoiseFunction.equal(0), fbmNoise, turbulenceNoise)
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

        const baseColor = TSL.mix(this.uBaseColor, this.uPeakColor, TSL.smoothstep(0.0, 0.25, elevation))

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
        specular = TSL.smoothstep(0.5, 0.52, specular)

        // Lighting is sum of all light sources
        lighting = diffuse

        // Calculate final color
        const finalColor = baseColor.mul(lighting).add(specular)

        this.landscapeMaterial.vertexNode = finalPosition
        this.landscapeMaterial.fragmentNode = finalColor
    }

    addTweaks() {
        this.debugFolder = this.pane.addFolder({ title: "Dirt Jam", expanded: true })
        this.landscapeFolder = this.pane.addFolder({ title: "Landscape", expanded: true })

        this.debugFolder.addBinding(this.debugParams, "backgroundColor", { label: "Background Color", view: "color", color: { type: "float" } }).on("change", event => {
            this.renderer.setClearColor(event.value)
        })
        this.debugFolder.addBinding(this.debugParams, "showStats", { label: "Show Stats" }).on("change", event => {
            this.stats.dom.hidden = !event.value
        })

        this.landscapeFolder.addBinding(this.debugParams.landscape, "wireframe", { label: "Wireframe" }).on("change", event => {
            this.landscapeMaterial.wireframe = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "lightColor", { label: "Light Color", view: "color", color: { type: "float" } }).on("change", event => {
            this.uLightColor.value.set(event.value)
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "baseColor", { label: "Base Color", view: "color", color: { type: "float" } }).on("change", event => {
            this.uBaseColor.value.set(event.value)
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "peakColor", { label: "Peak Color", view: "color", color: { type: "float" } }).on("change", event => {
            this.uPeakColor.value.set(event.value)
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "seed", { label: "Seed", min: 0, max: 100, step: 1 }).on("change", event => {
            this.uSeed.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "noiseAmplitude", { label: "Noise Amplitude", min: 0, max: 3, step: 0.01 }).on("change", event => {
            this.uNoiseAmplitude.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "noiseFrequency", { label: "Noise Frequency", min: 0, max: 3, step: 0.1 }).on("change", event => {
            this.uNoiseFrequency.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "hurstExponent", { label: "Hurst Exponent", min: 0, max: 1, step: 0.1 }).on("change", event => {
            this.uHurstExponent.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "numOctaves", { label: "Num Octaves", min: 1, max: 10, step: 1 }).on("change", event => {
            this.uNumOctaves.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "shift", { label: "Shift", min: 0, max: 5, step: 0.001 }).on("change", event => {
            this.uShift.value = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "spin", { label: "Spin" })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "spinSpeed", { label: "Spin Speed", min: 0, max: 3, step: 0.1 })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "noiseFunction", { label: "Noise Function", options: this.debugParams.landscape.noiseFunctionOptions }).on("change", event => {
            this.uNoiseFunction.value = this.debugParams.landscape.noiseFunction
        })
    }

    async setup() {
        await this.renderer.init()
        this.addTweaks()
        this.landscapeShader()
    }

    resize() {
        this.size.width = window.innerWidth
        this.size.height = window.innerHeight
        this.camera.aspect = this.size.width / this.size.height
        this.renderer.setSize(this.size.width, this.size.height)
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
        this.camera.updateProjectionMatrix()
    }

    tick() {
        const dt = this.clock.getDelta()
        this.stats.begin()
        this.controls.update()
        if (this.debugParams.landscape.spin) {
            this.debugParams.landscape.spinTime += dt
            this.landscapeMesh.rotation.y = this.debugParams.landscape.spinTime * this.debugParams.landscape.spinSpeed
        }
        this.renderer.render(this.scene, this.camera)
        this.stats.end()
        this.stats.update()
        window.requestAnimationFrame(() => this.tick())
    }

    async run() {
        await this.setup()
        this.tick()
    }
}

export { App }
