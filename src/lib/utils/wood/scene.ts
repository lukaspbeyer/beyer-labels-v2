/**
 * 3D-Vorschau mit three.js: Label (4 mm Lärche) auf einer Möbelfront.
 * Wird nur auf /holz und erst im Browser dynamisch geladen.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { err, ok, type Result } from '$utils/result';
import { calibration } from './calibration';
import { flattenPath } from './geometry';
import type { SurfaceMaps } from './surface';
import type { LabelLayout, WoodSettings } from './types';

export type SceneError = { kind: 'webgl-unavailable'; message: string };

export interface LabelScene {
	/** Überträgt Geometrie, Texturen und Szene und rendert sofort. */
	update(layout: LabelLayout, maps: SurfaceMaps, settings: WoodSettings): void;
	dispose(): void;
}

const VIEW_ANGLES = {
	front: { azimuth: 0, elevation: 0 },
	oblique: { azimuth: 32, elevation: 14 }
} as const;

function toRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

function dataTexture(image: ImageData, colorSpace: THREE.ColorSpace): THREE.DataTexture {
	const texture = new THREE.DataTexture(new Uint8Array(image.data.buffer), image.width, image.height, THREE.RGBAFormat);
	texture.colorSpace = colorSpace;
	texture.generateMipmaps = true;
	texture.minFilter = THREE.LinearMipmapLinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.anisotropy = 8;
	texture.needsUpdate = true;
	return texture;
}

/** Feine Längsstreifen für die verkohlte Schnittkante. */
function edgeTexture(): THREE.DataTexture {
	const size = 64;
	const data = new Uint8Array(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const streak = Math.sin(x * 2.3) * 0.5 + Math.sin(x * 0.7 + 1.3) * 0.5;
			const v = Math.round(200 + streak * 30 + (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1) * 20);
			const o = (y * size + x) * 4;
			data[o] = v;
			data[o + 1] = v;
			data[o + 2] = v;
			data[o + 3] = 255;
		}
	}
	const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(0.15, 0.4);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.needsUpdate = true;
	return texture;
}

/** Extrudiertes Label, Ursprung in der Mitte, Vorderseite bei z = Dicke. */
function labelGeometry(layout: LabelLayout): THREE.ExtrudeGeometry {
	const polylines = flattenPath(layout.outline, 16);
	const points = (polylines[0] ?? []).map((p) => new THREE.Vector2(p.x - layout.width / 2, layout.height / 2 - p.y));
	const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(points), {
		depth: calibration.label.thicknessMm,
		bevelEnabled: false,
		curveSegments: 1
	});
	// Deckflächen: UV über das ganze Label, v = 0 oben (Zeile 0 der Texturen)
	const uv = geometry.getAttribute('uv');
	const position = geometry.getAttribute('position');
	const caps = geometry.groups[0];
	const end = caps ? caps.start + caps.count : 0;
	for (let i = 0; i < end; i++) {
		uv.setXY(i, position.getX(i) / layout.width + 0.5, 0.5 - position.getY(i) / layout.height);
	}
	uv.needsUpdate = true;
	geometry.computeVertexNormals();
	return geometry;
}

function createRenderer(): Result<THREE.WebGLRenderer, SceneError> {
	try {
		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
		return ok(renderer);
	} catch (e) {
		return err({ kind: 'webgl-unavailable', message: e instanceof Error ? e.message : String(e) });
	}
}

