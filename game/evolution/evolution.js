// Evolution Engine - checks conditions and triggers BugMon evolutions

import { getEvents } from './tracker.js';

let evolutionData = null;
let evoMonstersData = null;
let pendingEvolution = null;

export function setEvolutionData(data) { evolutionData = data; }
export function setMonstersDataForEvolution(data) { evoMonstersData = data; }

// Find the trigger for a monster's evolution (shared by check + progress)
function findTrigger(monsterId) {
  if (!evolutionData) return null;
  for (const chain of evolutionData.chains) {
    for (const trigger of chain.triggers) {
      if (trigger.from === monsterId) return { trigger, chain };
    }
  }
  return null;
}

export function checkEvolution(monster) {
  if (!monster.evolvesTo) return null;
  const match = findTrigger(monster.id);
  if (!match) return null;

  const events = getEvents();
  const { event, count } = match.trigger.condition;
  if (events[event] >= count) {
    const evolvedForm = evoMonstersData.find(m => m.id === match.trigger.to);
    if (evolvedForm) {
      return { from: monster, to: evolvedForm, trigger: match.trigger, chain: match.chain };
    }
  }
  return null;
}

export function checkPartyEvolutions(party) {
  for (let i = 0; i < party.length; i++) {
    const result = checkEvolution(party[i]);
    if (result) return { ...result, partyIndex: i };
  }
  return null;
}

export function applyEvolution(party, partyIndex, evolvedForm) {
  const oldMon = party[partyIndex];
  const hpRatio = oldMon.currentHP / oldMon.hp;
  const newMon = { ...evolvedForm, currentHP: Math.ceil(evolvedForm.hp * hpRatio) };
  party[partyIndex] = newMon;
  return newMon;
}

export function getEvolutionProgress(monster) {
  if (!monster.evolvesTo) return null;
  const match = findTrigger(monster.id);
  if (!match) return null;

  const events = getEvents();
  const { event, count } = match.trigger.condition;
  const current = events[event] || 0;
  const evolvedForm = evoMonstersData ? evoMonstersData.find(m => m.id === match.trigger.to) : null;
  return {
    chainName: match.chain.name,
    eventType: event,
    eventLabel: evolutionData.events[event]?.label || event,
    current: Math.min(current, count),
    required: count,
    percentage: Math.min(100, Math.floor((current / count) * 100)),
    evolvesTo: evolvedForm ? evolvedForm.name : '???'
  };
}

export function setPendingEvolution(evo) { pendingEvolution = evo; }
export function getPendingEvolution() { return pendingEvolution; }
export function clearPendingEvolution() { pendingEvolution = null; }
