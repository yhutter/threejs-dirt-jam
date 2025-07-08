import * as THREE from "three"
import { Pane } from "tweakpane"

const canvas = document.getElementById("experience")
let sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))

const scene = new THREE.Scene()

const aspect = sizes.width / sizes.height
const camera = new THREE.PerspectiveCamera(75, aspect, 0.01, 1000)

const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshNormalMaterial()
)
box.position.z = -3
scene.add(box)

const debugObj = {
    backgroundColor: new THREE.Color(0x282828)
}
renderer.setClearColor(debugObj.backgroundColor)

const pane = new Pane()
const folder = pane.addFolder({ title: "Dirt Jam", expanded: true })
folder.addBinding(debugObj, "backgroundColor", { label: "Background Color", view: "color", color: { type: "float" } }).on("change", event => {
    renderer.setClearColor(event.value)
})

const resize = () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    camera.updateProjectionMatrix()
}

window.addEventListener("resize", resize)

const clock = new THREE.Clock()
const tick = () => {
    const deltaTime = clock.getDelta() * 1000
    const elapsedTime = clock.getElapsedTime()
    box.rotation.y = elapsedTime
    renderer.render(scene, camera)
    window.requestAnimationFrame(tick)
}

tick()





