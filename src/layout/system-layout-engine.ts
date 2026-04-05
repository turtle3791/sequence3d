import * as THREE from 'three';
import {
  ParsedDiagram,
  SystemNodeLayout,
  SystemConnectionLayout,
  SystemLayout,
  SYSTEM_LAYOUT,
} from '../types';

type Side = '+x' | '-x' | '+z' | '-z';

interface PortAssignment {
  node: SystemNodeLayout;
  side: Side;
  /** Position along the edge (set during distribution) */
  port: THREE.Vector3;
}

interface PendingConnection {
  msg: ParsedDiagram['messages'][number];
  from: PortAssignment;
  to: PortAssignment;
  isSelf: boolean;
}

export function computeSystemLayout(diagram: ParsedDiagram): SystemLayout {
  const { participants, messages } = diagram;

  // ── 1. Connectivity ──
  const degree = new Map<string, number>();
  participants.forEach((p) => degree.set(p.alias, 0));
  messages.forEach((m) => {
    degree.set(m.from, (degree.get(m.from) ?? 0) + 1);
    degree.set(m.to, (degree.get(m.to) ?? 0) + 1);
  });
  const maxDegree = Math.max(1, ...degree.values());

  // Sort most-connected first → center of spiral
  const sorted = [...participants].sort(
    (a, b) => (degree.get(b.alias) ?? 0) - (degree.get(a.alias) ?? 0)
  );

  // ── 2. Place nodes on XZ plane ──
  const gridPositions = computeSpiralPositions(sorted.length);
  const nodeMap = new Map<string, SystemNodeLayout>();
  const nodes: SystemNodeLayout[] = sorted.map((p, i) => {
    const d = degree.get(p.alias) ?? 0;
    const t = maxDegree > 1 ? d / maxDegree : 0.5;
    const lerp = (lo: number, hi: number) => lo + (hi - lo) * t;
    const w = lerp(SYSTEM_LAYOUT.NODE_MIN_SIZE, SYSTEM_LAYOUT.NODE_MAX_SIZE);
    const h = lerp(SYSTEM_LAYOUT.NODE_MIN_HEIGHT, SYSTEM_LAYOUT.NODE_MAX_HEIGHT);

    const node: SystemNodeLayout = {
      participant: p,
      position: new THREE.Vector3(
        gridPositions[i].x * SYSTEM_LAYOUT.GRID_SPACING,
        0,
        gridPositions[i].z * SYSTEM_LAYOUT.GRID_SPACING
      ),
      index: i,
      scale: t,
      halfWidth: w / 2,
      halfDepth: w / 2,
      halfHeight: h / 2,
    };
    nodeMap.set(p.alias, node);
    return node;
  });

  // ── 3. Assign each connection endpoint to a side of its node ──
  // Collect all port assignments per (node alias, side) so we can distribute them
  const sidePorts = new Map<string, PortAssignment[]>(); // key = "alias|side"

  function sideKey(alias: string, side: Side): string {
    return `${alias}|${side}`;
  }

  function pickSide(from: SystemNodeLayout, to: SystemNodeLayout): Side {
    const dx = to.position.x - from.position.x;
    const dz = to.position.z - from.position.z;
    if (Math.abs(dx) >= Math.abs(dz)) {
      return dx >= 0 ? '+x' : '-x';
    }
    return dz >= 0 ? '+z' : '-z';
  }

  const pending: PendingConnection[] = [];

  messages.forEach((msg) => {
    const fromNode = nodeMap.get(msg.from);
    const toNode = nodeMap.get(msg.to);
    if (!fromNode || !toNode) return;

    const isSelf = msg.from === msg.to;

    let fromSide: Side;
    let toSide: Side;

    if (isSelf) {
      fromSide = '+x';
      toSide = '+z';
    } else {
      fromSide = pickSide(fromNode, toNode);
      toSide = oppositeSide(fromSide);
    }

    const fromPort: PortAssignment = {
      node: fromNode,
      side: fromSide,
      port: new THREE.Vector3(), // filled later
    };
    const toPort: PortAssignment = {
      node: toNode,
      side: toSide,
      port: new THREE.Vector3(), // filled later
    };

    // Register for distribution
    const fk = sideKey(msg.from, fromSide);
    if (!sidePorts.has(fk)) sidePorts.set(fk, []);
    sidePorts.get(fk)!.push(fromPort);

    const tk = sideKey(msg.to, toSide);
    if (!sidePorts.has(tk)) sidePorts.set(tk, []);
    sidePorts.get(tk)!.push(toPort);

    pending.push({ msg, from: fromPort, to: toPort, isSelf });
  });

  // ── 4. Distribute ports evenly along each node edge ──
  sidePorts.forEach((ports, key) => {
    const [alias] = key.split('|');
    const side = key.split('|')[1] as Side;
    const node = nodeMap.get(alias)!;
    distributePortsAlongEdge(node, side, ports);
  });

  // ── 5. Route orthogonal waypoints from port to port ──
  const connections: SystemConnectionLayout[] = pending.map((pc) => {
    const waypoints = pc.isSelf
      ? routeSelfConnection(pc.from, pc.to)
      : routeConnection(pc.from, pc.to);

    return {
      message: pc.msg,
      waypoints,
      fromNode: pc.from.node,
      toNode: pc.to.node,
      isSelfConnection: pc.isSelf,
    };
  });

  // ── 6. Bounds ──
  const allX = nodes.map((n) => n.position.x);
  const allZ = nodes.map((n) => n.position.z);
  const pad = SYSTEM_LAYOUT.GRID_SPACING;
  const minX = Math.min(...allX) - pad;
  const maxX = Math.max(...allX) + pad;
  const minZ = Math.min(...allZ) - pad;
  const maxZ = Math.max(...allZ) + pad;
  const maxH = Math.max(...nodes.map((n) => n.halfHeight));

  return {
    nodes,
    connections,
    bounds: {
      min: new THREE.Vector3(minX, -maxH, minZ),
      max: new THREE.Vector3(maxX, maxH, maxZ),
      center: new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2),
    },
  };
}

