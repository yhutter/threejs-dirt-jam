import * as THREE from "three"
import { Pane } from "tweakpane"

class App {

    #sizes = {
        width: 0,
        height: 0
    }
    #renderer = null
    #scene = null
    #camera = null
    #box = null
    #debugParams = {
        backgroundColor: new THREE.Color(0x282828)
    }
    #pane = null
    #debugFolder = null
    #clock = null

    constructor(id) {
        const canvas = document.getElementById(id)
        this.#sizes.width = window.innerWidth
        this.#sizes.height = window.innerHeight
        this.#renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
        })
        this.#renderer.setSize(this.#sizes.width, this.#sizes.height)
        this.#renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
        this.#scene = new THREE.Scene()

        this.#camera = new THREE.PerspectiveCamera(75, this.#sizes.width / this.#sizes.height, 0.01, 1000)
        this.#box = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshNormalMaterial()
        )
        this.#box.position.z = -3
        this.#scene.add(this.#box)
        this.#renderer.setClearColor(this.#debugParams.backgroundColor)
        this.#pane = new Pane()
        this.#debugFolder = this.#pane.addFolder({ title: "Dirt Jam", expanded: true })
        this.#debugFolder.addBinding(this.#debugParams, "backgroundColor", { label: "Background Color", view: "color", color: { type: "float" } }).on("change", event => {
            this.#renderer.setClearColor(event.value)
        })

        this.#clock = new THREE.Clock()

        window.addEventListener("resize", this.#resize)
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
        const deltaTime = this.#clock.getDelta() * 1000
        const elapsedTime = this.#clock.getElapsedTime()
        this.#box.rotation.y = elapsedTime
        this.#renderer.render(this.#scene, this.#camera)
        window.requestAnimationFrame(() => this.#tick())
    }

    run() {
        this.#tick()
    }
}

export { App }
