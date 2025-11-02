import { saveState, loadState } from './storage.js';

export const ITEMS = {
  metallfaser: { key:'metallfaser', name:'Metallfaser', icon:'assets/art/icon_metal.svg', stackable:true },
  biokohle:    { key:'biokohle', name:'Biokohle', icon:'assets/art/icon_bio.svg', stackable:true },
  energiekern: { key:'energiekern', name:'Energiekern', icon:'assets/art/icon_energy.svg', stackable:true },
  laserwolle:  { key:'laserwolle', name:'Laserwolle', icon:'assets/art/weapon_laserwolle.svg', stackable:false }
};

export function newGame(){
  return {
    player: { name:'Unit-ALP-01', hp: 80, hpMax:100, level:1, zone:'Stahlsteppe' },
    inventory: [
      { item:'metallfaser', qty:10 },
      { item:'biokohle', qty:6 },
      { item:'energiekern', qty:2 }
    ]
  };
}

export function getState(){
  return loadState() || newGame();
}

export function addItem(state, key, qty=1){
  const it = ITEMS[key];
  if(!it) return state;
  const slot = state.inventory.find(s => s.item===key && it.stackable);
  if(slot) slot.qty += qty;
  else state.inventory.push({ item:key, qty });
  return state;
}

export function useEnergyCore(state){
  const slot = state.inventory.find(s => s.item==='energiekern');
  if(slot && slot.qty>0){
    slot.qty -= 1;
    state.player.hp = Math.min(state.player.hp + 30, state.player.hpMax);
  }
  return state;
}

export function craftLaserwolle(state){
  const mf = state.inventory.find(s => s.item==='metallfaser');
  const bio = state.inventory.find(s => s.item==='biokohle');
  if(mf and bio and mf.qty>=3 and bio.qty>=2){
    mf.qty -= 3; bio.qty -= 2;
    state.inventory.push({ item:'laserwolle', qty:1 });
  }
  return state;
}

export function cleanInventory(state){
  state.inventory = state.inventory.filter(s => s.qty>0);
  return state;
}
