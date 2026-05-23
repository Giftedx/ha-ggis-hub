import { HUB_GAME_REGISTRY, getGameById } from '../games/registry';
import type { RoomDefinition, RoomDoorDefinition } from '../wasm/boundary';
import type { DecodedSnapshot } from '../wasm/snapshot-codec';

export interface CanvasRoomContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  fill(): void;
  fillText(text: string, x: number, y: number): void;
}

export interface CanvasRoomSurface {
  readonly width: number;
  readonly height: number;
  getContext(kind: '2d'): CanvasRoomContext | null;
}

export interface CanvasRoomRenderer {
  render(snapshot: DecodedSnapshot): void;
}

const COLORS = {
  background: '#24170f',
  launchableDoor: '#7a3f1d',
  lockedDoor: '#3d3328',
  activeOutline: '#f4c95d',
  haggis: '#8b5a2b',
  text: '#f9efd2'
} as const;

interface ScaledRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface DoorLayout {
  readonly id: string;
  readonly status: 'launchable' | 'locked';
  readonly rect: ScaledRect;
  readonly title: string;
}

export function createCanvasRoomRenderer(
  surface: CanvasRoomSurface,
  room: RoomDefinition
): CanvasRoomRenderer {
  const context = surface.getContext('2d');

  if (context === null) {
    throw new Error('Canvas2D context is unavailable');
  }

  // Precompute door layout once. Door geometry is part of the room
  // definition and never changes after init.
  const doors: readonly DoorLayout[] = room.doors.map((door) => ({
    id: door.id,
    status: door.status,
    rect: scaleDoorBounds(surface, room, door),
    title: doorTitleForId(door.id)
  }));

  return {
    render(snapshot: DecodedSnapshot): void {
      renderRoom(context, surface, room, doors, snapshot);
    }
  };
}

function renderRoom(
  context: CanvasRoomContext,
  surface: CanvasRoomSurface,
  room: RoomDefinition,
  doors: readonly DoorLayout[],
  snapshot: DecodedSnapshot
): void {
  context.fillStyle = COLORS.background;
  context.fillRect(0, 0, surface.width, surface.height);

  const interactingId = activeDoorId(snapshot);
  for (const door of doors) {
    drawDoor(context, door, interactingId);
  }

  drawHaggis(context, surface, room, snapshot);
  drawPrompt(context, surface, doors, snapshot);
}

function drawDoor(
  context: CanvasRoomContext,
  door: DoorLayout,
  interactingId: string | null
): void {
  context.fillStyle = door.status === 'launchable' ? COLORS.launchableDoor : COLORS.lockedDoor;
  context.fillRect(door.rect.x, door.rect.y, door.rect.width, door.rect.height);

  if (interactingId === door.id) {
    context.strokeStyle = COLORS.activeOutline;
    context.lineWidth = 3;
    context.strokeRect(door.rect.x, door.rect.y, door.rect.width, door.rect.height);
  }
}

function drawHaggis(
  context: CanvasRoomContext,
  surface: CanvasRoomSurface,
  room: RoomDefinition,
  snapshot: DecodedSnapshot
): void {
  const center = scalePoint(surface, room, snapshot.playerX, snapshot.playerY);
  const radius = Math.max(
    8,
    Math.round((snapshot.playerHalfExtent / room.worldWidth) * surface.width * 0.5)
  );

  context.fillStyle = COLORS.haggis;
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawPrompt(
  context: CanvasRoomContext,
  surface: CanvasRoomSurface,
  doors: readonly DoorLayout[],
  snapshot: DecodedSnapshot
): void {
  if (snapshot.interactionKind === 'none') {
    return;
  }

  const door = doors[snapshot.interactionDoorIndex];
  if (door === undefined) {
    return;
  }

  const verb = snapshot.interactionKind === 'launchable' ? 'Enter' : 'Locked';
  context.fillStyle = COLORS.text;
  context.font = '16px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText(`${verb} ${door.title}`, Math.round(surface.width / 2), surface.height - 24);
}

function activeDoorId(snapshot: DecodedSnapshot): string | null {
  if (snapshot.interactionKind === 'none') {
    return null;
  }
  const door = snapshot.doors[snapshot.interactionDoorIndex];
  return door?.id ?? null;
}

function scaleDoorBounds(
  surface: CanvasRoomSurface,
  room: RoomDefinition,
  door: RoomDoorDefinition
): ScaledRect {
  const width = door.bounds.maxX - door.bounds.minX;
  const height = door.bounds.maxY - door.bounds.minY;
  return {
    x: Math.round((door.bounds.minX / room.worldWidth) * surface.width),
    y: Math.round((door.bounds.minY / room.worldHeight) * surface.height),
    width: Math.round((width / room.worldWidth) * surface.width),
    height: Math.round((height / room.worldHeight) * surface.height)
  };
}

function scalePoint(
  surface: CanvasRoomSurface,
  room: RoomDefinition,
  x: number,
  y: number
): { readonly x: number; readonly y: number } {
  return {
    x: Math.round((x / room.worldWidth) * surface.width),
    y: Math.round((y / room.worldHeight) * surface.height)
  };
}

function doorTitleForId(id: string): string {
  return getGameById(HUB_GAME_REGISTRY, id)?.title ?? prettifyKebab(id);
}

function prettifyKebab(id: string): string {
  return id
    .split('-')
    .map((part) => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(' ');
}
