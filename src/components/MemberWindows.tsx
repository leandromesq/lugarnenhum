"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import type { Member } from "@/data/band";
import { coverTransform } from "@/lib/ascii-scene";
import "./member-windows.css";

interface MemberWindowsProps {
  members: readonly Member[];
}

interface LayerBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

const LAYER_EDGE_PADDING = 8;

/** `coverTransform` narrows its image defaults to the desktop literals. */
const projectCover = coverTransform as (
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
) => { scale: number; offsetX: number; offsetY: number };

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function percent(fraction: number) {
  return `${Number((fraction * 100).toFixed(4))}%`;
}

function sameLayer(current: LayerBox, next: LayerBox) {
  return (
    Math.abs(current.left - next.left) < 0.5 &&
    Math.abs(current.top - next.top) < 0.5 &&
    Math.abs(current.width - next.width) < 0.5 &&
    Math.abs(current.height - next.height) < 0.5
  );
}

export function MemberWindows({ members }: MemberWindowsProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const hotspotRefs = useRef(new Map<string, HTMLButtonElement>());
  const [layer, setLayer] = useState<LayerBox | null>(null);
  const [portrait, setPortrait] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  /** Project the photograph the same way AsciiOverlay projects its glyphs. */
  const measure = useCallback(() => {
    const scene = layerRef.current?.closest(".home-scene");
    const image = scene?.querySelector<HTMLImageElement>(".band-photo img");
    if (!(scene instanceof HTMLElement) || !image || !image.naturalWidth)
      return;
    const sceneBox = scene.getBoundingClientRect();
    const imageBox = image.getBoundingClientRect();
    const transform = projectCover(
      imageBox.width,
      imageBox.height,
      image.naturalWidth,
      image.naturalHeight,
    );
    const next: LayerBox = {
      left: imageBox.left - sceneBox.left + transform.offsetX,
      top: imageBox.top - sceneBox.top + transform.offsetY,
      width: image.naturalWidth * transform.scale,
      height: image.naturalHeight * transform.scale,
    };
    setLayer((current) =>
      current && sameLayer(current, next) ? current : next,
    );
    setPortrait(image.currentSrc.includes("-mobile"));
  }, []);

  useEffect(() => {
    const scene = layerRef.current?.closest(".home-scene");
    const image = scene?.querySelector<HTMLImageElement>(".band-photo img");
    if (!scene || !image) return;
    measure();
    image.addEventListener("load", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(image);
    observer.observe(scene);
    window.addEventListener("resize", measure);
    // The art-directed source can swap without a resize when only the viewport
    // crosses the portrait breakpoint.
    const media = matchMedia("(max-width: 767px)");
    media.addEventListener("change", measure);
    return () => {
      image.removeEventListener("load", measure);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      media.removeEventListener("change", measure);
    };
  }, [measure]);

  const close = useCallback((id: string | null, restoreFocus: boolean) => {
    if (!id) return;
    setOpenId(null);
    if (restoreFocus) hotspotRefs.current.get(id)?.focus();
  }, []);

  useEffect(() => {
    if (!openId) return;
    const away = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".member-hotspot, .member-window")) return;
      setOpenId(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close(openId, true);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [openId, close]);

  // The window only knows its own height after mounting: flip it below the
  // hotspot and nudge it back inside the viewport without re-rendering.
  useLayoutEffect(() => {
    const element =
      layerRef.current?.querySelector<HTMLElement>(".member-window");
    if (!openId || !element) return;
    delete element.dataset.placement;
    element.style.marginLeft = "";
    if (portrait) return;
    const button = hotspotRefs.current.get(openId);
    if (!button) return;
    const windowBox = element.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    const announcement = document.querySelector(".announcement");
    const barHeight =
      announcement instanceof HTMLElement
        ? announcement.getBoundingClientRect().height
        : 0;
    if (buttonBox.top - 34 - windowBox.height < barHeight + LAYER_EDGE_PADDING)
      element.dataset.placement = "below";
    const room = window.innerWidth - LAYER_EDGE_PADDING;
    const right = windowBox.left + windowBox.width;
    let shift = 0;
    if (right > room) shift = room - right;
    else if (windowBox.left < LAYER_EDGE_PADDING)
      shift = LAYER_EDGE_PADDING - windowBox.left;
    if (Math.abs(shift) >= 1) element.style.marginLeft = `${shift}px`;
  }, [openId, portrait, layer]);

  return (
    <div
      className="member-layer"
      ref={layerRef}
      hidden={layer === null}
      style={
        layer
          ? {
              left: `${layer.left}px`,
              top: `${layer.top}px`,
              width: `${layer.width}px`,
              height: `${layer.height}px`,
            }
          : undefined
      }
    >
      {members.map((member) => {
        const hotspot = member.hotspot[portrait ? "mobile" : "desktop"];
        const open = openId === member.id;
        const windowId = `member-window-${member.id}`;
        return (
          <Fragment key={member.id}>
            <button
              type="button"
              className="member-hotspot"
              aria-expanded={open}
              aria-controls={windowId}
              aria-label={`${member.name}, ${member.role}`}
              style={{
                left: percent(hotspot.x),
                top: percent(hotspot.y),
                width: percent(hotspot.width),
                height: percent(hotspot.height),
              }}
              ref={(node) => {
                if (node) hotspotRefs.current.set(member.id, node);
                else hotspotRefs.current.delete(member.id);
              }}
              onClick={() =>
                setOpenId((current) =>
                  current === member.id ? null : member.id,
                )
              }
            >
              <span className="member-hotspot__marker" aria-hidden="true">
                {open ? "×" : "+"}
              </span>
            </button>
            {open && (
              <div
                className="member-window"
                id={windowId}
                role="dialog"
                aria-label={member.name}
                style={
                  {
                    "--member-center": percent(hotspot.x + hotspot.width / 2),
                    "--member-top": `calc(${percent(hotspot.y)} + 44px)`,
                    "--member-bottom": `calc(${percent(1 - hotspot.y)} + 34px)`,
                  } as CSSProperties
                }
              >
                <div className="member-window__bar">
                  <span className="member-window__name">{member.name}</span>
                  <span aria-hidden="true">_</span>
                  <span aria-hidden="true">□</span>
                  <button
                    type="button"
                    className="member-window__close"
                    aria-label={`Fechar janela de ${member.name}`}
                    onClick={() => close(member.id, true)}
                  >
                    ×
                  </button>
                </div>
                <div className="member-window__body">
                  <p className="member-window__role">
                    {capitalise(member.role)}
                  </p>
                  <a
                    className="member-window__link"
                    href={`https://www.instagram.com/${member.instagram}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Instagram de ${member.name} (abre em nova aba)`}
                  >
                    @{member.instagram} ↗
                  </a>
                </div>
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