export function createLabelScene(container: HTMLElement): Result<LabelScene, SceneError> {
	const created = createRenderer();
	if (!created.ok) return created;
	const renderer = created.value;
	const cal = calibration;

	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = cal.light.exposure;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	renderer.domElement.style.display = 'block';
	renderer.domElement.style.width = '100%';
	renderer.domElement.style.height = '100%';
	renderer.domElement.style.touchAction = 'none';
	container.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	const pmrem = new THREE.PMREMGenerator(renderer);
	const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
	scene.environment = environment;
	scene.environmentIntensity = cal.light.environment;

	const hemisphere = new THREE.HemisphereLight('#fffaf2', '#b9a891', cal.light.ambient);
	scene.add(hemisphere);
	const sun = new THREE.DirectionalLight(cal.light.color, cal.light.intensity);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	sun.shadow.bias = -0.0004;
	sun.shadow.normalBias = 0.4;
	sun.shadow.radius = 4;
	scene.add(sun);
	scene.add(sun.target);

	const frontMaterial = new THREE.MeshStandardMaterial({ roughness: cal.front.roughness, metalness: 0 });
	const front = new THREE.Mesh(new THREE.BoxGeometry(1200, 1000, 18), frontMaterial);
	front.position.z = -9;
	front.receiveShadow = true;
	scene.add(front);

	const faceMaterial = new THREE.MeshPhysicalMaterial({ roughness: 1, metalness: 0 });
	const edgeMaterial = new THREE.MeshStandardMaterial({ map: edgeTexture() });
	const label = new THREE.Mesh(new THREE.BufferGeometry(), [faceMaterial, edgeMaterial]);
	label.position.z = cal.label.tapeGapMm;
	label.castShadow = true;
	label.receiveShadow = true;
	scene.add(label);

	const camera = new THREE.PerspectiveCamera(20, 1, 5, 8000);
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.enablePan = false;
	controls.minAzimuthAngle = toRad(-65);
	controls.maxAzimuthAngle = toRad(65);
	controls.minPolarAngle = toRad(25);
	controls.maxPolarAngle = toRad(155);

	let viewKey = '';
	let geometryKey = '';
	let currentMaps: SurfaceMaps | null = null;
	let fit = { distance: 400, target: new THREE.Vector3() };
	let dirty = true;
	let frame = 0;
	let disposed = false;

	function render(): void {
		renderer.render(scene, camera);
		dirty = false;
	}

	function resize(): void {
		const w = Math.max(1, container.clientWidth);
		const h = Math.max(1, container.clientHeight);
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		applyFit();
		dirty = true;
	}

	/** Abstand, bei dem das Label mit ruhigem Rand auf der Front steht. */
	function computeFit(layout: LabelLayout): { distance: number; target: THREE.Vector3 } {
		const halfWidth = Math.max(layout.width * 0.8, 50);
		const halfHeight = Math.max(layout.height * 1.1, 30);
		const t = Math.tan(toRad(camera.fov / 2));
		const distance = Math.max(halfHeight / t, halfWidth / (t * camera.aspect));
		return { distance, target: new THREE.Vector3(0, 0, 0) };
	}

	function applyFit(): void {
		if (!viewKey) return;
		const view = VIEW_ANGLES[viewKey.startsWith('oblique') ? 'oblique' : 'front'];
		const az = toRad(view.azimuth);
		const el = toRad(view.elevation);
		controls.target.copy(fit.target);
		camera.position.set(
			fit.target.x + fit.distance * Math.sin(az) * Math.cos(el),
			fit.target.y + fit.distance * Math.sin(el),
			fit.target.z + fit.distance * Math.cos(az) * Math.cos(el)
		);
		controls.minDistance = fit.distance * 0.3;
		controls.maxDistance = fit.distance * 1.8;
		controls.update();
	}

	function placeLight(settings: WoodSettings, layout: LabelLayout): void {
		const az = toRad(settings.lightAngle);
		const el = toRad(cal.light.elevationDeg);
		const dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el));
		sun.position.copy(dir.multiplyScalar(600));
		sun.target.position.set(0, 0, 0);
		const extent = Math.max(layout.width, layout.height) * 0.8 + 60;
		const shadowCam = sun.shadow.camera;
		shadowCam.left = -extent;
		shadowCam.right = extent;
		shadowCam.top = extent;
		shadowCam.bottom = -extent;
		shadowCam.near = 100;
		shadowCam.far = 1200;
		shadowCam.updateProjectionMatrix();
	}

	function replaceTexture(current: THREE.Texture | null, next: THREE.Texture): THREE.Texture {
		current?.dispose();
		return next;
	}

	function update(layout: LabelLayout, maps: SurfaceMaps, settings: WoodSettings): void {
		const nextGeometryKey = `${layout.width}|${layout.height}|${settings.shape}|${settings.cornerRadius}`;
		if (nextGeometryKey !== geometryKey) {
			label.geometry.dispose();
			label.geometry = labelGeometry(layout);
			geometryKey = nextGeometryKey;
		}

		const finish = cal.finish[settings.finish];
		if (maps !== currentMaps) {
			faceMaterial.map = replaceTexture(faceMaterial.map, dataTexture(maps.albedo, THREE.SRGBColorSpace));
			faceMaterial.normalMap = replaceTexture(faceMaterial.normalMap, dataTexture(maps.normal, THREE.NoColorSpace));
			faceMaterial.roughnessMap = replaceTexture(faceMaterial.roughnessMap, dataTexture(maps.roughness, THREE.NoColorSpace));
			currentMaps = maps;
		}
		// Zeile 0 der Texturen liegt oben (v nach unten), daher Grünkanal spiegeln
		faceMaterial.normalScale.set(1, -1);
		faceMaterial.clearcoat = finish.clearcoat;
		faceMaterial.clearcoatRoughness = finish.clearcoatRoughness;
		faceMaterial.needsUpdate = true;

		frontMaterial.color.set(cal.front.color[settings.front]);
		edgeMaterial.color.set(cal.edge[settings.edge].color);
		edgeMaterial.roughness = cal.edge[settings.edge].roughness;
		placeLight(settings, layout);

		const nextViewKey = `${settings.view}|${layout.width}|${layout.height}`;
		if (nextViewKey !== viewKey) {
			viewKey = nextViewKey;
			fit = computeFit(layout);
			applyFit();
		}
		render();
	}

	function loop(): void {
		if (disposed) return;
		if (controls.update() || dirty) render();
		frame = requestAnimationFrame(loop);
	}

	const observer = new ResizeObserver(resize);
	observer.observe(container);
	controls.addEventListener('change', () => {
		dirty = true;
	});
	resize();
	frame = requestAnimationFrame(loop);

	function dispose(): void {
		disposed = true;
		cancelAnimationFrame(frame);
		observer.disconnect();
		controls.dispose();
		scene.traverse((o) => {
			if (o instanceof THREE.Mesh) {
				o.geometry.dispose();
				const materials: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material];
				for (const m of materials) {
					if (m instanceof THREE.MeshStandardMaterial) {
						m.map?.dispose();
						m.normalMap?.dispose();
						m.roughnessMap?.dispose();
					}
					m.dispose();
				}
			}
		});
		environment.dispose();
		pmrem.dispose();
		renderer.dispose();
		renderer.domElement.remove();
	}

	return ok({ update, dispose });
}
