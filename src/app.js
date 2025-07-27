import * as THREE from "three/build/three.webgpu"
import { Pane } from "tweakpane"
import { OrbitControls } from "three/examples/jsm/Addons.js"
import Stats from "stats-gl"
import { Landscape } from "./landscape"

class App {

    /**
        * Main Application which handles the basic game loop
        * @param {string} canvasId - Id of main canvas element used for rendering 
    */
    constructor(canvasId) {
        const canvas = document.getElementById(canvasId)
        this.debugParams = {
            backgroundColor: 0x1c2021,
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
        this.debugFolder = this.pane.addFolder({ title: "Dirt Jam", expanded: true })

        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enableDamping = true

        this.stats = new Stats()
        document.body.appendChild(this.stats.dom)

        this.clock = new THREE.Clock()

        window.addEventListener("resize", () => this.resize())

        this.landscape = new Landscape(this.scene, this.camera, this.pane)
    }

    async setup() {
        await this.renderer.init()

        this.debugFolder.addBinding(this.debugParams, "backgroundColor", { label: "Background Color", view: "color", color: { type: "float" } }).on("change", event => {
            this.renderer.setClearColor(event.value)
        })

        this.landscape.setup()
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
        this.update()
        window.requestAnimationFrame(() => this.tick())
    }

    async run() {
        await this.setup()
        this.tick()
    }
}

export { App }
