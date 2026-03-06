// Type data — inlined from types.json
const T = ['frontend','backend','devops','testing','architecture','security','ai'];
// 7x7 effectiveness matrix (row=attacker, col=defender), read left-to-right
const E = [1,1.5,1,1.5,.5,1,.5,.5,1,1.5,1,1.5,.5,1,1,.5,1,1.5,1,1.5,.5,.5,1,.5,1,1.5,1,1.5,1.5,.5,1,.5,1,1.5,1,1,1.5,.5,1,.5,1,1.5,1.5,1,1.5,.5,1,.5,1];
const eff = {};
for (let i = 0; i < 7; i++) {
  eff[T[i]] = {};
  for (let j = 0; j < 7; j++) eff[T[i]][T[j]] = E[i * 7 + j];
}
export const TYPES = {
  types: T,
  typeColors: {frontend:'#3498db',backend:'#e74c3c',devops:'#f39c12',testing:'#2ecc71',architecture:'#9b59b6',security:'#e94560',ai:'#00d2ff'},
  effectiveness: eff
};
