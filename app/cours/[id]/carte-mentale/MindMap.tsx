"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Handle,
  Panel,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import styles from "./MindMap.module.css";

export type MindMapColor = "blue" | "green" | "orange" | "pink" | "purple" | "yellow" | "cyan";

export type MindMapBranch = {
  title: string;
  definition: string;
  rule: string;
  example: string;
  children: Array<{ title: string; content: string }>;
};

export type MindMapData = {
  centralTopic: string;
  branches: MindMapBranch[];
};

type Cardinal = "left" | "right" | "top" | "bottom";

type MindMapNodeData = {
  title: string;
  content?: string;
  titleLines: string[];
  contentLines: string[];
  level: 0 | 1 | 2;
  color: MindMapColor;
  branchNumber?: number;
  clusterId: string;
  inward: Cardinal;
  outward: Cardinal;
  width: number;
  height: number;
};

type MindMapNode = Node<MindMapNodeData, "mindMap">;

type LayoutResult = {
  nodes: MindMapNode[];
  edges: Edge[];
  bounds: { x: number; y: number; width: number; height: number };
};

const CONTAINER_CLASS =
  "relative h-[72vh] min-h-[600px] w-full rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 sm:min-h-[720px]";

const COLORS: Record<MindMapColor, { border: string; background: string; text: string; edge: string }> = {
  blue: { border: "#60a5fa", background: "#eff6ff", text: "#172554", edge: "#3b82f6" },
  green: { border: "#6ee7b7", background: "#ecfdf5", text: "#052e16", edge: "#10b981" },
  orange: { border: "#fdba74", background: "#fff7ed", text: "#431407", edge: "#f97316" },
  pink: { border: "#f9a8d4", background: "#fdf2f8", text: "#500724", edge: "#ec4899" },
  purple: { border: "#c4b5fd", background: "#f5f3ff", text: "#2e1065", edge: "#8b5cf6" },
  yellow: { border: "#fde047", background: "#fefce8", text: "#422006", edge: "#eab308" },
  cyan: { border: "#67e8f9", background: "#ecfeff", text: "#083344", edge: "#06b6d4" },
};

const BRANCH_COLORS: MindMapColor[] = ["blue", "green", "orange", "pink", "purple", "yellow", "cyan"];

const POSITION: Record<Cardinal, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

const OPPOSITE: Record<Cardinal, Cardinal> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

