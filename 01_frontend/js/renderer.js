import { ITEMS } from './inventory.js';

export function renderStatus(el, state){
  el.innerHTML = [
    `<div><strong>Einheit:</strong> ${state.player.name}</div>`,
    `<div><strong>Level:</strong> ${state.player.level}</div>`,
    `<div><strong>HP:</strong> ${state.player.hp} / ${state.player.hpMax}</div>`,
    `<div><strong>Zone:</strong> ${state.player.zone}</div>`
  ].join('');
}

export function renderInventory(el, state){
  el.innerHTML = '';
  // Fixed 32 slots grid for prototype
  const totalSlots = 32;
  const slots = Array.from({length:totalSlots}, (_,i)=>state.inventory[i] || null);
  for(const s of slots){
    const div = document.createElement('div');
    div.className = 'slot';
    if(s){
      const item = ITEMS[s.item];
      const img = document.createElement('img');
      img.src = item.icon; img.alt = item.name;
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = `x${s.qty}`;
      div.appendChild(img);
      div.appendChild(badge);
      div.title = item.name;
    }
    el.appendChild(div);
  }
}

export function renderScene(canvas, tick){
  const ctx = canvas.getContext('2d');
  const t = tick/60;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  // background gradient
  const g = ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#0d1117'); g.addColorStop(1,'#161b22');
  ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  // sun
  ctx.beginPath(); ctx.arc(520,80,40,0,Math.PI*2);
  ctx.fillStyle = '#ffdd55'; ctx.globalAlpha = 0.2 + 0.2*Math.sin(t);
  ctx.fill(); ctx.globalAlpha = 1;
  // ground
  ctx.fillStyle = '#202833'; ctx.fillRect(0,h-70,w,70);
  // mech alpaca silhouette
  ctx.save();
  ctx.translate(160+10*Math.sin(t*2), h-90);
  ctx.scale(1.2,1.2);
  ctx.fillStyle = '#9fb7d0';
  ctx.beginPath();
  ctx.moveTo(0,0); ctx.lineTo(50,-20); ctx.lineTo(80,-10); ctx.lineTo(110,-30); ctx.lineTo(140,-20);
  ctx.lineTo(150,0); ctx.lineTo(120,10); ctx.lineTo(80,5); ctx.lineTo(40,15); ctx.closePath(); ctx.fill();
  // eye
  ctx.beginPath(); ctx.arc(95,-18,5,0,Math.PI*2); ctx.fillStyle='#e7ecf2'; ctx.fill();
  // antenna
  ctx.fillStyle = '#6aa9ff'; ctx.fillRect(120,-40,4,-18);
  ctx.restore();
}
