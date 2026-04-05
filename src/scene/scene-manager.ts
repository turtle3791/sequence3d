import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  labelRenderer: CSS2DRenderer;
  controls: OrbitControls;
  private diagramGroup: THREE.Group;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 4, 25);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 4, 0);

    this.setupLights();
    this.setupGrid();

    this.diagramGroup = new THREE.Group();
    this.scene.add(this.diagramGroup);

    this.setupControlsHelp(container);

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private setupControlsHelp(container: HTMLElement): void {
    const help = document.createElement('div');
    help.className = 'controls-help';
    help.innerHTML = `
      <div class="controls-help__item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="6" y="2" width="12" height="20" rx="6" />
          <line x1="12" y1="2" x2="12" y2="22" />
          <rect x="9" y="5" width="3" height="5" rx="1" fill="currentColor" opacity="0.6" />
        </svg>
        <span>Rotate</span>
      </div>
      <div class="controls-help__item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="6" y="2" width="12" height="20" rx="6" />
          <line x1="12" y1="2" x2="12" y2="22" />
          <rect x="12" y="5" width="3" height="5" rx="1" fill="currentColor" opacity="0.6" />
        </svg>
        <span>Pan</span>
      </div>
      <div class="controls-help__item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="6" y="2" width="12" height="20" rx="6" />
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="12" y1="6" x2="12" y2="10" stroke-width="2" opacity="0.8" />
          <polyline points="9,8 12,5 15,8" stroke-width="1.5" />
          <polyline points="9,9 12,12 15,9" stroke-width="1.5" />
        </svg>
        <span>Zoom</span>
      </div>
    `;
    container.appendChild(help);
  }

  private setupLights(): void {
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(5, 10, 7);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);
  }

  private setupGrid(): void {
    const grid = new THREE.GridHelper(40, 40, 0x222244, 0x111133);
    grid.position.y = -5;
    grid.material.transparent = true;
    grid.material.opacity = 0.3;
    this.scene.add(grid);
  }

  getDiagramGroup(): THREE.Group {
    return this.diagramGroup;
  }

  clearDiagram(): void {
    this.diagramGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
      // Remove CSS2DObject label DOM elements
      if ((obj as any).isCSS2DObject && (obj as any).element) {
        (obj as any).element.remove();
      }
    });
    this.diagramGroup.clear();
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
  };

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  };

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
