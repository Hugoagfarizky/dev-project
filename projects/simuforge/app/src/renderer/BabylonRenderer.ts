import {
  Engine
} from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { HighlightLayer } from '@babylonjs/core/Layers/highlightLayer';
import { GizmoManager } from '@babylonjs/core/Gizmos/gizmoManager';
import { GizmoCoordinatesMode } from '@babylonjs/core/Gizmos/gizmo';
import '@babylonjs/core/Culling/ray';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { WorldDocument, WorldEntity, Transform } from '../world/types.js';
import type { RendererDiagnostics, RendererEventSink, GizmoMode } from './RendererPort.js';
import { transformsEqual } from '../world/transform.js';

const CLICK_THRESHOLD_PX = 5;
const GRID_EXTENT = 50;
const GRID_FILL_Y = -0.003;
const GRID_LINE_Y = -0.002;
const GRID_FILL_COLOR = new Color3(0.16, 0.18, 0.22);
const GRID_LINE_COLOR = new Color3(0.26, 0.29, 0.34);
const PRIMITIVE_COLOR = new Color3(0.55, 0.72, 0.95);

export class BabylonRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private camera: ArcRotateCamera | null = null;
  private highlight: HighlightLayer | null = null;
  private gizmoManager: GizmoManager | null = null;
  private grid: AbstractMesh | null = null;
  private gridLines: AbstractMesh | null = null;
  private meshes = new Map<string, AbstractMesh>();
  private selectedEntityId: string | null = null;
  private gizmoMode: GizmoMode = 'translate';
  private eventSink: RendererEventSink | null = null;
  private contextLost = false;
  private activeDragEntityId: string | null = null;
  private isDragging = false;
  private configuredGizmos = new Set<unknown>();
  private pointerDown: { x: number; y: number } | null = null;
  private pointerMoved = false;
  private lastCameraSignature = '';
  private lastWorldSignature = '';
  private committedTransform: Transform | null = null;
  private pendingPreview = false;
  private dragEnded = false;
  // dragLockedSelection retained for future use (selection lock during drag)
  private lastAppliedSelection: string | null = null;
  private lastAppliedGizmoMode: GizmoMode | null = null;
  private windowBlurHandler: (() => void) | null = null;

  async mount(canvas: HTMLCanvasElement): Promise<RendererDiagnostics> {
    this.canvas = canvas;

    try {
      this.engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true
      });

      this.scene = new Scene(this.engine);
      this.scene.useRightHandedSystem = true;

      this.camera = new ArcRotateCamera(
        'camera',
        Math.PI / 2,
        Math.PI / 3,
        10,
        Vector3.Zero(),
        this.scene
      );
      this.camera.attachControl(canvas, true);

      const pointersInput = this.camera.inputs.attached.pointers as { buttons?: number[] } | undefined;
      if (pointersInput) {
        pointersInput.buttons = [0, 1, 2];
      }

      // Explicit camera input mapping (OD-I06-02 / LIM-I05-01).
      // Plain left drag must not orbit; Alt+left or middle drag orbits.
      const movementInput = (this.camera as unknown as { movement?: { input?: { inputMap: unknown[] } } }).movement?.input;
      if (movementInput) {
        movementInput.inputMap = [
          { source: 'pointer', button: 0, modifiers: { alt: true }, interaction: 'rotate' },
          { source: 'pointer', button: 1, modifiers: { shift: true }, interaction: 'pan' },
          { source: 'pointer', button: 1, interaction: 'rotate' },
          { source: 'pointer', button: 2, interaction: 'pan' },
          { source: 'wheel', interaction: 'zoom' }
        ];
      }

      this.camera.lowerRadiusLimit = 0.5;
      this.camera.upperRadiusLimit = 500;
      this.camera.lowerBetaLimit = 0.01;
      this.camera.upperBetaLimit = Math.PI - 0.01;

      this.grid = MeshBuilder.CreateGround(
        'grid',
        { width: GRID_EXTENT * 2, height: GRID_EXTENT * 2, subdivisions: 1 },
        this.scene
      );
      this.grid.position.y = GRID_FILL_Y;
      this.grid.isPickable = false;
      const gridMaterial = new StandardMaterial('grid-material', this.scene);
      gridMaterial.diffuseColor = GRID_FILL_COLOR;
      gridMaterial.emissiveColor = GRID_FILL_COLOR;
      gridMaterial.disableLighting = true;
      gridMaterial.backFaceCulling = false;
      this.grid.material = gridMaterial;
      this.gridLines = createGridLines(this.scene);

      this.highlight = new HighlightLayer('selection-highlight', this.scene);
      this.gizmoManager = new GizmoManager(this.scene);
      this.gizmoManager.usePointerToAttachGizmos = false;
      // Coordinate space + observers are configured lazily in applyGizmoMode,
      // because gizmos are created on demand by GizmoManager.
      this.applyGizmoMode(this.gizmoMode);

      this.engine.onContextLostObservable.add(() => {
        this.contextLost = true;
        this.eventSink?.onError({ code: 'RENDER_CONTEXT_LOST', message: 'WebGL context was lost' });
      });

      this.engine.onContextRestoredObservable.add(() => {
        this.contextLost = false;
        this.eventSink?.onError({ code: 'RENDER_CONTEXT_RESTORED', message: 'WebGL context was restored' });
      });

      canvas.addEventListener('pointerdown', this.handlePointerDown);
      canvas.addEventListener('pointermove', this.handlePointerMove);
      canvas.addEventListener('pointerup', this.handlePointerUp);
      canvas.addEventListener('pointercancel', this.handlePointerCancel);
      canvas.addEventListener('lostpointercapture', this.handleLostPointerCapture);

      const windowBlur = () => this.handleWindowBlur();
      this.windowBlurHandler = windowBlur;
      window.addEventListener('blur', windowBlur);

      // Gizmo observers + coordinate-space config are attached lazily in
      // configureGizmos(), called from applyGizmoMode(), because the
      // GizmoManager creates gizmos on demand.

      this.engine.runRenderLoop(() => {
        if (!this.scene || !this.camera) return;
        this.scene.render();
        if (this.pendingPreview && this.isDragging && this.activeDragEntityId) {
          const mesh = this.meshes.get(this.activeDragEntityId);
          if (mesh) {
            this.eventSink?.onTransformPreview(this.activeDragEntityId, readTransform(mesh));
          }
          this.pendingPreview = false;
        }
        this.reportCameraChange();
      });

      return this.getDiagnostics();
    } catch (error) {
      this.dispose();
      throw {
        code: 'RENDERER_INITIALIZATION_FAILED',
        message: error instanceof Error ? error.message : 'Renderer initialization failed'
      };
    }
  }

  dispose(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
      this.canvas.removeEventListener('pointermove', this.handlePointerMove);
      this.canvas.removeEventListener('pointerup', this.handlePointerUp);
      this.canvas.removeEventListener('pointercancel', this.handlePointerCancel);
      this.canvas.removeEventListener('lostpointercapture', this.handleLostPointerCapture);
    }
    if (this.windowBlurHandler) {
      window.removeEventListener('blur', this.windowBlurHandler);
      this.windowBlurHandler = null;
    }

    for (const mesh of this.meshes.values()) {
      disposeMesh(mesh);
    }
    this.meshes.clear();

    this.gizmoManager?.dispose();
    this.highlight?.dispose();
    this.gridLines?.dispose();
    if (this.grid) {
      disposeMesh(this.grid);
    }
    this.camera?.dispose();
    this.scene?.dispose();
    this.engine?.dispose();

    this.gizmoManager = null;
    this.highlight = null;
    this.gridLines = null;
    this.grid = null;
    this.camera = null;
    this.scene = null;
    this.engine = null;
    this.canvas = null;
    this.activeDragEntityId = null;
    this.isDragging = false;
    this.committedTransform = null;
    this.configuredGizmos.clear();
  }

  resize(width: number, height: number): void {
    if (!this.canvas || !this.engine) return;
    if (width > 0 && height > 0) {
      this.canvas.width = Math.floor(width * window.devicePixelRatio);
      this.canvas.height = Math.floor(height * window.devicePixelRatio);
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
    }
    this.engine.resize();
  }

  applyWorld(world: WorldDocument): void {
    if (!this.scene) return;

    const signature = JSON.stringify(world);
    if (signature === this.lastWorldSignature) return;
    this.lastWorldSignature = signature;

    const activeDrag = this.isDragging && this.activeDragEntityId !== null;
    const worldIds = new Set(world.entities.map((entity) => entity.id));

    for (const [id, mesh] of this.meshes) {
      if (!worldIds.has(id)) {
        disposeMesh(mesh);
        this.meshes.delete(id);
      }
    }

    for (const entity of world.entities) {
      let mesh = this.meshes.get(entity.id);
      if (!mesh) {
        mesh = createMesh(entity, this.scene);
        this.meshes.set(entity.id, mesh);
      } else {
        mesh.name = entity.name;
      }

      if (activeDrag && entity.id === this.activeDragEntityId) {
        continue;
      }

      mesh.position.set(entity.transform.position.x, entity.transform.position.y, entity.transform.position.z);
      if (!mesh.rotationQuaternion) {
        mesh.rotationQuaternion = new Quaternion(
          entity.transform.rotation.x,
          entity.transform.rotation.y,
          entity.transform.rotation.z,
          entity.transform.rotation.w
        );
      } else {
        mesh.rotationQuaternion.set(
          entity.transform.rotation.x,
          entity.transform.rotation.y,
          entity.transform.rotation.z,
          entity.transform.rotation.w
        );
      }
      mesh.scaling.set(entity.transform.scale.x, entity.transform.scale.y, entity.transform.scale.z);
    }

    // Only reattach highlight/gizmo when selection actually changed.
    if (this.selectedEntityId !== this.lastAppliedSelection) {
      this.lastAppliedSelection = this.selectedEntityId;
    }
  }

  applySelection(entityId: string | null): void {
    // Lock selection during an active gizmo drag.
    if (this.isDragging) {
      return;
    }
    if (entityId === this.selectedEntityId && this.lastAppliedSelection === entityId) {
      // still update field
    }
    this.selectedEntityId = entityId;
    this.activeDragEntityId = entityId;

    if (this.highlight) {
      for (const mesh of this.meshes.values()) {
        this.highlight.removeMesh(mesh as never);
      }
    }

    if (entityId) {
      const mesh = this.meshes.get(entityId);
      if (mesh && this.highlight) {
        this.highlight.addMesh(mesh as never, new Color3(0.34, 0.71, 1));
      }
      if (mesh && this.gizmoManager && this.selectedEntityId === entityId) {
        this.gizmoManager.attachToMesh(mesh);
      }
    } else if (this.gizmoManager) {
      this.gizmoManager.attachToMesh(null as unknown as AbstractMesh);
    }
  }

  applyGizmoMode(mode: GizmoMode): void {
    if (this.isDragging) return;
    if (mode === this.gizmoMode && this.lastAppliedGizmoMode === mode) {
      // still allow attach refresh
    }
    this.gizmoMode = mode;
    this.lastAppliedGizmoMode = mode;
    if (!this.gizmoManager) return;

    this.gizmoManager.positionGizmoEnabled = mode === 'translate';
    this.gizmoManager.rotationGizmoEnabled = mode === 'rotate';
    this.gizmoManager.scaleGizmoEnabled = mode === 'scale';

    this.configureGizmos();

    if (this.selectedEntityId) {
      const mesh = this.meshes.get(this.selectedEntityId);
      if (mesh) {
        this.gizmoManager.attachToMesh(mesh);
      }
    }
  }

  private configureGizmos(): void {
    if (!this.gizmoManager) return;
    const gm = this.gizmoManager;
    const pos = gm.gizmos.positionGizmo;
    const rot = gm.gizmos.rotationGizmo;
    const scl = gm.gizmos.scaleGizmo;

    if (pos) {
      pos.coordinatesMode = GizmoCoordinatesMode.World;
      pos.updateGizmoRotationToMatchAttachedMesh = false;
    }
    if (rot) {
      rot.coordinatesMode = GizmoCoordinatesMode.World;
      rot.updateGizmoRotationToMatchAttachedMesh = false;
    }
    if (scl) {
      scl.coordinatesMode = GizmoCoordinatesMode.Local;
      scl.updateGizmoRotationToMatchAttachedMesh = true;
    }

    const gizmos = [pos, rot, scl].filter((g): g is NonNullable<typeof g> => Boolean(g));
    for (const gizmo of gizmos) {
      if (this.configuredGizmos.has(gizmo)) continue;
      this.configuredGizmos.add(gizmo);
      gizmo.onDragStartObservable.add(() => {
        if (this.isDragging) return;
        this.isDragging = true;
        this.dragEnded = false;
        const mesh = this.activeDragEntityId ? this.meshes.get(this.activeDragEntityId) : null;
        if (mesh) {
          this.committedTransform = readTransform(mesh);
        }
      });
      gizmo.onDragObservable.add(() => {
        if (!this.activeDragEntityId) return;
        this.pendingPreview = true;
      });
      gizmo.onDragEndObservable.add(() => {
        if (this.dragEnded) return;
        this.dragEnded = true;
        this.finalizeDrag();
      });
    }
  }

  applyGridVisible(visible: boolean): void {
    if (this.grid) {
      this.grid.isVisible = visible;
    }
    if (this.gridLines) {
      this.gridLines.isVisible = visible;
    }
  }

  setEventSink(sink: RendererEventSink): void {
    this.eventSink = sink;
  }

  frameSelection(entityId: string | null): void {
    if (!this.camera || !entityId) return;
    const mesh = this.meshes.get(entityId);
    if (!mesh) return;
    const info = mesh.getBoundingInfo();
    const center = info.boundingBox.centerWorld;
    const extents = info.boundingBox.extendSizeWorld;
    const radius = Math.max(extents.x, extents.y, extents.z) * 2 + 2;
    this.camera.setTarget(center.clone());
    this.camera.radius = Math.min(Math.max(radius, this.camera.lowerRadiusLimit ?? 0.5), this.camera.upperRadiusLimit ?? 500);
  }

  resetCamera(): void {
    if (!this.camera) return;
    this.camera.alpha = Math.PI / 2;
    this.camera.beta = Math.PI / 3;
    this.camera.radius = 10;
    this.camera.setTarget(Vector3.Zero());
  }

  frameWorld(): void {
    if (!this.camera) return;
    if (this.meshes.size === 0) {
      this.camera.setTarget(Vector3.Zero());
      this.camera.radius = 10;
      return;
    }
    let min = new Vector3(Infinity, Infinity, Infinity);
    let max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const mesh of this.meshes.values()) {
      const bb = mesh.getBoundingInfo().boundingBox;
      min = Vector3.Minimize(min, bb.minimumWorld);
      max = Vector3.Maximize(max, bb.maximumWorld);
    }
    const center = min.add(max).scale(0.5);
    const extents = max.subtract(min).scale(0.5);
    const radius = Math.max(extents.x, extents.y, extents.z) * 2 + 2;
    this.camera.setTarget(center.clone());
    this.camera.radius = Math.min(Math.max(radius, this.camera.lowerRadiusLimit ?? 0.5), this.camera.upperRadiusLimit ?? 500);
  }

  getDiagnostics(): RendererDiagnostics {
    return {
      engineVersion: this.engine?.webGLVersion ? `WebGL ${this.engine.webGLVersion}` : 'not initialized',
      webGlVersion: this.engine?.webGLVersion ?? 0,
      meshCount: this.meshes.size,
      entityCount: this.lastWorldSignature ? JSON.parse(this.lastWorldSignature).entities.length : 0,
      contextLost: this.contextLost
    };
  }

  getIsDragging(): boolean {
    return this.isDragging;
  }

  cancelGizmoDrag(): void {
    if (!this.isDragging) return;
    this.restoreCommittedTransform();
    this.cleanupDrag();
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.pointerDown = { x: event.clientX, y: event.clientY };
    this.pointerMoved = false;
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.pointerDown) return;
    const deltaX = event.clientX - this.pointerDown.x;
    const deltaY = event.clientY - this.pointerDown.y;
    if (Math.hypot(deltaX, deltaY) > CLICK_THRESHOLD_PX) {
      this.pointerMoved = true;
    }
  };

  private handlePointerUp = (): void => {
    const pointerDown = this.pointerDown;
    this.pointerDown = null;

    if (!pointerDown || this.pointerMoved || this.isDragging || !this.scene || !this.eventSink) {
      return;
    }

    const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
    const entityId = pick?.pickedMesh?.metadata?.entityId;
    this.eventSink.onPick(typeof entityId === 'string' ? entityId : null);
  };

  private handlePointerCancel = (): void => {
    if (!this.isDragging) return;
    this.restoreCommittedTransform();
    this.cleanupDrag();
  };

  private handleLostPointerCapture = (): void => {
    if (!this.isDragging) return;
    this.restoreCommittedTransform();
    this.cleanupDrag();
  };

  private handleWindowBlur = (): void => {
    if (!this.isDragging) return;
    this.restoreCommittedTransform();
    this.cleanupDrag();
  };

  private finalizeDrag(): void {
    if (!this.activeDragEntityId) {
      this.cleanupDrag();
      return;
    }
    const entityStillExists = this.meshes.has(this.activeDragEntityId);
    if (!entityStillExists) {
      this.restoreCommittedTransform();
      this.cleanupDrag();
      return;
    }
    const mesh = this.meshes.get(this.activeDragEntityId);
    if (mesh && this.committedTransform) {
      const finalTransform = readTransform(mesh);
      if (!transformsEqual(this.committedTransform, finalTransform)) {
        this.eventSink?.onTransformCommit(this.activeDragEntityId, finalTransform);
      }
    }
    this.cleanupDrag();
  }

  private restoreCommittedTransform(): void {
    if (!this.activeDragEntityId || !this.committedTransform) return;
    const mesh = this.meshes.get(this.activeDragEntityId);
    if (!mesh) return;
    mesh.position.set(this.committedTransform.position.x, this.committedTransform.position.y, this.committedTransform.position.z);
    if (mesh.rotationQuaternion) {
      mesh.rotationQuaternion.set(
        this.committedTransform.rotation.x,
        this.committedTransform.rotation.y,
        this.committedTransform.rotation.z,
        this.committedTransform.rotation.w
      );
    }
    mesh.scaling.set(this.committedTransform.scale.x, this.committedTransform.scale.y, this.committedTransform.scale.z);
  }

  private cleanupDrag(): void {
    this.isDragging = false;
    this.pendingPreview = false;
    this.dragEnded = false;
    this.committedTransform = null;
    this.activeDragEntityId = null;
  }

  private reportCameraChange(): void {
    if (!this.camera || !this.eventSink) return;
    const signature = `${this.camera.alpha}:${this.camera.beta}:${this.camera.radius}:${this.camera.target.x}:${this.camera.target.y}:${this.camera.target.z}`;
    if (signature === this.lastCameraSignature) return;
    this.lastCameraSignature = signature;

    this.eventSink.onCameraChange({
      alpha: this.camera.alpha,
      beta: this.camera.beta,
      radius: this.camera.radius,
      target: {
        x: this.camera.target.x,
        y: this.camera.target.y,
        z: this.camera.target.z
      }
    });
  }
}

