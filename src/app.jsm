import * as THREE from "three"
import { WebGPURenderer } from "three/webgpu"
import { Pane } from "tweakpane"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"


class App {

    #sizes = {
        width: 0,
        height: 0
    }
    #renderer = null
    #scene = null
    #camera = null
    #landscape = null
    #debugParams = {
        backgroundColor: new THREE.Color(0x282828),
        wireframe: true
    }
    #pane = null
    #debugFolder = null
    #clock = null
    #controls = null

    constructor(id) {
        const canvas = document.getElementById(id)

        this.#sizes.width = window.innerWidth
        this.#sizes.height = window.innerHeight

        this.#renderer = new WebGPURenderer({
            canvas: canvas,
            antialias: true,
        })
        this.#renderer = new WebGPURenderer({
            canvas: canvas,
            antialias: true,
        })
        this.#renderer.setSize(this.#sizes.width, this.#sizes.height)
        this.#renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
        this.#scene = new THREE.Scene()

        this.#camera = new THREE.PerspectiveCamera(75, this.#sizes.width / this.#sizes.height, 0.001, 1000)
        this.#landscape = new THREE.Mesh(
            new THREE.PlaneGeometry(4, 4, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: this.#debugParams.wireframe })
        )
        this.#landscape.rotation.x = -Math.PI * 0.5
        this.#camera.position.set(0, 4, 0)
        this.#camera.lookAt(this.#landscape)

        this.#scene.add(this.#landscape)
        this.#renderer.setClearColor(this.#debugParams.backgroundColor)

        this.#pane = new Pane()
        this.#debugFolder = this.#pane.addFolder({ title: "Dirt Jam", expanded: true })

        this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement)
        this.#controls.enableDamping = true

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
    }

    #resize() {
        this.#sizes.width = window.innerWidth
        this.#sizes.height = window.innerHeight
        this.#camera.aspect = this.#sizes.width / this.#sizes.height
        this.#renderer.setSize(this.#sizes.width, this.#sizes.height)
        this.#renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
        this.#camera.updateProjectionMatrix()
    }

    #tick() {
        this.#controls.update()

        const deltaTime = this.#clock.getDelta() * 1000
        const elapsedTime = this.#clock.getElapsedTime()

        this.#renderer.render(this.#scene, this.#camera)
        window.requestAnimationFrame(() => this.#tick())
    }

    async run() {
        await this.#setup()
        this.#tick()
    }
}

export { App }