type TextMeasurer = (value: string, font: string) => number;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function wrapWords(label: string, maxWidth: number, font: string, measure: TextMeasurer) {
  const words = label.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measure(candidate, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : ["Cours"];
}

function measureNode(level: 0 | 1 | 2, title: string, content: string | undefined, measure: TextMeasurer) {
  const titleFont = level === 0 ? "800 28px Arial" : level === 1 ? "800 17px Arial" : "700 14px Arial";
  const contentFont = "500 14px Arial";
  const minimumWidth = level === 0 ? 300 : level === 1 ? 180 : 160;
  const maximumWidth = level === 0 ? 380 : level === 1 ? 240 : 220;
  const preferredWidth = Math.max(
    measure(title, titleFont) + 42,
    content ? Math.sqrt(content.length) * 13 + 105 : minimumWidth
  );
  const width = clamp(preferredWidth, minimumWidth, maximumWidth);
  const availableWidth = width - (level === 0 ? 54 : 36);
  const titleLines = wrapWords(title, availableWidth, titleFont, measure);
  const contentLines = content ? wrapWords(content, availableWidth, contentFont, measure) : [];
  const titleLineHeight = level === 0 ? 34 : level === 1 ? 24 : 19;
  const contentLineHeight = 20;
  const padding = level === 0 ? 58 : 34;
  const gap = contentLines.length > 0 ? 9 : 0;
  const height = Math.max(
    level === 0 ? 154 : level === 1 ? 78 : 72,
    padding + titleLines.length * titleLineHeight + contentLines.length * contentLineHeight + gap
  );
  return { width, height, titleLines, contentLines };
}

function outwardDirection(angle: number): Cardinal {
  const x = Math.cos(angle);
  const y = Math.sin(angle);
  if (Math.abs(x) >= Math.abs(y)) return x >= 0 ? "right" : "left";
  return y >= 0 ? "bottom" : "top";
}

function boxesOverlap(a: MindMapNode, b: MindMapNode, margin = 24) {
  const aWidth = a.data.width;
  const aHeight = a.data.height;
  const bWidth = b.data.width;
  const bHeight = b.data.height;
  return !(
    a.position.x + aWidth + margin <= b.position.x ||
    b.position.x + bWidth + margin <= a.position.x ||
    a.position.y + aHeight + margin <= b.position.y ||
    b.position.y + bHeight + margin <= a.position.y
  );
}

function moveCluster(nodes: MindMapNode[], clusterId: string, dx: number, dy: number) {
  nodes.forEach((node) => {
    if (node.data.clusterId === clusterId) {
      node.position = { x: node.position.x + dx, y: node.position.y + dy };
    }
  });
}

function resolveCollisions(nodes: MindMapNode[], directions: Map<string, { x: number; y: number }>) {
  for (let iteration = 0; iteration < 120; iteration++) {
    let collisionFound = false;

    for (let first = 0; first < nodes.length; first++) {
      for (let second = first + 1; second < nodes.length; second++) {
        const a = nodes[first];
        const b = nodes[second];
        if (a.data.clusterId === b.data.clusterId || !boxesOverlap(a, b)) continue;

        collisionFound = true;
        const aDirection = directions.get(a.data.clusterId);
        const bDirection = directions.get(b.data.clusterId);

        if (a.data.clusterId === "root" && bDirection) {
          moveCluster(nodes, b.data.clusterId, bDirection.x * 18, bDirection.y * 18);
        } else if (b.data.clusterId === "root" && aDirection) {
          moveCluster(nodes, a.data.clusterId, aDirection.x * 18, aDirection.y * 18);
        } else {
          if (aDirection) moveCluster(nodes, a.data.clusterId, aDirection.x * 10, aDirection.y * 10);
          if (bDirection) moveCluster(nodes, b.data.clusterId, bDirection.x * 10, bDirection.y * 10);
        }
      }
    }

    if (!collisionFound) break;
  }
}

function remainingCollisions(nodes: MindMapNode[]) {
  const collisions: Array<[MindMapNode, MindMapNode]> = [];
  for (let first = 0; first < nodes.length; first++) {
    for (let second = first + 1; second < nodes.length; second++) {
      if (boxesOverlap(nodes[first], nodes[second], 18)) {
        collisions.push([nodes[first], nodes[second]]);
      }
    }
  }
  return collisions;
}

function calculateBounds(nodes: MindMapNode[]) {
  const padding = 72;
  const minX = Math.min(...nodes.map((node) => node.position.x)) - padding;
  const minY = Math.min(...nodes.map((node) => node.position.y)) - padding;
  const maxX = Math.max(...nodes.map((node) => node.position.x + node.data.width)) + padding;
  const maxY = Math.max(...nodes.map((node) => node.position.y + node.data.height)) + padding;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function makeNode(
  id: string,
  title: string,
  content: string | undefined,
  level: 0 | 1 | 2,
  color: MindMapColor,
  clusterId: string,
  inward: Cardinal,
  outward: Cardinal,
  centerX: number,
  centerY: number,
  measure: TextMeasurer,
  branchNumber?: number
): MindMapNode {
  const dimensions = measureNode(level, title, content, measure);
  return {
    id,
    type: "mindMap",
    data: { title, content, level, color, clusterId, inward, outward, branchNumber, ...dimensions },
    position: { x: centerX - dimensions.width / 2, y: centerY - dimensions.height / 2 },
    initialWidth: dimensions.width,
    initialHeight: dimensions.height,
    style: { width: dimensions.width, height: dimensions.height },
    draggable: false,
    selectable: false,
  };
}

function layoutMindMap(data: MindMapData, measure: TextMeasurer): LayoutResult {
  const branches = data.branches.slice(0, 7);
  const nodes: MindMapNode[] = [];
  const edges: Edge[] = [];
  const directions = new Map<string, { x: number; y: number }>();
  nodes.push(makeNode("root", data.centralTopic, undefined, 0, "purple", "root", "left", "right", 0, 0, measure));

  const educationalChildren = branches.map((branch) => [
    { title: "Définition", content: branch.definition },
    { title: "Règle", content: branch.rule },
    { title: "Exemple", content: branch.example },
    ...branch.children,
  ].filter((child) => child.title && child.content).slice(0, 4));
  const largestChildHeight = Math.max(
    72,
    ...educationalChildren.flatMap((children) => children.map((child) => measureNode(2, child.title, child.content, measure).height))
  );
  const radiusX = 470 + largestChildHeight * 0.35;
  const radiusY = 325 + largestChildHeight * 0.28;

  branches.forEach((branch, branchIndex) => {
    const angle = -Math.PI / 2 + (branchIndex * Math.PI * 2) / branches.length;
    const vector = { x: Math.cos(angle), y: Math.sin(angle) };
    const outward = outwardDirection(angle);
    const inward = OPPOSITE[outward];
    const clusterId = `cluster-${branchIndex}`;
    const branchId = `branch-${branchIndex}`;
    const color = BRANCH_COLORS[branchIndex % BRANCH_COLORS.length];
    const branchCenter = { x: vector.x * radiusX, y: vector.y * radiusY };
    directions.set(clusterId, vector);

    nodes.push(makeNode(
      branchId,
      branch.title,
      undefined,
      1,
      color,
      clusterId,
      inward,
      outward,
      branchCenter.x,
      branchCenter.y,
      measure,
      branchIndex + 1
    ));

    edges.push({
      id: `root-${branchId}`,
      source: "root",
      sourceHandle: `root-${outward}`,
      target: branchId,
      targetHandle: `target-${inward}`,
      type: "bezier",
      style: { stroke: COLORS[color].edge, strokeWidth: 4 },
    });

    const children = educationalChildren[branchIndex];
    const childMeasurements = children.map((child) => measureNode(2, child.title, child.content, measure));
    const gap = 20;
    const branchMeasurement = measureNode(1, branch.title, undefined, measure);

    if (outward === "left" || outward === "right") {
      const totalHeight = childMeasurements.reduce((sum, item) => sum + item.height, 0) + gap * Math.max(0, children.length - 1);
      let cursorY = branchCenter.y - totalHeight / 2;

      children.forEach((child, childIndex) => {
        const measurement = childMeasurements[childIndex];
        const horizontalDirection = outward === "right" ? 1 : -1;
        const centerX = branchCenter.x + horizontalDirection * (branchMeasurement.width / 2 + measurement.width / 2 + 96);
        const centerY = cursorY + measurement.height / 2;
        const childId = `${branchId}-child-${childIndex}`;
        nodes.push(makeNode(childId, child.title, child.content, 2, color, clusterId, inward, outward, centerX, centerY, measure));
        cursorY += measurement.height + gap;
        edges.push({
          id: `${branchId}-${childId}`,
          source: branchId,
          sourceHandle: `source-${outward}`,
          target: childId,
          targetHandle: `target-${inward}`,
          type: "bezier",
          style: { stroke: COLORS[color].edge, strokeWidth: 1.8, opacity: 0.82 },
        });
      });
    } else {
      const totalWidth = childMeasurements.reduce((sum, item) => sum + item.width, 0) + gap * Math.max(0, children.length - 1);
      let cursorX = branchCenter.x - totalWidth / 2;

      children.forEach((child, childIndex) => {
        const measurement = childMeasurements[childIndex];
        const centerX = cursorX + measurement.width / 2;
        const verticalDirection = outward === "bottom" ? 1 : -1;
        const centerY = branchCenter.y + verticalDirection * (branchMeasurement.height / 2 + measurement.height / 2 + 86);
        const childId = `${branchId}-child-${childIndex}`;
        nodes.push(makeNode(childId, child.title, child.content, 2, color, clusterId, inward, outward, centerX, centerY, measure));
        cursorX += measurement.width + gap;
        edges.push({
          id: `${branchId}-${childId}`,
          source: branchId,
          sourceHandle: `source-${outward}`,
          target: childId,
          targetHandle: `target-${inward}`,
          type: "bezier",
          style: { stroke: COLORS[color].edge, strokeWidth: 1.8, opacity: 0.82 },
        });
      });
    }
  });

  resolveCollisions(nodes, directions);

  for (let safetyPass = 0; safetyPass < 10 && remainingCollisions(nodes).length > 0; safetyPass++) {
    directions.forEach((direction, clusterId) => {
      moveCluster(nodes, clusterId, direction.x * 34, direction.y * 34);
    });
    resolveCollisions(nodes, directions);
  }

  return { nodes, edges, bounds: calculateBounds(nodes) };
}

const CENTER_TICKS = ["top", "right", "bottom", "left"] as const;

const MindMapCard = memo(function MindMapCard({ data }: NodeProps<MindMapNode>) {
  const palette = COLORS[data.color];
  const root = data.level === 0;

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center px-5 py-4 text-center ${root ? "rounded-[999px] border-2 text-2xl font-black sm:text-3xl" : data.level === 1 ? "rounded-3xl border-2 text-base font-extrabold sm:text-lg" : "rounded-2xl border text-sm font-medium sm:text-base"}`}
      style={{
        borderColor: root ? "#8b5cf6" : palette.border,
        background: root ? "#ffffff" : palette.background,
        color: root ? "#6d28d9" : palette.text,
        boxShadow: root ? "0 12px 30px rgba(139,92,246,.16)" : "0 6px 16px rgba(15,23,42,.07)",
      }}
    >
      {root ? CENTER_TICKS.map((direction) => (
        <Handle
          key={direction}
          id={`root-${direction}`}
          type="source"
          position={POSITION[direction]}
          className="!h-1 !w-1 !border-0 !bg-transparent"
        />
      )) : (
        <Handle
          id={`target-${data.inward}`}
          type="target"
          position={POSITION[data.inward]}
          className="!h-1 !w-1 !border-0 !bg-transparent"
        />
      )}
      <span className="block max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">
        <span className="block font-bold leading-relaxed">
          {data.titleLines.map((line, index) => (
            <span key={`${line}-${index}`} className="block whitespace-normal">
              {index === 0 && data.level === 1 && data.branchNumber ? `${data.branchNumber}. ${line}` : line}
            </span>
          ))}
        </span>
        {data.contentLines.length > 0 && (
          <span className="mt-2 block font-medium leading-relaxed">
            {data.contentLines.map((line, index) => (
              <span key={`${line}-${index}`} className="block whitespace-normal">{line}</span>
            ))}
          </span>
        )}
      </span>
      {data.level === 1 && (
        <Handle
          id={`source-${data.outward}`}
          type="source"
          position={POSITION[data.outward]}
          className="!h-1 !w-1 !border-0 !bg-transparent"
        />
      )}
    </div>
  );
});

const nodeTypes = { mindMap: MindMapCard };

function RecenterButton() {
  const { fitView } = useReactFlow();
  return (
    <Panel position="top-right" className="!m-4 sm:!m-5">
      <button
        type="button"
        onClick={() => void fitView({ padding: 0.12, duration: 450, maxZoom: 1 })}
        className="rounded-xl border border-violet-500 bg-white px-4 py-2.5 text-sm font-bold text-violet-700 shadow-sm transition hover:bg-violet-50"
      >
        Recentrer
      </button>
    </Panel>
  );
}

function anchor(node: MindMapNode, direction: Cardinal) {
  const centerX = node.position.x + node.data.width / 2;
  const centerY = node.position.y + node.data.height / 2;
  if (direction === "left") return { x: node.position.x, y: centerY };
  if (direction === "right") return { x: node.position.x + node.data.width, y: centerY };
  if (direction === "top") return { x: centerX, y: node.position.y };
  return { x: centerX, y: node.position.y + node.data.height };
}

function curvePath(source: MindMapNode, target: MindMapNode, sourceDirection: Cardinal, targetDirection: Cardinal) {
  const start = anchor(source, sourceDirection);
  const end = anchor(target, targetDirection);
  const distance = Math.max(70, Math.hypot(end.x - start.x, end.y - start.y) * 0.42);
  const vector = (direction: Cardinal) => direction === "left" ? { x: -1, y: 0 } : direction === "right" ? { x: 1, y: 0 } : direction === "top" ? { x: 0, y: -1 } : { x: 0, y: 1 };
  const first = vector(sourceDirection);
  const second = vector(targetDirection);
  return `M ${start.x} ${start.y} C ${start.x + first.x * distance} ${start.y + first.y * distance}, ${end.x + second.x * distance} ${end.y + second.y * distance}, ${end.x} ${end.y}`;
}

function StaticMindMap({ layout }: { layout: LayoutResult }) {
  const nodeMap = new Map(layout.nodes.map((node) => [node.id, node]));
  return (
    <div className={styles.printMap}>
      <svg viewBox={`${layout.bounds.x} ${layout.bounds.y} ${layout.bounds.width} ${layout.bounds.height}`} preserveAspectRatio="xMidYMid meet" aria-label="Carte mentale à imprimer">
        {layout.edges.map((edge) => {
          const source = nodeMap.get(edge.source);
          const target = nodeMap.get(edge.target);
          if (!source || !target) return null;
          const sourceDirection = (edge.sourceHandle?.replace("root-", "").replace("source-", "") || "right") as Cardinal;
          const targetDirection = (edge.targetHandle?.replace("target-", "") || "left") as Cardinal;
          return <path key={edge.id} d={curvePath(source, target, sourceDirection, targetDirection)} fill="none" stroke={String(edge.style?.stroke || "#64748b")} strokeWidth={Number(edge.style?.strokeWidth || 2)} opacity={Number(edge.style?.opacity || 1)} />;
        })}
        {layout.nodes.map((node) => {
          const palette = COLORS[node.data.color];
          const root = node.data.level === 0;
          const centerX = node.position.x + node.data.width / 2;
          const centerY = node.position.y + node.data.height / 2;
          const titleFontSize = root ? 25 : node.data.level === 1 ? 17 : 14;
          const titleLineHeight = root ? 31 : node.data.level === 1 ? 23 : 19;
          const contentFontSize = 14;
          const contentLineHeight = 20;
          const gap = node.data.contentLines.length > 0 ? 9 : 0;
          const textHeight = node.data.titleLines.length * titleLineHeight + node.data.contentLines.length * contentLineHeight + gap;
          const firstLineY = centerY - textHeight / 2 + titleFontSize;
          const borderWidth = root || node.data.level === 1 ? 2 : 1;
          const fill = root ? "#ffffff" : palette.background;
          const stroke = root ? "#8b5cf6" : palette.border;
          const textColor = root ? "#6d28d9" : palette.text;

          return (
            <g key={node.id}>
              {root ? (
                <ellipse
                  cx={centerX}
                  cy={centerY}
                  rx={node.data.width / 2 - borderWidth}
                  ry={node.data.height / 2 - borderWidth}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={borderWidth}
                />
              ) : (
                <rect
                  x={node.position.x + borderWidth / 2}
                  y={node.position.y + borderWidth / 2}
                  width={node.data.width - borderWidth}
                  height={node.data.height - borderWidth}
                  rx={node.data.level === 1 ? 24 : 16}
                  ry={node.data.level === 1 ? 24 : 16}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={borderWidth}
                />
              )}
              <text
                x={centerX}
                y={firstLineY}
                fill={textColor}
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize={titleFontSize}
                fontWeight={node.data.level === 2 ? 500 : 800}
                textAnchor="middle"
              >
                {node.data.titleLines.map((line, index) => (
                  <tspan key={`${line}-${index}`} x={centerX} dy={index === 0 ? 0 : titleLineHeight}>
                    {index === 0 && node.data.level === 1 && node.data.branchNumber
                      ? `${node.data.branchNumber}. ${line}`
                      : line}
                  </tspan>
                ))}
                {node.data.contentLines.map((line, index) => (
                  <tspan
                    key={`content-${line}-${index}`}
                    x={centerX}
                    dy={index === 0 ? contentLineHeight + gap : contentLineHeight}
                    fontSize={contentFontSize}
                    fontWeight={500}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

type MindMapProps = {
  courseId: string;
  initialData: MindMapData | null;
  fallbackTitle: string;
  fallbackSummary: string;
  fallbackCourse: Record<string, unknown> | null;
};

export default function MindMap({ courseId, initialData, fallbackTitle, fallbackSummary, fallbackCourse }: MindMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [data, setData] = useState<MindMapData | null>(initialData);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [flow, setFlow] = useState<ReactFlowInstance<MindMapNode, Edge> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layout = useMemo(() => {
    if (!isMounted || !data) return null;
    const context = document.createElement("canvas").getContext("2d");
    const measure: TextMeasurer = (value, font) => {
      if (!context) return value.length * 8;
      context.font = font;
      return context.measureText(value).width;
    };
    return layoutMindMap(data, measure);
  }, [data, isMounted]);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!flow || !containerRef.current || !layout) return;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => void flow.fitView({ padding: 0.12, duration: 0, maxZoom: 1 }));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(containerRef.current);
    fit();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [flow, layout]);

  async function generateMap(regenerate: boolean) {
    if (regenerate && !window.confirm("Régénérer la carte mentale et remplacer la version sauvegardée ?")) return;
    setIsGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/generate-mind-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, course: fallbackCourse, summary: fallbackSummary, title: fallbackTitle }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Génération impossible");
      setData(payload.result);
    } catch (requestError) {
      console.error(requestError);
      setError(regenerate
        ? "La nouvelle carte n’a pas pu être sauvegardée. La carte actuelle est conservée."
        : "La carte mentale n’a pas pu être générée.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!isMounted) {
    return <div className={`${styles.interactiveMap} ${CONTAINER_CLASS} flex items-center justify-center p-8 text-center text-slate-500`}>Chargement de la carte mentale…</div>;
  }

  if (!data) {
    return (
      <div className={`${styles.interactiveMap} ${CONTAINER_CLASS} flex items-center justify-center p-6 sm:p-10`}>
        <div className="max-w-lg text-center">
          <div className="mx-auto h-1.5 w-16 rounded-full bg-violet-500" />
          <h2 className="mt-6 text-2xl font-black text-slate-950 sm:text-3xl">Créer la carte mentale du cours</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">La carte sera générée une seule fois, sauvegardée, puis disponible lors de tes prochaines visites.</p>
          {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
          <button type="button" disabled={isGenerating || (!fallbackCourse && !fallbackSummary)} onClick={() => void generateMap(false)} className="mt-7 rounded-2xl bg-violet-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">
            {isGenerating ? "Génération en cours…" : "Générer la carte mentale"}
          </button>
        </div>
      </div>
    );
  }

  if (!layout) {
    return <div className={`${styles.interactiveMap} ${CONTAINER_CLASS} flex items-center justify-center p-8 text-center text-slate-500`}>Préparation de la carte mentale…</div>;
  }

  return (
    <>
      <div className={`${styles.noPrint} mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center`}>
        <p className="text-sm text-slate-500">Cette carte est sauvegardée et sera rechargée automatiquement.</p>
        <button type="button" disabled={isGenerating} onClick={() => void generateMap(true)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-wait disabled:opacity-60">
          {isGenerating ? "Régénération…" : "Régénérer la carte mentale"}
        </button>
      </div>
      {error && <p className={`${styles.noPrint} mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800`}>{error}</p>}
      <div ref={containerRef} className={`${styles.interactiveMap} ${CONTAINER_CLASS}`}>
        <ReactFlow
          nodes={layout.nodes}
          edges={layout.edges}
          nodeTypes={nodeTypes}
          onInit={setFlow}
          fitView
          fitViewOptions={{ padding: 0.12, minZoom: 0.2, maxZoom: 1 }}
          minZoom={0.2}
          maxZoom={1}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
        >
          <RecenterButton />
        </ReactFlow>
      </div>
      <StaticMindMap layout={layout} />
    </>
  );
}
