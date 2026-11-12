"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type {
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Texture,
  WebGLRenderTarget,
} from "three";
import { assetPath } from "@/lib/assets";
import { labelPath, type Release } from "@/data/band";
import {
  damp,
  glide,
  slotAtPoint,
  slotPose,
  slotRank,
  type TrackMotion,
} from "@/lib/disc-layout";
import { wrapIndex } from "@/lib/carousel";
import { getSkyPeriod, skyEnvironments } from "@/lib/sky-environments";

// Orientation of the HDR that lights the discs. The visible sky is a CSS
// layer behind the transparent canvas, so drifting it costs no WebGL frames.
const SKY_YAW = Math.PI * 1.9;
const SKY_PITCH = -0.45;
const ENVIRONMENT_INTENSITY = 1;
const EXPOSURE = 1;
const LABEL_ROLL = 0;
const SPIN_SPEED = 1.6;
const CAMERA_DISTANCE = 10;
const CAMERA_FOV = 30;
const TILT_MAX = 0.12;
// Selection glide: critically damped, ~1s to settle a one-slot step.
const TRACK_OMEGA = 4.6;
// Yaw lean while the stack moves, and the speed that produces a full lean.
const TRACK_LEAN = 0.11;
const TRACK_LEAN_VELOCITY = 2.2;
// Spin: ~1s from standstill to full speed, a longer natural coast down, then
// a gentle settle back to upright.
const SPIN_ACCEL = 2.8;
const SPIN_DECEL = 1.9;
const SPIN_RETURN = 2.2;
const TILT_EASE = 8;
const TAU = Math.PI * 2;
const LABEL_PREFIX = "A04_Scarlet_Glow";
const LABEL_EXCLUDED = "A04_Scarlet_Glow6";
const DRAG_THRESHOLD = 45;
const WHEEL_THRESHOLD = 50;

interface DiscStageProps {
  releases: readonly Release[];
  cursor: number;
  playing: boolean;
  onStep: (steps: number) => void;
  onToggle: () => void;
}

interface Disc {
  slot: Group;
  tilt: Group;
  spin: Group;
  spinSpeed: number;
  material?: MeshStandardMaterial;
}

type Status = "loading" | "ready" | "error";

function disposeObject(root: Object3D) {
  const textures = new Set<Texture>();
  const materials = new Set<Material>();
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material))
        if (value && typeof value === "object" && "isTexture" in value)
          textures.add(value as Texture);
    }
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
}

function isLabelMaterial(material: Material) {
  return (
    material.name.startsWith(LABEL_PREFIX) && material.name !== LABEL_EXCLUDED
  );
}

function findLabelMesh(root: Object3D): Mesh | undefined {
  let found: Mesh | undefined;
  root.traverse((object) => {
    if (found) return;
    const mesh = object as Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    if (materials.some(isLabelMaterial)) found = mesh;
  });
  return found;
}

