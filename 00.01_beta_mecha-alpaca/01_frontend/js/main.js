import { getState, addItem, useEnergyCore, craftLaserwolle, cleanInventory } from './inventory.js';
import { renderStatus, renderInventory, renderScene } from './renderer.js';
import { saveState, clearState } from './storage.js';

let state = getState();
const statusEl = document.getElementById('playerStatus');
const invEl = document.getElementById('invGrid');
const canvas = document.getElementById('sceneCanvas');
const demoToggle = document.getElementById('demoToggle');

function paint(){
  renderStatus(statusEl, state);
  renderInventory(invEl, state);
}
paint();

// Scene loop
let tick=0;
function loop(){ renderScene(canvas, tick++); requestAnimationFrame(loop); }
loop();

document.getElementById('addMetal').onclick = () => { addItem(state,'metallfaser',1); state = cleanInventory(state); paint(); };
document.getElementById('addBio').onclick = () => { addItem(state,'biokohle',1); state = cleanInventory(state); paint(); };
document.getElementById('healBtn').onclick = () => { useEnergyCore(state); paint(); };
document.getElementById('craftBtn').onclick = () => { craftLaserwolle(state); state = cleanInventory(state); paint(); };

document.getElementById('saveBtn').onclick = () => { saveState(state); alert('Gespeichert.'); };
document.getElementById('resetBtn').onclick = () => { clearState(); state = getState(); paint(); };

// For now, demo toggle is visual only; backend wiring can be added later.
demoToggle.onchange = () => {
  if(!demoToggle.checked){
    alert('Backend-Modus erfordert das Starten des Servers im Ordner backend. Für GitHub Pages bitte Demo-Modus nutzen.');
    demoToggle.checked = true;
  }
};
