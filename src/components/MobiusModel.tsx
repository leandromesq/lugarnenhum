"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Object3D, Mesh, Material, Texture, Quaternion } from "three";
import { assetPath } from "@/lib/assets";
import {
  coast,
  fidgetPhysics,
  dragRotation,
  dragVelocity,
  type Spin,
} from "@/lib/mobius-physics";

function disposeModel(model: Object3D) {
  const textures = new Set<Texture>();
  const materials = new Set<Material>();
  model.traverse((object) => {
    const mesh = object as Mesh;
    mesh.geometry?.dispose();
    if (mesh.material) {
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value && typeof value === "object" && "isTexture" in value)
            textures.add(value as Texture);
      }
    }
  });
  textures.forEach((texture) => {
    texture.dispose();
    const source = texture.image;
    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap)
      source.close();
  });
  materials.forEach((material) => material.dispose());
}

export function MobiusModel() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const actions = useRef<{
    rotate: (x: number, y: number) => void;
    stop: () => void;
  } | null>(null);
  const instruction = useId();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const element = host.current!;
    const surface = canvas.current!;
    const abort = new AbortController();
    let disposed = false;
    let started = false;
    let visible = false;
    let release: (() => void) | undefined;
    let wake: (() => void) | undefined;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");

    async function initialize() {
      try {
        const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
          import("three"),
          import("three/addons/loaders/GLTFLoader.js"),
          import("three/addons/environments/RoomEnvironment.js"),
        ]);
        if (disposed) return;
        const renderer = new THREE.WebGLRenderer({
          canvas: surface,
          alpha: true,
          antialias: true,
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setClearColor(0, 0);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 0.4, 5);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        const generator = new THREE.PMREMGenerator(renderer);
        const room = new RoomEnvironment();
        const environment = generator.fromScene(room);
        room.dispose();
        generator.dispose();
        scene.environment = environment.texture;
        scene.environmentIntensity = 1.4;
        scene.add(new THREE.HemisphereLight(0xe8f2ff, 0x53525c, 2));
        const light = new THREE.DirectionalLight(0xf5f5f5, 3);
        light.position.set(3, 4, 5);
        scene.add(light);
        const content: {
          model?: Object3D;
          pivot?: Object3D;
          homePose?: Quaternion;
        } = {};
        let released = false;
        let frame = 0;
        let previous = 0;
        let pointer: { id: number; x: number; y: number; time: number } | null =
          null;
        let interacted = false;
        let velocity: Spin = { x: 0, y: 0 };
        let idleTimer = 0;
        let returning = false;
        let returnElapsed = 0;
        const returnStart = new THREE.Quaternion();

        function cancelReturn() {
          clearTimeout(idleTimer);
          idleTimer = 0;
          returning = false;
        }
        function armReturn() {
          clearTimeout(idleTimer);
          if (motion.matches || disposed || released || pointer) return;
          idleTimer = window.setTimeout(() => {
            idleTimer = 0;
            if (
              !content.pivot ||
              motion.matches ||
              disposed ||
              released ||
              pointer
            )
              return;
            returnStart.copy(content.pivot.quaternion);
            returnElapsed = 0;
            returning = true;
            previous = 0;
            schedule();
          }, fidgetPhysics.idleAfterMs);
        }
        const right = new THREE.Vector3().setFromMatrixColumn(
          camera.matrixWorld,
          0,
        );
        const up = new THREE.Vector3().setFromMatrixColumn(
          camera.matrixWorld,
          1,
        );
        const axis = new THREE.Vector3();
        const rotation = new THREE.Quaternion();

        function applyRotation(angles: Spin) {
          if (!content.pivot) return;
          axis
            .copy(right)
            .multiplyScalar(angles.x)
            .addScaledVector(up, angles.y);
          const amount = axis.length();
          if (amount === 0) return;
          rotation.setFromAxisAngle(axis.normalize(), amount);
          content.pivot.quaternion.premultiply(rotation).normalize();
        }
        function schedule() {
          if (!frame && visible && !document.hidden && !disposed && !released)
            frame = requestAnimationFrame(render);
        }
        function render(time: number) {
          frame = 0;
          if (disposed || released || !visible || document.hidden) {
            previous = 0;
            return;
          }
          const delta = previous
            ? Math.min((time - previous) / 1000, 0.05)
            : 1 / 60;
          previous = time;
          let moving = false;
          if (!pointer && !motion.matches && content.pivot) {
            if (returning && content.homePose) {
              returnElapsed += delta;
              const progress = Math.min(
                1,
                returnElapsed / fidgetPhysics.returnSeconds,
              );
              const blend = progress * progress * (3 - 2 * progress);
              content.pivot.quaternion.slerpQuaternions(
                returnStart,
                content.homePose,
                blend,
              );
              moving = true;
              if (progress === 1) {
                returning = false;
                interacted = false;
                velocity = { x: 0, y: 0 };
              }
            } else if (!interacted) {
              applyRotation({ x: 0, y: delta * fidgetPhysics.idleSpeed });
              moving = true;
            } else {
              const next = coast(velocity, delta);
              velocity = next.velocity;
              applyRotation(next.rotation);
              moving = Math.hypot(velocity.x, velocity.y) > 0;
            }
          }
          renderer.render(scene, camera);
          if (moving) schedule();
          else previous = 0;
        }
        function resize() {
          const size = element.clientWidth;
          renderer.setSize(size, size, false);
          schedule();
        }
        function down(event: PointerEvent) {
          if (
            !content.pivot ||
            pointer ||
            event.button !== 0 ||
            !event.isPrimary
          )
            return;
          event.preventDefault();
          cancelReturn();
          surface.focus({ preventScroll: true });
          surface.setPointerCapture(event.pointerId);
          pointer = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            time: event.timeStamp,
          };
          velocity = { x: 0, y: 0 };
          interacted = true;
          schedule();
        }
        function move(event: PointerEvent) {
          if (!pointer || pointer.id !== event.pointerId) return;
          const angles = dragRotation(
            event.clientX - pointer.x,
            event.clientY - pointer.y,
            element.clientWidth,
          );
          applyRotation(angles);
          velocity = motion.matches
            ? { x: 0, y: 0 }
            : dragVelocity(velocity, angles, event.timeStamp - pointer.time);
          pointer = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            time: event.timeStamp,
          };
          schedule();
        }
        function end(event: PointerEvent) {
          if (!pointer || pointer.id !== event.pointerId) return;
          // Holding still before release intentionally stops a fling.
          if (
            event.type !== "pointerup" ||
            event.timeStamp - pointer.time > 100
          )
            velocity = { x: 0, y: 0 };
          pointer = null;
          if (surface.hasPointerCapture(event.pointerId))
            surface.releasePointerCapture(event.pointerId);
          armReturn();
          schedule();
        }
        for (const [event, listener] of [
          ["pointerdown", down],
          ["pointermove", move],
          ["pointerup", end],
          ["pointercancel", end],
          ["lostpointercapture", end],
        ] as const)
          surface.addEventListener(event, listener, { signal: abort.signal });
        const observer = new ResizeObserver(resize);
        observer.observe(element);
        resize();
        wake = schedule;
        actions.current = {
          rotate(x, y) {
            cancelReturn();
            interacted = true;
            applyRotation({ x, y });
            velocity = motion.matches ? { x: 0, y: 0 } : { x: x * 5, y: y * 5 };
            armReturn();
            schedule();
          },
          stop() {
            cancelReturn();
            interacted = true;
            velocity = { x: 0, y: 0 };
            schedule();
          },
        };
        surface.addEventListener(
          "webglcontextlost",
          (event) => {
            event.preventDefault();
            visible = false;
            release?.();
            setStatus("error");
          },
          { signal: abort.signal },
        );
        motion.addEventListener(
          "change",
          () => {
            cancelReturn();
            velocity = { x: 0, y: 0 };
            if (!motion.matches && interacted) armReturn();
            schedule();
          },
          { signal: abort.signal },
        );
        window.addEventListener(
          "blur",
          () => {
            if (pointer && surface.hasPointerCapture(pointer.id))
              surface.releasePointerCapture(pointer.id);
            pointer = null;
            velocity = { x: 0, y: 0 };
            schedule();
          },
          { signal: abort.signal },
        );
        release = () => {
          released = true;
          cancelReturn();
          cancelAnimationFrame(frame);
          observer.disconnect();
          if (pointer && surface.hasPointerCapture(pointer.id))
            surface.releasePointerCapture(pointer.id);
          pointer = null;
          if (content.model) disposeModel(content.model);
          environment.dispose();
          renderer.dispose();
          actions.current = null;
        };
        const response = await fetch(
          assetPath("/assets/models/mobius-strip.glb"),
          { signal: abort.signal },
        );
        if (!response.ok) throw new Error("Model could not be loaded");
        const gltf = await new GLTFLoader().parseAsync(
          await response.arrayBuffer(),
          assetPath("/assets/models/"),
        );
        if (disposed || released) {
          disposeModel(gltf.scene);
          return;
        }
        const model = gltf.scene;
        content.model = model;
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const group = new THREE.Group();
        model.position.sub(center);
        group.add(model);
        group.scale.setScalar(2.5 / Math.max(size.x, size.y, size.z));
        group.rotation.set(0.35, 0.2, 0.15);
        content.homePose = group.quaternion.clone();
        content.pivot = group;
        scene.add(group);
        setStatus("ready");
        schedule();
      } catch {
        if (!disposed) {
          release?.();
          release = undefined;
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
      wake?.();
    });
    visibility.observe(element);
    document.addEventListener("visibilitychange", () => wake?.(), {
      signal: abort.signal,
    });
    return () => {
      disposed = true;
      abort.abort();
      visibility.disconnect();
      release?.();
    };
  }, []);

  return (
    <div className="mobius" ref={host} data-state={status}>
      <canvas
        ref={canvas}
        tabIndex={0}
        role="img"
        aria-label="Faixa de Möbius 3D interativa"
        aria-describedby={instruction}
        onKeyDown={(event) => {
          const rotations: Record<string, [number, number]> = {
            ArrowLeft: [0, -0.2],
            ArrowRight: [0, 0.2],
            ArrowUp: [-0.2, 0],
            ArrowDown: [0.2, 0],
          };
          if (event.key === "Escape") {
            event.preventDefault();
            actions.current?.stop();
          }
          if (rotations[event.key]) {
            event.preventDefault();
            actions.current?.rotate(...rotations[event.key]);
          }
        }}
      />
      <span id={instruction} className="sr-only">
        Arraste e solte para girar com impulso. Use as setas do teclado para
        girar e Escape para parar.
      </span>

      {status === "error" && (
        <span className="mobius__fallback" role="status">
          Modelo 3D indisponível.
        </span>
      )}
    </div>
  );
}
