import * as THREE from "three/webgpu"
import { noise } from "./shader-utils.jsm"
import { Pane } from "tweakpane"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import Stats from "stats-gl"
import { time, vec3, positionLocal, uniform } from "three/tsl"

class App {

    #sizes = {
        width: 0,
        height: 0
    }
    #renderer = null
    #scene = null
    #camera = null
    #landscape = null
    #uLandscapeColor = null
    #debugParams = {
        backgroundColor: new THREE.Color(0x191D24),
        landscapeColor: new THREE.Color(0xE6CC93),
        wireframe: true
    }
    #pane = null
    #debugFolder = null
    #clock = null
    #controls = null
    #stats = null

    constructor(id) {
        const canvas = document.getElementById(id)

        this.#sizes.width = window.innerWidth
        this.#sizes.height = window.innerHeight

        this.#renderer = new THREE.WebGPURenderer({
            canvas: canvas,
            antialias: true,
        })
        this.#renderer.setSize(this.#sizes.width, this.#sizes.height)
        this.#renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
        this.#scene = new THREE.Scene()

        this.#camera = new THREE.PerspectiveCamera(75, this.#sizes.width / this.#sizes.height, 0.001, 1000)
        this.#camera.position.set(0, 1, 1.5)

        this.#uLandscapeColor = uniform(new THREE.Color(0xE6CC93))

        const noiseSeed = positionLocal.xyz.add(time.mul(0.4))
        const noiseValue = noise(noiseSeed)
        const displacement = noiseValue.mul(0.6)
        // Because we are working in local space we need to displace on the z axis (which is esentially the y axis after being rotated)
        const displacedPosition = vec3(positionLocal.x, positionLocal.y, positionLocal.z.add(displacement))

        this.#landscape = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2, 32, 32),
            new THREE.MeshBasicNodeMaterial({
                wireframe: this.#debugParams.wireframe,
                positionNode: displacedPosition,
                colorNode: this.#uLandscapeColor,
            })
        )


        this.#landscape.rotation.x = -Math.PI * 0.5
        this.#camera.lookAt(this.#landscape)

        this.#scene.add(this.#landscape)
        this.#renderer.setClearColor(this.#debugParams.backgroundColor)

        this.#pane = new Pane()
        this.#debugFolder = this.#pane.addFolder({ title: "Dirt Jam", expanded: true })

        this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement)
        this.#controls.enableDamping = true

        this.#stats = new Stats()
        document.body.appendChild(this.#stats.dom)

        this.#clock = new THREE.Clock()

        window.addEventListener("resize", () => this.#resize())
    }

    async #setup() {
        await this.#renderer.init()

        // Add debug params to Tweakpane
        this.#debugFolder.addBinding(this.#debugParams, "backgroundColor", { label: "Background Color", view: "color", color: { type: "float" } }).on("change", event => {
            this.#renderer.setClearColor(event.value)
        })
        this.#debugFolder.addBinding(this.#debugParams, "wireframe", { label: "Wireframe" }).on("change", event => {
            this.#landscape.material.wireframe = event.value
        })
        this.#debugFolder.addBinding(this.#debugParams, "landscapeColor", { label: "Landscape Color", view: "color", color: { type: "float" } }).on("change", event => {
            this.#uLandscapeColor.value.set(event.value)
        })
    }

    #resize() {
        this.#sizes.width = window.innerWidth
        this.#sizes.height = window.innerHeight
        this.#camera.aspect = this.#sizes.width / this.#sizes.height
        this.#renderer.setSize(this.#sizes.width, this.#sizes.height)
        this.#renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
        this.#camera.updateProjectionMatrix()
    }

    #update(deltaTime) {
        this.#stats.begin()
        this.#controls.update()
        this.#renderer.render(this.#scene, this.#camera)
        this.#stats.end()
        this.#stats.update()
    }

    #tick() {
        const deltaTime = this.#clock.getDelta() * 1000
        this.#update(deltaTime)
        window.requestAnimationFrame(() => this.#tick())
    }

    async run() {
        await this.#setup()
        this.#tick()
    }
}

export { App }