function createMesh(entity: WorldEntity, scene: Scene): AbstractMesh {
  let mesh: AbstractMesh;
  switch (entity.type) {
    case 'sphere':
      mesh = MeshBuilder.CreateSphere(entity.id, { diameter: 1 }, scene);
      break;
    case 'plane':
      mesh = MeshBuilder.CreateGround(entity.id, { width: 1, height: 1 }, scene);
      break;
    default:
      mesh = MeshBuilder.CreateBox(entity.id, { size: 1 }, scene);
      break;
  }

  mesh.metadata = { entityId: entity.id };
  const material = new StandardMaterial(`${entity.id}-material`, scene);
  material.diffuseColor = Color3.Black();
  material.emissiveColor = PRIMITIVE_COLOR;
  material.disableLighting = true;
  material.backFaceCulling = entity.type !== 'plane';
  mesh.material = material;
  mesh.rotationQuaternion = new Quaternion(
    entity.transform.rotation.x,
    entity.transform.rotation.y,
    entity.transform.rotation.z,
    entity.transform.rotation.w
  );

  return mesh;
}

function createGridLines(scene: Scene): AbstractMesh {
  const lines: Vector3[][] = [];

  for (let offset = -GRID_EXTENT; offset <= GRID_EXTENT; offset += 1) {
    lines.push([
      new Vector3(offset, GRID_LINE_Y, -GRID_EXTENT),
      new Vector3(offset, GRID_LINE_Y, GRID_EXTENT)
    ]);
    lines.push([
      new Vector3(-GRID_EXTENT, GRID_LINE_Y, offset),
      new Vector3(GRID_EXTENT, GRID_LINE_Y, offset)
    ]);
  }

  const gridLines = MeshBuilder.CreateLineSystem('grid-lines', { lines }, scene);
  gridLines.color = GRID_LINE_COLOR;
  gridLines.isPickable = false;
  return gridLines;
}

function disposeMesh(mesh: AbstractMesh): void {
  const material = mesh.material;
  mesh.dispose();
  if (material && !Array.isArray(material)) {
    material.dispose();
  }
}

function readTransform(mesh: AbstractMesh): Transform {
  const rotation = mesh.rotationQuaternion ?? Quaternion.Identity();
  return {
    position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
    rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
    scale: { x: mesh.scaling.x, y: mesh.scaling.y, z: mesh.scaling.z }
  };
}