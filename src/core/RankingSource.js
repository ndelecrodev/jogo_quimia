// Rankings que o jogo MOSTRA: partidas locais + ranking da nuvem (se houver em cache), sem duplicar.
// Sem nuvem (ou sem conexão e sem cache), é exatamente o ranking local de sempre.
import { getPlays, getSettings } from './Storage.js';
import { cachedRows } from './Cloud.js';
import { rankGeneral, rankGame, mergePlays } from './Ranking.js';

export const allPlays = () => mergePlays(getPlays(), cachedRows());
export const generalRanking = () => rankGeneral(allPlays(), { pars: getSettings().pars });
export const gameRanking = (gameId) => rankGame(allPlays(), gameId);