export const DiscStage = memo(function DiscStage({
  releases,
  cursor,
  playing,
  onStep,
  onToggle,
}: DiscStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLImageElement>(null);
  const handlers = useRef({ onStep, onToggle });
  const press = useRef<{ id: number; x: number; y: number } | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const finePointer = useRef<MediaQueryList | null>(null);
  const discPx = useRef(0);
  const cursorRef = useRef(cursor);
  const playingRef = useRef(playing);
  const api = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  handlers.current = { onStep, onToggle };

  useEffect(() => {
    cursorRef.current = cursor;
    api.current?.();
  }, [cursor]);

  useEffect(() => {
    playingRef.current = playing;
    api.current?.();
  }, [playing]);

  useEffect(() => {
    const stage = stageRef.current!;
    const canvas = canvasRef.current!;
    const fallback = fallbackRef.current!;
    const abort = new AbortController();
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    finePointer.current = fine;
    // The local hour only exists on the client, so the sky is chosen here.
    const sky = skyEnvironments[getSkyPeriod(new Date().getHours())];
    stage.dataset.skyPeriod = sky.period;
    const skyLayer = skyRef.current!;
    skyLayer.dataset.period = sky.period;
    skyLayer.style.setProperty(
      "--sky-image",
      `url("${assetPath(sky.background.webp4k)}")`,
    );
    let disposed = false;
    let started = false;
    let visible = false;
    let cleanup: (() => void) | undefined;

    async function initialize() {
      try {
        const [THREE, { GLTFLoader }, { HDRLoader }] = await Promise.all([
          import("three"),
          import("three/addons/loaders/GLTFLoader.js"),
          import("three/addons/loaders/HDRLoader.js"),
        ]);
        const items = releases;
        if (disposed || !items.length) return;

        const renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
        });
        renderer.setClearColor(0, 0);
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = EXPOSURE;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
        camera.position.set(0, 0, CAMERA_DISTANCE);
        camera.lookAt(0, 0, 0);

        const light = new THREE.DirectionalLight(0xffffff, 2);
        light.position.set(3, 5, 8);
        scene.add(light);

        const root = new THREE.Group();
        scene.add(root);

        const resources: {
          environment?: WebGLRenderTarget;
          model?: Object3D;
        } = {};
        const discs: Disc[] = [];
        const angles: number[] = items.map(() => 0);
        const labelTextures: Texture[] = [];
        const readyLabels = new Set<string>();
        let announced = false;
        let track: TrackMotion = { cursor: cursorRef.current, velocity: 0 };
        let frame = 0;
        let previous = 0;
        let dirty = false;
        let released = false;

        function announceIfReady() {
          if (announced) return;
          const active = items[wrapIndex(cursorRef.current, items.length)];
          if (!readyLabels.has(active.id)) return;
          announced = true;
          setStatus("ready");
        }

        function schedule() {
          dirty = true;
          if (frame || disposed || released || !visible || document.hidden)
            return;
          frame = requestAnimationFrame(render);
        }

        function update(dt: number): boolean {
          let moving = false;
          const reduced = motion.matches;
          const target = cursorRef.current;
          if (reduced) {
            track = { cursor: target, velocity: 0 };
          } else {
            track = glide(track, target, TRACK_OMEGA, dt);
            if (track.cursor !== target || track.velocity !== 0) moving = true;
          }
          const lean =
            Math.max(-1, Math.min(1, -track.velocity / TRACK_LEAN_VELOCITY)) *
            TRACK_LEAN;

          const active = wrapIndex(target, items.length);
          for (let index = 0; index < discs.length; index++) {
            const disc = discs[index];
            const wantedSpeed =
              index === active && playingRef.current && !reduced
                ? SPIN_SPEED
                : 0;
            disc.spinSpeed = reduced
              ? 0
              : damp(
                  disc.spinSpeed,
                  wantedSpeed,
                  wantedSpeed > disc.spinSpeed ? SPIN_ACCEL : SPIN_DECEL,
                  dt,
                );
            if (Math.abs(disc.spinSpeed - wantedSpeed) < 0.002)
              disc.spinSpeed = wantedSpeed;
            const pose = slotPose(
              slotRank(index, track.cursor, items.length),
              items.length,
            );
            disc.slot.position.set(pose.x, 0, pose.z);
            disc.slot.rotation.y = pose.yaw + lean;
            disc.slot.scale.setScalar(pose.scale);

            let angle = reduced ? 0 : angles[index];
            if (disc.spinSpeed > 0) {
              angle = (angle + disc.spinSpeed * dt) % TAU;
              moving = true;
            } else if (angle !== 0) {
              const upright = Math.round(angle / TAU) * TAU;
              if (Math.abs(upright - angle) < 0.001) angle = 0;
              else {
                angle = damp(angle, upright, SPIN_RETURN, dt);
                moving = true;
              }
            }
            angles[index] = angle;
            disc.spin.rotation.z = LABEL_ROLL + angle;

            const tilt =
              index === active &&
              !reduced &&
              fine.matches &&
              pointer.current !== null
                ? pointer.current
                : null;
            const targetX = tilt ? -tilt.y * TILT_MAX : 0;
            const targetY = tilt ? tilt.x * TILT_MAX : 0;
            let x = disc.tilt.rotation.x;
            let y = disc.tilt.rotation.y;
            if (reduced) {
              x = targetX;
              y = targetY;
            } else {
              const nextX = damp(x, targetX, TILT_EASE, dt);
              const nextY = damp(y, targetY, TILT_EASE, dt);
              x = Math.abs(nextX - targetX) < 0.0005 ? targetX : nextX;
              y = Math.abs(nextY - targetY) < 0.0005 ? targetY : nextY;
            }
            if (x !== disc.tilt.rotation.x || y !== disc.tilt.rotation.y)
              moving = true;
            disc.tilt.rotation.set(x, y, 0);
          }
          return moving;
        }

        function render(time: number) {
          frame = 0;
          dirty = false;
          if (disposed || released || !visible || document.hidden) {
            previous = 0;
            return;
          }
          const dt = previous
            ? Math.min((time - previous) / 1000, 0.25)
            : 1 / 60;
          previous = time;
          const moving = update(dt);
          renderer.render(scene, camera);
          if (moving || dirty) frame = requestAnimationFrame(render);
          else previous = 0;
        }

        function resize() {
          if (disposed || released) return;
          const width = canvas.clientWidth;
          const height = canvas.clientHeight;
          if (!width || !height) return;
          renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          // World units per CSS pixel at z=0, so the discs keep their CSS size.
          const k =
            (2 * CAMERA_DISTANCE * Math.tan((CAMERA_FOV * Math.PI) / 360)) /
            height;
          const stageRect = stage.getBoundingClientRect();
          const canvasRect = canvas.getBoundingClientRect();
          const centerX =
            stageRect.left + stageRect.width / 2 - canvasRect.left;
          const centerY = stageRect.top + stageRect.height / 2 - canvasRect.top;
          root.position.set(
            (centerX - width / 2) * k,
            (height / 2 - centerY) * k,
            0,
          );
          const size = fallback.getBoundingClientRect().width;
          discPx.current = size;
          root.scale.setScalar(Math.max(size, 1) * k);
          schedule();
        }

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);
        resizeObserver.observe(stage);

        cleanup = () => {
          if (released) return;
          released = true;
          cancelAnimationFrame(frame);
          resizeObserver.disconnect();
          if (resources.model) disposeObject(resources.model);
          disposeObject(root);
          labelTextures.forEach((texture) => texture.dispose());
          resources.environment?.dispose();
          renderer.dispose();
          api.current = null;
        };

        canvas.addEventListener(
          "webglcontextlost",
          (event) => {
            event.preventDefault();
            visible = false;
            cleanup?.();
            setStatus("error");
          },
          { signal: abort.signal },
        );
        motion.addEventListener("change", schedule, { signal: abort.signal });
        fine.addEventListener("change", schedule, { signal: abort.signal });

        const textureLoader = new THREE.TextureLoader();
        const skyYaw = SKY_YAW + (sky.rotationDeg * Math.PI) / 180;
        const hdr = await new HDRLoader().loadAsync(assetPath(sky.reflection));
        if (disposed || released) {
          hdr.dispose();
          return;
        }
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        const generator = new THREE.PMREMGenerator(renderer);
        const environment = generator.fromEquirectangular(hdr);
        resources.environment = environment;
        scene.environment = environment.texture;
        scene.environmentIntensity = ENVIRONMENT_INTENSITY * sky.exposure;
        scene.environmentRotation.set(SKY_PITCH, skyYaw, 0, "YXZ");
        hdr.dispose();
        generator.dispose();

        const gltf = await new GLTFLoader().loadAsync(
          assetPath("/assets/models/cd/cd.glb"),
        );
        if (disposed || released) {
          disposeObject(gltf.scene);
          return;
        }
        const model = gltf.scene;
        resources.model = model;

        // Recenter, aim the printed label at the camera and normalise diameter.
        const bounds = new THREE.Box3().setFromObject(model);
        model.position.sub(bounds.getCenter(new THREE.Vector3()));
        const wrapper = new THREE.Group();
        wrapper.add(model);
        const label = findLabelMesh(model);
        if (!label) throw new Error("CD label mesh missing");
        model.updateMatrixWorld(true);
        const normals = label.geometry.getAttribute("normal");
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(
          label.matrixWorld,
        );
        const faceNormal = new THREE.Vector3()
          .fromBufferAttribute(normals, 0)
          .applyMatrix3(normalMatrix)
          .normalize();
        wrapper.quaternion.setFromUnitVectors(
          faceNormal,
          new THREE.Vector3(0, 0, 1),
        );
        wrapper.updateMatrixWorld(true);
        const size = new THREE.Box3()
          .setFromObject(wrapper)
          .getSize(new THREE.Vector3());
        wrapper.scale.setScalar(1 / Math.max(size.x, size.y, size.z));

        for (let index = 0; index < items.length; index++) {
          const slot = new THREE.Group();
          const tilt = new THREE.Group();
          const spin = new THREE.Group();
          spin.rotation.z = LABEL_ROLL;
          spin.add(wrapper.clone(true));
          tilt.add(spin);
          slot.add(tilt);
          root.add(slot);
          const instance = spin.children[0];
          const labelMesh = findLabelMesh(instance);
          let material: MeshStandardMaterial | undefined;
          if (labelMesh) {
            const source = Array.isArray(labelMesh.material)
              ? labelMesh.material[0]
              : labelMesh.material;
            material = (source as MeshStandardMaterial).clone();
            material.map = null;
            material.needsUpdate = true;
            labelMesh.material = material;
          }
          discs.push({ slot, tilt, spin, spinSpeed: 0, material });
        }

        for (const [index, item] of items.entries()) {
          void textureLoader.loadAsync(assetPath(labelPath(item))).then(
            (texture) => {
              if (disposed || released) {
                texture.dispose();
                return;
              }
              texture.flipY = false;
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
              labelTextures.push(texture);
              const material = discs[index].material;
              if (material) {
                material.map = texture;
                material.needsUpdate = true;
              }
              readyLabels.add(item.id);
              announceIfReady();
              schedule();
            },
            () => {
              if (
                !announced &&
                items[wrapIndex(cursorRef.current, items.length)].id === item.id
              )
                setStatus("error");
            },
          );
        }

        api.current = () => {
          announceIfReady();
          schedule();
        };
        resize();
        announceIfReady();
      } catch {
        if (!disposed) {
          cleanup?.();
          setStatus("error");
        }
      }
    }

    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !started) {
        started = true;
        void initialize();
      }
      if (visible) api.current?.();
    });
    visibility.observe(canvas);
    document.addEventListener("visibilitychange", () => api.current?.(), {
      signal: abort.signal,
    });

    let accumulated = 0;
    function wheel(event: WheelEvent) {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      accumulated += event.deltaX * (event.deltaMode === 1 ? 16 : 1);
      if (Math.abs(accumulated) >= WHEEL_THRESHOLD) {
        handlers.current.onStep(Math.sign(accumulated));
        accumulated = 0;
      }
    }
    stage.addEventListener("wheel", wheel, {
      passive: false,
      signal: abort.signal,
    });

    return () => {
      disposed = true;
      abort.abort();
      visibility.disconnect();
      cleanup?.();
    };
  }, [releases]);

  const release = releases[wrapIndex(cursor, releases.length)];

  function normalize(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        -1,
        Math.min(
          1,
          (event.clientX - rect.left - rect.width / 2) / (rect.width / 2),
        ),
      ),
      y: Math.max(
        -1,
        Math.min(
          1,
          (event.clientY - rect.top - rect.height / 2) / (rect.height / 2),
        ),
      ),
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    press.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    if (finePointer.current?.matches) {
      pointer.current = normalize(event);
      api.current?.();
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!finePointer.current?.matches) return;
    pointer.current = normalize(event);
    api.current?.();
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = press.current;
    press.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > DRAG_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      handlers.current.onStep(dx < 0 ? 1 : -1);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const span = discPx.current || 1;
    const offset = (event.clientX - (rect.left + rect.width / 2)) / span;
    const rank = slotAtPoint(
      offset,
      (event.clientY - (rect.top + rect.height / 2)) / span,
      releases.length,
    );
    if (rank !== null) {
      if (rank === 0) handlers.current.onToggle();
      else handlers.current.onStep(rank);
      return;
    }
    if (Math.abs(offset) <= 0.5) handlers.current.onToggle();
    else handlers.current.onStep(offset > 0 ? 1 : -1);
  }

  return (
    <>
      <div className="disc-sky" ref={skyRef} aria-hidden="true">
        <div className="disc-sky__drift" />
      </div>
      <canvas ref={canvasRef} className="disc-canvas" aria-hidden="true" />
      <div
        className="disc-stage"
        ref={stageRef}
        data-state={status}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          press.current = null;
          pointer.current = null;
          api.current?.();
        }}
        onPointerCancel={() => {
          press.current = null;
        }}
      >
        {release && (
          <img
            className="disc-fallback"
            ref={fallbackRef}
            src={assetPath(labelPath(release))}
            alt=""
          />
        )}
      </div>
    </>
  );
});
