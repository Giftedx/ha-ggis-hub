import type { HubInputVector } from '../engine/input';
import type { HubGameDefinition } from '../games/registry';
import { getGameById } from '../games/registry';
import type { LaunchPlan } from '../navigation/launch';
import { createLaunchPlan } from '../navigation/launch';

/** Matches hub_core::sim::InputSnapshot interact bit (bit 4). */
export const INTERACT_BIT = 0b1_0000;

export const POINTER_DEADZONE = 18;

export interface PointerIntentState {
  readonly active: boolean;
  readonly targetX: number;
  readonly targetY: number;
  readonly playerX: number;
  readonly playerY: number;
}

export interface ClientRectLike {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

type ListenerOptions = boolean | AddEventListenerOptions;

export interface EventTargetLike {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: ListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: ListenerOptions
  ): void;
}

export interface DomListenerBag {
  add(
    target: EventTargetLike,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: ListenerOptions
  ): void;
  removeAll(): void;
}

export interface PointerCaptureTarget {
  hasPointerCapture(pointerId: number): boolean;
  releasePointerCapture(pointerId: number): void;
}

export type DoorLaunchStatus =
  | { readonly kind: 'launchable'; readonly plan: Extract<LaunchPlan, { readonly kind: 'launchable' }> }
  | { readonly kind: 'missing'; readonly statusText: string }
  | { readonly kind: 'locked'; readonly statusText: string };

export function createDomListenerBag(): DomListenerBag {
  const registrations: Array<{
    readonly target: EventTargetLike;
    readonly type: string;
    readonly listener: EventListenerOrEventListenerObject;
    readonly options?: ListenerOptions;
  }> = [];

  return {
    add(target, type, listener, options): void {
      target.addEventListener(type, listener, options);
      if (options === undefined) {
        registrations.push({ target, type, listener });
      } else {
        registrations.push({ target, type, listener, options });
      }
    },
    removeAll(): void {
      for (let i = registrations.length - 1; i >= 0; i -= 1) {
        const { target, type, listener, options } = registrations[i]!;
        target.removeEventListener(type, listener, options);
      }
      registrations.length = 0;
    }
  };
}

export function asEventListener(handler: (event: Event) => void): EventListener {
  return (event) => {
    handler(event);
  };
}

export function parseSeedFromSearch(search: string, fallbackUtcMs: number): bigint {
  const seedParam = new URLSearchParams(search).get('seed');
  return seedParam !== null && /^\d+$/.test(seedParam)
    ? BigInt(seedParam)
    : BigInt(fallbackUtcMs);
}

export function parseFixedVisualGatePhase(search: string): number | undefined {
  const phaseParam = new URLSearchParams(search).get('visualGatePhase');
  if (phaseParam === null || !/^\d+(?:\.\d+)?$/.test(phaseParam)) {
    return undefined;
  }

  const parsedPhase = Number(phaseParam);
  return Number.isFinite(parsedPhase) && parsedPhase >= 0 && parsedPhase <= 86_400
    ? parsedPhase
    : undefined;
}

export function packInputForTick(options: {
  readonly keyboardVector: HubInputVector;
  readonly keyboardInteractHeld: boolean;
  readonly pointer: PointerIntentState;
}): number {
  const keyboardBits = inputVectorBits(options.keyboardVector);
  const movementBits = keyboardBits !== 0 ? keyboardBits : pointerIntentBits(options.pointer);
  return options.keyboardInteractHeld ? movementBits | INTERACT_BIT : movementBits;
}

export function pointerIntentBits(pointer: PointerIntentState): number {
  if (!pointer.active) {
    return 0;
  }

  const dx = pointer.targetX - pointer.playerX;
  const dy = pointer.targetY - pointer.playerY;
  if (Math.hypot(dx, dy) <= POINTER_DEADZONE) {
    return 0;
  }

  return axisBits(dx, 0) | axisBits(dy, 2);
}

export function worldPointFromClient(options: {
  readonly clientX: number;
  readonly clientY: number;
  readonly rect: ClientRectLike;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
}): { readonly x: number; readonly y: number } {
  const canvasX = ((options.clientX - options.rect.left) / options.rect.width) * options.canvasWidth;
  const canvasY = ((options.clientY - options.rect.top) / options.rect.height) * options.canvasHeight;
  return {
    x: (canvasX / options.canvasWidth) * options.worldWidth,
    y: (canvasY / options.canvasHeight) * options.worldHeight
  };
}

export function logicalCanvasPoint(options: {
  readonly clientX: number;
  readonly clientY: number;
  readonly rect: ClientRectLike;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly devicePixelRatio: number;
}): { readonly x: number; readonly y: number } {
  const dpr = Math.max(1, Math.round(options.devicePixelRatio || 1));
  return {
    x: ((options.clientX - options.rect.left) / options.rect.width) * (options.canvasWidth / dpr),
    y: ((options.clientY - options.rect.top) / options.rect.height) * (options.canvasHeight / dpr)
  };
}

export function launchStatusForDoor(
  doorId: string,
  registry: readonly HubGameDefinition[]
): DoorLaunchStatus {
  const game = getGameById(registry, doorId);
  if (game === undefined) {
    return { kind: 'missing', statusText: 'that door leads nowhere yet' };
  }

  const plan = createLaunchPlan(game);
  if (plan.kind !== 'launchable') {
    return { kind: 'locked', statusText: formatLockedDoorStatus(game.title) };
  }

  return { kind: 'launchable', plan };
}

export function finishPointerCapture(options: {
  readonly pointerActive: boolean;
  readonly pointerId: number;
  readonly target: PointerCaptureTarget;
}): boolean {
  if (!options.pointerActive) {
    return false;
  }
  if (options.target.hasPointerCapture(options.pointerId)) {
    options.target.releasePointerCapture(options.pointerId);
  }
  return false;
}

function formatLockedDoorStatus(title: string): string {
  return /\bdoor$/i.test(title)
    ? `${title} \u2014 comin\u2019 soon.`
    : `${title} door \u2014 comin\u2019 soon.`;
}

function inputVectorBits(v: HubInputVector): number {
  return inputAxisBits(v.x, 0) | inputAxisBits(v.y, 2);
}

function inputAxisBits(value: number, shift: number): number {
  if (value > 0) {
    return 0b01 << shift;
  }
  if (value < 0) {
    return 0b10 << shift;
  }
  return 0;
}

function axisBits(value: number, shift: number): number {
  if (value > POINTER_DEADZONE * 0.4) {
    return 0b01 << shift;
  }
  if (value < -POINTER_DEADZONE * 0.4) {
    return 0b10 << shift;
  }
  return 0;
}
