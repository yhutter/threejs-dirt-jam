import * as THREE from "three/webgpu"
import { turbulence } from "./shaders.ts"
import { Pane, FolderApi } from "tweakpane"
import { OrbitControls } from "three/examples/jsm/Addons.js"
import Stats from "stats-gl"
import * as TSL from "three/tsl"

type DebugParams = {
    backgroundColor: number,
    landscape: {
        remapLowerThreshold: number,
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
}

type Size = {
    width: number,
    height: number
}

type Uniform<T> = TSL.ShaderNodeObject<THREE.UniformNode<T>>


class App {

    debugParams: DebugParams
    size: Size
    renderer: THREE.WebGPURenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    controls: OrbitControls
    landscape: THREE.Mesh
    landscapeMaterial: THREE.MeshBasicNodeMaterial
    pane: Pane
    debugFolder: FolderApi
    landscapeFolder: FolderApi
    stats: Stats
    clock: THREE.Clock

    uLandscapeColor1: Uniform<THREE.Color>
    uLandscapeColor2: Uniform<THREE.Color>
    uLandscapeSeed: Uniform<number>
    uLandscapeNoiseScaleFactor: Uniform<number>
    uLandscapeNoiseFrequencyFactor: Uniform<number>
    uLandscapeRemapLowerThreshold: Uniform<number>
    uLandscapeHurstExponent: Uniform<number>
    uLandscapeNumOctaves: Uniform<number>
    // TODO: Uniforms of bools are not possible currently
    uLandscapeAnimate: Uniform<number>


    constructor(id: string) {
        this.debugParams = {
            backgroundColor: 0x181818,
            landscape: {
                remapLowerThreshold: 0.065,
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
        }

        this.size = {
            width: window.innerWidth,
            height: window.innerHeight
        }

        this.renderer = new THREE.WebGPURenderer({
            antialias: true,
        })

        this.renderer.setSize(this.size.width, this.size.height)
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
        this.renderer.domElement.id = id
        document.body.appendChild(this.renderer.domElement)

        this.scene = new THREE.Scene()

        this.camera = new THREE.PerspectiveCamera(75, this.size.width / this.size.height, 0.001, 1000)
        this.camera.position.set(0, 1, 1.5)

        // Uniforms
        this.uLandscapeColor1 = TSL.uniform(new THREE.Color(this.debugParams.landscape.color1))
        this.uLandscapeColor2 = TSL.uniform(new THREE.Color(this.debugParams.landscape.color2))
        this.uLandscapeSeed = TSL.uniform(this.debugParams.landscape.seed)
        this.uLandscapeNoiseScaleFactor = TSL.uniform(this.debugParams.landscape.noiseScaleFactor)
        this.uLandscapeNoiseFrequencyFactor = TSL.uniform(this.debugParams.landscape.noiseFrequencyFactor)
        this.uLandscapeRemapLowerThreshold = TSL.uniform(this.debugParams.landscape.remapLowerThreshold)
        this.uLandscapeHurstExponent = TSL.uniform(this.debugParams.landscape.hurstExponent)
        this.uLandscapeNumOctaves = TSL.uniform(this.debugParams.landscape.numOctaves)
        this.uLandscapeAnimate = TSL.uniform(this.debugParams.landscape.animate ? 1 : 0)

        // Positioning and Coloring of Vertices

        const fixedSeed = TSL.positionGeometry.xyz.add(TSL.vec3(this.uLandscapeSeed))
        const animatedSeed = fixedSeed.add(TSL.time.mul(0.2))
        const noiseSeed = TSL.select(this.uLandscapeAnimate.equal(1), animatedSeed, fixedSeed)
        const noiseValue = turbulence(TSL.vec3(noiseSeed).mul(this.uLandscapeNoiseFrequencyFactor), this.uLandscapeHurstExponent, this.uLandscapeNumOctaves)

        const modelPosition = TSL.modelWorldMatrix.mul(TSL.vec4(TSL.positionGeometry, 1.0))
        const displacement = noiseValue.mul(this.uLandscapeNoiseScaleFactor)
        const displacedPosition = TSL.vec4(modelPosition.x, modelPosition.y.add(displacement), modelPosition.z, modelPosition.w)
        const heightDisplacement = TSL.remapClamp(displacedPosition.normalize().y, this.uLandscapeRemapLowerThreshold, 1.0, 0.0, 1.0)
        const viewPosition = TSL.cameraViewMatrix.mul(displacedPosition)
        const projectedPosition = TSL.cameraProjectionMatrix.mul(viewPosition)
        const finalColor = TSL.mix(this.uLandscapeColor1, this.uLandscapeColor2, heightDisplacement)

        const resolution = 128
        this.landscapeMaterial = new THREE.MeshBasicNodeMaterial({
            wireframe: this.debugParams.landscape.wireframe,
            vertexNode: projectedPosition,
            fragmentNode: finalColor,
        })

        this.landscape = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2, resolution, resolution),
            this.landscapeMaterial
        )

        this.landscape.rotation.x = -Math.PI * 0.5
        this.camera.lookAt(this.landscape.position)

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
            this.landscapeMaterial.wireframe = event.value
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
        this.size.width = window.innerWidth
        this.size.height = window.innerHeight
        this.camera.aspect = this.size.width / this.size.height
        this.renderer.setSize(this.size.width, this.size.height)
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
        this.camera.updateProjectionMatrix()
    }

    update() {
        this.stats.begin()
        this.controls.update()
        this.renderer.render(this.scene, this.camera)
        this.stats.end()
        this.stats.update()
    }

    tick() {
        // const deltaTime = this.clock.getDelta() * 1000
        this.update()
        window.requestAnimationFrame(() => this.tick())
    }

    async run() {
        await this.setup()
        this.tick()
    }
}

export { App }
