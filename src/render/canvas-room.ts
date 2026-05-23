import type { HubRoomBounds, HubRoomDoor, HubRoomRenderSnapshot } from '../hub/room';

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
  render(snapshot: HubRoomRenderSnapshot): void;
}

const COLORS = {
  background: '#24170f',
  launchableDoor: '#7a3f1d',
  lockedDoor: '#3d3328',
  activeOutline: '#f4c95d',
  haggis: '#8b5a2b',
  text: '#f9efd2'
} as const;

export function createCanvasRoomRenderer(surface: CanvasRoomSurface): CanvasRoomRenderer {
  const context = surface.getContext('2d');

  if (context === null) {
    throw new Error('Canvas2D context is unavailable');
  }

  return {
    render(snapshot: HubRoomRenderSnapshot): void {
      renderRoom(context, surface, snapshot);
    }
  };
}

function renderRoom(context: CanvasRoomContext, surface: CanvasRoomSurface, snapshot: HubRoomRenderSnapshot): void {
  context.fillStyle = COLORS.background;
  context.fillRect(0, 0, surface.width, surface.height);

  for (const door of snapshot.doors) {
    drawDoor(context, surface, snapshot, door);
  }

  drawHaggis(context, surface, snapshot);
  drawPrompt(context, surface, snapshot);
}

function drawDoor(
  context: CanvasRoomContext,
  surface: CanvasRoomSurface,
  snapshot: HubRoomRenderSnapshot,
  door: HubRoomDoor
): void {
  const rect = scaleBounds(surface, snapshot, door.bounds);
  context.fillStyle = door.status === 'launchable' ? COLORS.launchableDoor : COLORS.lockedDoor;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);

  if (snapshot.interaction.id === door.id) {
    context.strokeStyle = COLORS.activeOutline;
    context.lineWidth = 3;
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }
}

function drawHaggis(context: CanvasRoomContext, surface: CanvasRoomSurface, snapshot: HubRoomRenderSnapshot): void {
  const center = scalePoint(surface, snapshot, snapshot.player.x, snapshot.player.y);
  const radius = Math.max(8, Math.round((snapshot.player.halfExtent / snapshot.world.width) * surface.width * 0.5));

  context.fillStyle = COLORS.haggis;
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawPrompt(context: CanvasRoomContext, surface: CanvasRoomSurface, snapshot: HubRoomRenderSnapshot): void {
  if (snapshot.interaction.kind === 'none') {
    return;
  }

  const verb = snapshot.interaction.kind === 'launchable' ? 'Enter' : 'Locked';
  context.fillStyle = COLORS.text;
  context.font = '16px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText(`${verb} ${snapshot.interaction.title}`, Math.round(surface.width / 2), surface.height - 24);
}

function scaleBounds(
  surface: CanvasRoomSurface,
  snapshot: HubRoomRenderSnapshot,
  bounds: HubRoomBounds
): HubRoomBounds {
  return {
    x: Math.round((bounds.x / snapshot.world.width) * surface.width),
    y: Math.round((bounds.y / snapshot.world.height) * surface.height),
    width: Math.round((bounds.width / snapshot.world.width) * surface.width),
    height: Math.round((bounds.height / snapshot.world.height) * surface.height)
  };
}

function scalePoint(
  surface: CanvasRoomSurface,
  snapshot: HubRoomRenderSnapshot,
  x: number,
  y: number
): { readonly x: number; readonly y: number } {
  return {
    x: Math.round((x / snapshot.world.width) * surface.width),
    y: Math.round((y / snapshot.world.height) * surface.height)
  };
}
