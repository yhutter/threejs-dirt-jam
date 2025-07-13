import * as THREE from "three/webgpu"
import { noise, fbm } from "./shader-utils.jsm"
import { Pane } from "tweakpane"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import Stats from "stats-gl"
import { time, vec3, positionLocal, uniform, Fn, select, float, int } from "three/tsl"

class App {

    constructor(id) {
        const canvas = document.getElementById(id)

        this.debugParams = {
            backgroundColor: new THREE.Color(0x222222),
            showHelpers: true,
            landscape: {
                color: new THREE.Color(0x7A8251),
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
        this.renderer.shadowMap.enabled = true
        this.scene = new THREE.Scene()

        this.camera = new THREE.PerspectiveCamera(75, this.sizes.width / this.sizes.height, 0.001, 1000)
        this.camera.position.set(0, 1, 1.5)

        // Uniforms
        this.uLandscapeColor = uniform(new THREE.Color(0x7A8251))
        this.uLandscapeSeed = uniform(this.debugParams.landscape.seed)
        this.uLandscapeNoiseScaleFactor = uniform(this.debugParams.landscape.noiseScaleFactor)
        this.uLandscapeNoiseFrequencyFactor = uniform(this.debugParams.landscape.noiseFrequencyFactor)
        this.uLandscapeHurstExponent = uniform(this.debugParams.landscape.hurstExponent)
        this.uLandscapeNumOctaves = uniform(this.debugParams.landscape.numOctaves)
        this.uLandscapeAnimate = uniform(this.debugParams.landscape.animate ? 1 : 0)

        // TSL Position Node
        const positionNode = Fn(() => {
            const animatedSeed = positionLocal.xyz.add(time.mul(0.2).add(vec3(this.uLandscapeSeed)))
            const fixedSeed = positionLocal.xyz.add(vec3(this.uLandscapeSeed))
            let noiseSeed = select(this.uLandscapeAnimate.equal(1), animatedSeed, fixedSeed).toVar()
            noiseSeed.mulAssign(this.uLandscapeNoiseFrequencyFactor)
            const noiseValue = fbm(vec3(noiseSeed), this.uLandscapeHurstExponent, this.uLandscapeNumOctaves)
            const displacement = noiseValue.mul(this.uLandscapeNoiseScaleFactor)
            // Because we are working in local space we need to displace on the z axis (which is esentially the y axis after being rotated)
            const displacedPosition = vec3(positionLocal.x, positionLocal.y, positionLocal.z.add(displacement))
            return displacedPosition

        })

        // Lights
        this.light = new THREE.DirectionalLight(0xffffff, 1)
        this.light.castShadow = true
        const shadowCameraSize = 1
        this.light.shadow.mapSize.setScalar(1024)
        this.light.shadow.camera.top = shadowCameraSize
        this.light.shadow.camera.bottom = -shadowCameraSize
        this.light.shadow.camera.left = -shadowCameraSize
        this.light.shadow.camera.right = shadowCameraSize
        this.light.shadow.camera.near = 0.1
        this.light.shadow.camera.far = 2.5
        this.light.position.set(-1, 1, 0)
        this.scene.add(this.light)

        this.helpers = []

        const lightHelper = new THREE.DirectionalLightHelper(this.light)
        this.scene.add(lightHelper)

        const shadowHelper = new THREE.CameraHelper(this.light.shadow.camera)
        this.scene.add(shadowHelper)

        this.helpers.push(lightHelper, shadowHelper)

        this.helpers.forEach(h => h.visible = this.debugParams.showHelpers)

        const resolution = 128
        this.landscape = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2, resolution, resolution),
            new THREE.MeshStandardNodeMaterial({
                wireframe: this.debugParams.landscape.wireframe,
                positionNode: positionNode(),
                colorNode: this.uLandscapeColor,
            })
        )

        this.landscape.castShadow = true
        this.landscape.receiveShadow = true
        this.landscape.rotation.x = -Math.PI * 0.5
        this.camera.lookAt(this.landscape)

        this.scene.add(this.landscape)
        this.renderer.setClearColor(this.debugParams.backgroundColor)

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
        this.debugFolder.addBinding(this.debugParams, "showHelpers", { label: "Show Helpers" }).on("change", event => {
            this.helpers.forEach(h => h.visible = event.value)
        })

        this.landscapeFolder.addBinding(this.debugParams.landscape, "wireframe", { label: "Wireframe" }).on("change", event => {
            this.landscape.material.wireframe = event.value
        })
        this.landscapeFolder.addBinding(this.debugParams.landscape, "color", { label: "Color", view: "color", color: { type: "float" } }).on("change", event => {
            this.uLandscapeColor.value.set(event.value)
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
