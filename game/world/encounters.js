// Browser encounter adapter — delegates to domain/encounters.js, adds audio
import { playEncounterAlert } from '../audio/sound.js';
import { checkEncounter as domainCheckEncounter } from '../../domain/encounters.js';

let monstersData = [];

export function setMonstersData(data) {
  monstersData = data;
}

export function checkEncounter(tile) {
  const result = domainCheckEncounter(tile, monstersData);
  if (result) playEncounterAlert();
  return result;
}
