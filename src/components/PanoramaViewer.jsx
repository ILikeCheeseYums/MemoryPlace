import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * PanoramaViewer — Three.js equirectangular sphere panorama renderer (3D Orb mode).
 *
 * Maps equirectangular image texture to the inside of a 3D SphereGeometry.
 * PerspectiveCamera sits at center and can be freely panned/tilted in 360° and zoomed.
 *
 * Props:
 *   imageUrl     {string} — equirectangular image URL (blob or http)
 *   onReady      {fn}     — called once texture is loaded
 *   onLonChange  {fn}     — called with current longitude for arrow alignment
 *   onResetRef   {fn}     — passed a function to reset camera view
 *   className    {string} — extra Tailwind classes
 */
export default function PanoramaViewer({
  imageUrl,
  onReady,
  onLonChange,
  onResetRef,
  className = "",
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const frameRef = useRef(null);

  /* ── Initialise Three.js scene ── */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || window.innerWidth;
    const H = mount.clientHeight || window.innerHeight;

    /* ─ Renderer ─ */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    /* ─ Scene ─ */
    const scene = new THREE.Scene();

    /* ─ Camera: FOV 75°, sits at origin looking forward ─ */
    const camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 1000);
    camera.position.set(0, 0, 0.01);

    /* ─ Sphere: radius 500, invert X for equirectangular inside mapping ─ */
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    /* ─ Texture loader ─ */
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    const material = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    /* ─ Camera euler angles ─ */
    let lon = 0; // horizontal rotation in degrees
    let lat = 0; // vertical rotation in degrees

    /* ─ Drag state ─ */
    let isDown = false;
    let lastX = 0, lastY = 0;
    let touchDist = 0;

    /* ─ FOV (zoom) ─ */
    let fov = 75;
    const FOV_MIN = 30, FOV_MAX = 100;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const toRad = (d) => (d * Math.PI) / 180;

    const updateCamera = () => {
      lat = clamp(lat, -85, 85);
      const phi = toRad(90 - lat);
      const theta = toRad(lon);
      camera.lookAt(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      );
      onLonChange?.(lon);
    };

    /* ─ Pointer handlers (mouse) ─ */
    const onMouseDown = (e) => {
      if (e.target.closest?.(".streetview-arrow") || e.target.closest?.(".ui-button")) return;
      isDown = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onMouseMove = (e) => {
      if (!isDown) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lon -= dx * 0.25;
      lat += dy * 0.25;
      lastX = e.clientX;
      lastY = e.clientY;
      updateCamera();
    };
    const onMouseUp = () => {
      isDown = false;
    };

    /* ─ Touch handlers ─ */
    const onTouchStart = (e) => {
      if (e.target.closest?.(".streetview-arrow") || e.target.closest?.(".ui-button")) return;
      if (e.touches.length === 1) {
        isDown = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        isDown = false;
        touchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 1 && isDown) {
        const dx = e.touches[0].clientX - lastX;
        const dy = e.touches[0].clientY - lastY;
        lon -= dx * 0.25;
        lat += dy * 0.25;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        updateCamera();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        fov -= (dist - touchDist) * 0.05;
        fov = clamp(fov, FOV_MIN, FOV_MAX);
        camera.fov = fov;
        camera.updateProjectionMatrix();
        touchDist = dist;
      }
    };
    const onTouchEnd = () => {
      isDown = false;
    };

    /* ─ Scroll wheel zoom ─ */
    const onWheel = (e) => {
      e.preventDefault();
      fov += e.deltaY * 0.04;
      fov = clamp(fov, FOV_MIN, FOV_MAX);
      camera.fov = fov;
      camera.updateProjectionMatrix();
    };

    /* ─ Resize ─ */
    const onResize = () => {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    /* ─ External Controls bridge ─ */
    const handlePanoZoom = (e) => {
      fov = clamp(fov + (e.detail || 0), FOV_MIN, FOV_MAX);
      camera.fov = fov;
      camera.updateProjectionMatrix();
    };
    const handlePanoReset = () => {
      lon = 0;
      lat = 0;
      fov = 75;
      camera.fov = fov;
      camera.updateProjectionMatrix();
      updateCamera();
    };

    if (onResetRef) {
      onResetRef(() => handlePanoReset());
    }

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    mount.addEventListener("touchstart", onTouchStart, { passive: true });
    mount.addEventListener("touchmove", onTouchMove, { passive: false });
    mount.addEventListener("touchend", onTouchEnd);
    mount.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);
    window.addEventListener("pano-zoom", handlePanoZoom);
    window.addEventListener("pano-reset", handlePanoReset);

    stateRef.current = {
      renderer,
      scene,
      camera,
      mesh,
      loader,
    };

    /* ─ Render loop ─ */
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      mount.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      mount.removeEventListener("touchstart", onTouchStart);
      mount.removeEventListener("touchmove", onTouchMove);
      mount.removeEventListener("touchend", onTouchEnd);
      mount.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pano-zoom", handlePanoZoom);
      window.removeEventListener("pano-reset", handlePanoReset);
      renderer.dispose();
      geometry.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  /* ── Texture loader ── */
  useEffect(() => {
    const { loader, mesh } = stateRef.current;
    if (!loader || !mesh || !imageUrl) return;

    let cancelled = false;

    loader.load(
      imageUrl,
      (texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        if (mesh.material.map) mesh.material.map.dispose();
        mesh.material.map = texture;
        mesh.material.color = new THREE.Color(0xffffff);
        mesh.material.needsUpdate = true;
        onReady?.();
      },
      undefined,
      (err) => console.warn("[PanoramaViewer] texture load error", err)
    );

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return (
    <div
      ref={mountRef}
      className={`absolute inset-0 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing ${className}`}
      style={{ touchAction: "none" }}
    />
  );
}