// ── Helpers ──

function oppositeSide(s: Side): Side {
  switch (s) {
    case '+x': return '-x';
    case '-x': return '+x';
    case '+z': return '-z';
    case '-z': return '+z';
  }
}

/**
 * Given N ports on one side of a node, spread them evenly along that edge.
 * +x / -x sides run along Z (from -halfDepth to +halfDepth)
 * +z / -z sides run along X (from -halfWidth to +halfWidth)
 */
function distributePortsAlongEdge(
  node: SystemNodeLayout,
  side: Side,
  ports: PortAssignment[]
): void {
  const n = ports.length;
  const cx = node.position.x;
  const cz = node.position.z;

  if (side === '+x' || side === '-x') {
    const edgeX = side === '+x' ? cx + node.halfWidth : cx - node.halfWidth;
    const span = node.halfDepth * 2;
    for (let i = 0; i < n; i++) {
      // evenly distribute along Z, centered
      const t = n === 1 ? 0.5 : i / (n - 1);
      const z = cz - node.halfDepth + span * t;
      ports[i].port.set(edgeX, 0, z);
    }
  } else {
    const edgeZ = side === '+z' ? cz + node.halfDepth : cz - node.halfDepth;
    const span = node.halfWidth * 2;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = cx - node.halfWidth + span * t;
      ports[i].port.set(x, 0, edgeZ);
    }
  }
}

/**
 * Route between two ports with an L-shaped or Z-shaped orthogonal path.
 * The line exits perpendicular to the edge, then turns to reach the target port.
 */
