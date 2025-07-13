import * as THREE from "three/webgpu"
import { noise } from "./shader-utils.jsm"
import { Pane } from "tweakpane"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import Stats from "stats-gl"
import { time, vec3, positionLocal, uniform, Fn, select } from "three/tsl"

class App {

    constructor(id) {
        const canvas = document.getElementById(id)

        this.debugParams = {
            backgroundColor: new THREE.Color(0x222222),
            landscape: {
                color: new THREE.Color(0x7A8251),
                seed: 2,
                noiseScaleFactor: 0.6,
                noiseFrequencyFactor: 2.5,
                wireframe: true,
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

        this.uLandscapeColor = uniform(new THREE.Color(0x7A8251))
        this.uLandscapeSeed = uniform(this.debugParams.landscape.seed)
        this.uLandscapeNoiseScaleFactor = uniform(this.debugParams.landscape.noiseScaleFactor)
        this.uLandscapeNoiseFrequencyFactor = uniform(this.debugParams.landscape.noiseFrequencyFactor)
        this.uLandscapeAnimate = uniform(this.debugParams.landscape.animate ? 1 : 0)

        const positionNode = Fn(() => {
            const animatedSeed = positionLocal.xyz.add(time.mul(0.2).add(vec3(this.uLandscapeSeed)))
            const fixedSeed = positionLocal.xyz.add(vec3(this.uLandscapeSeed))
            const noiseSeed = select(this.uLandscapeAnimate.equal(1), animatedSeed, fixedSeed)
            const noiseValue = noise(noiseSeed.mul(this.uLandscapeNoiseFrequencyFactor))
            const displacement = noiseValue.mul(this.uLandscapeNoiseScaleFactor)
            // Because we are working in local space we need to displace on the z axis (which is esentially the y axis after being rotated)
            const displacedPosition = vec3(positionLocal.x, positionLocal.y, positionLocal.z.add(displacement))
            return displacedPosition

        })

        this.landscape = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2, 64, 64),
            new THREE.MeshBasicNodeMaterial({
                wireframe: this.debugParams.landscape.wireframe,
                positionNode: positionNode(),
                colorNode: this.uLandscapeColor,
            })
        )


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
