const SAMPLE_DIAGRAM = `@startuml
participant Browser
participant RecordingScript
participant Backend
participant BigQuery
participant GCS

Browser -> RecordingScript: Page load
RecordingScript -> RecordingScript: Generate sessionId + userId
RecordingScript -> Backend: POST /sessions/start
Backend -> BigQuery: Upsert session metadata
Backend -> GCS: Write empty manifest.json
Backend --> RecordingScript: 201 Created

RecordingScript -> RecordingScript: Start rrweb.record()

loop Every 5 seconds
  RecordingScript -> RecordingScript: Buffer rrweb events
  RecordingScript -> Backend: POST /sessions/:id/chunks
  Backend -> GCS: Write compressed chunk
  Backend -> GCS: Update manifest.json
  Backend -> BigQuery: Update session metadata
  Backend --> RecordingScript: 201 Created
end

Browser -> RecordingScript: Page unload or manual stop
RecordingScript -> Backend: POST /sessions/:id/finish
Backend -> BigQuery: Mark session completed
Backend --> RecordingScript: 200 OK
@enduml`;

import { DiagramMode } from '../types';

export interface PlaybackCallbacks {
  onPlay: (input: string) => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onModeChange: (mode: DiagramMode) => void;
}

export class EditorPanel {
  private container: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private playBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private speedLabel: HTMLSpanElement;
  private callbacks: PlaybackCallbacks;
  private paused = false;

  constructor(parent: HTMLElement, callbacks: PlaybackCallbacks) {
    this.callbacks = callbacks;

    this.container = document.createElement('div');
    this.container.className = 'editor-panel';

    const title = document.createElement('h2');
    title.textContent = 'Sequence3D';
    this.container.appendChild(title);

    // Mode toggle
    const modeRow = document.createElement('div');
    modeRow.className = 'mode-toggle';

    const seqLabel = document.createElement('span');
    seqLabel.className = 'mode-label mode-label--active';
    seqLabel.textContent = 'Sequence';
    seqLabel.dataset.mode = 'sequence';

    const toggleTrack = document.createElement('label');
    toggleTrack.className = 'toggle-track';
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.className = 'toggle-input';
    const toggleSlider = document.createElement('span');
    toggleSlider.className = 'toggle-slider';
    toggleTrack.appendChild(toggleInput);
    toggleTrack.appendChild(toggleSlider);

    const sysLabel = document.createElement('span');
    sysLabel.className = 'mode-label';
    sysLabel.textContent = 'System';
    sysLabel.dataset.mode = 'system';

    toggleInput.addEventListener('change', () => {
      const mode: DiagramMode = toggleInput.checked ? 'system' : 'sequence';
      seqLabel.classList.toggle('mode-label--active', !toggleInput.checked);
      sysLabel.classList.toggle('mode-label--active', toggleInput.checked);
      this.callbacks.onModeChange(mode);
    });

    modeRow.appendChild(seqLabel);
    modeRow.appendChild(toggleTrack);
    modeRow.appendChild(sysLabel);
    this.container.appendChild(modeRow);

    this.textarea = document.createElement('textarea');
    this.textarea.value = SAMPLE_DIAGRAM;
    this.textarea.spellcheck = false;
    this.container.appendChild(this.textarea);

    // Play / Pause / Reset buttons
    const buttons = document.createElement('div');
    buttons.className = 'editor-buttons';

    this.playBtn = document.createElement('button');
    this.playBtn.textContent = '▶ Play';
    this.playBtn.className = 'btn-play';
    this.playBtn.addEventListener('click', () => {
      this.callbacks.onPlay(this.textarea.value);
      this.setPaused(false);
    });
    buttons.appendChild(this.playBtn);

    this.pauseBtn = document.createElement('button');
    this.pauseBtn.textContent = '⏸ Pause';
    this.pauseBtn.className = 'btn-pause';
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    buttons.appendChild(this.pauseBtn);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '↻ Reset';
    resetBtn.className = 'btn-reset';
    resetBtn.addEventListener('click', () => {
      this.callbacks.onReset();
      this.setPaused(false);
    });
    buttons.appendChild(resetBtn);

    this.container.appendChild(buttons);

    // Speed control
    const speedRow = document.createElement('div');
    speedRow.className = 'speed-control';

    const speedTitle = document.createElement('span');
    speedTitle.className = 'speed-title';
    speedTitle.textContent = 'Speed';
    speedRow.appendChild(speedTitle);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'speed-slider';
    slider.min = '0.25';
    slider.max = '3';
    slider.step = '0.25';
    slider.value = '1';
    speedRow.appendChild(slider);

    this.speedLabel = document.createElement('span');
    this.speedLabel.className = 'speed-value';
    this.speedLabel.textContent = '1×';
    speedRow.appendChild(this.speedLabel);

    slider.addEventListener('input', () => {
      const speed = parseFloat(slider.value);
      this.speedLabel.textContent = `${speed}×`;
      this.callbacks.onSpeedChange(speed);
    });

    this.container.appendChild(speedRow);
    parent.appendChild(this.container);
  }

  private togglePause(): void {
    if (this.paused) {
      this.callbacks.onResume();
    } else {
      this.callbacks.onPause();
    }
    this.setPaused(!this.paused);
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    this.pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause';
    this.pauseBtn.classList.toggle('is-paused', paused);
  }

  getValue(): string {
    return this.textarea.value;
  }
}