function routeConnection(
  from: PortAssignment,
  to: PortAssignment
): THREE.Vector3[] {
  const fp = from.port;
  const tp = to.port;

  // Determine the perpendicular "exit stub" direction for each side
  const stubLen = 0.8; // how far to extend before turning

  const fromStub = stubPoint(fp, from.side, stubLen);
  const toStub = stubPoint(tp, to.side, stubLen);

  // Now connect fromStub → toStub with axis-aligned segments.
  // We need at most one bend between the two stubs.
  const waypoints = [fp.clone(), fromStub.clone()];

  const dx = toStub.x - fromStub.x;
  const dz = toStub.z - fromStub.z;

  if (exitsAlongX(from.side)) {
    // From stub extends along X. Route: continue X to align with toStub Z, then Z.
    if (exitsAlongX(to.side)) {
      // Both along X — need a Z jog in between
      const midX = (fromStub.x + toStub.x) / 2;
      waypoints.push(new THREE.Vector3(midX, 0, fromStub.z));
      waypoints.push(new THREE.Vector3(midX, 0, toStub.z));
    } else {
      // from along X, to along Z — L-shape via corner
      waypoints.push(new THREE.Vector3(toStub.x, 0, fromStub.z));
    }
  } else {
    // From stub extends along Z
    if (exitsAlongZ(to.side)) {
      // Both along Z — need an X jog
      const midZ = (fromStub.z + toStub.z) / 2;
      waypoints.push(new THREE.Vector3(fromStub.x, 0, midZ));
      waypoints.push(new THREE.Vector3(toStub.x, 0, midZ));
    } else {
      // from along Z, to along X — L-shape via corner
      waypoints.push(new THREE.Vector3(fromStub.x, 0, toStub.z));
    }
  }

  waypoints.push(toStub.clone());
  waypoints.push(tp.clone());

  return deduplicateWaypoints(waypoints);
}

function routeSelfConnection(
  from: PortAssignment,
  to: PortAssignment
): THREE.Vector3[] {
  const fp = from.port;
  const tp = to.port;
  const bump = from.node.halfWidth * 1.2;

  const fromStub = stubPoint(fp, from.side, bump);
  const toStub = stubPoint(tp, to.side, bump);

  // Route: exit → out → corner → corner → in → enter
  return deduplicateWaypoints([
    fp.clone(),
    fromStub.clone(),
    new THREE.Vector3(fromStub.x, 0, toStub.z),
    toStub.clone(),
    tp.clone(),
  ]);
}

function stubPoint(port: THREE.Vector3, side: Side, len: number): THREE.Vector3 {
  switch (side) {
    case '+x': return new THREE.Vector3(port.x + len, 0, port.z);
    case '-x': return new THREE.Vector3(port.x - len, 0, port.z);
    case '+z': return new THREE.Vector3(port.x, 0, port.z + len);
    case '-z': return new THREE.Vector3(port.x, 0, port.z - len);
  }
}

function exitsAlongX(side: Side): boolean {
  return side === '+x' || side === '-x';
}

function exitsAlongZ(side: Side): boolean {
  return side === '+z' || side === '-z';
}

/** Remove consecutive duplicate points */
function deduplicateWaypoints(pts: THREE.Vector3[]): THREE.Vector3[] {
  const result: THREE.Vector3[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].distanceTo(pts[i - 1]) > 0.001) {
      result.push(pts[i]);
    }
  }
  return result;
}

// ── Spiral placement ──
function computeSpiralPositions(
  count: number
): { x: number; z: number }[] {
  if (count === 0) return [];
  const result: { x: number; z: number }[] = [{ x: 0, z: 0 }];
  if (count === 1) return result;

  const dx = [1, 0, -1, 0];
  const dz = [0, 1, 0, -1];
  let x = 0,
    z = 0,
    dir = 0,
    steps = 1,
    stepsTaken = 0,
    turns = 0;

  for (let i = 1; i < count; i++) {
    x += dx[dir];
    z += dz[dir];
    result.push({ x, z });
    stepsTaken++;
    if (stepsTaken === steps) {
      stepsTaken = 0;
      dir = (dir + 1) % 4;
      turns++;
      if (turns % 2 === 0) steps++;
    }
  }

  return result;
}
