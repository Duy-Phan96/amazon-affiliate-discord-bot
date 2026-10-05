import { MARKETPLACES } from '../domain/amazon.js';
import type { SetupConfig } from '../domain/config.js';
export class UserInputError extends Error {}
export function validateSetup(config: SetupConfig): void {
  if (!['BASIC', 'AFFILIATE'].includes(config.productMode)) throw new UserInputError('Choose Basic or Affiliate mode.');
  if (!['OFF', 'REPLY', 'BUTTON'].includes(config.linkMode)) throw new UserInputError('Choose a valid link behavior.');
  if (!config.marketplaces.length || config.marketplaces.length > 3 || new Set(config.marketplaces).size !== config.marketplaces.length || config.marketplaces.some(m => !Object.hasOwn(MARKETPLACES, m))) throw new UserInputError('Choose supported, unique marketplaces.');
  if (!config.channels.length || config.channels.length > 5 || new Set(config.channels).size !== config.channels.length || config.channels.some(id => !/^\d{17,20}$/.test(id))) throw new UserInputError('Choose one to five text channels.');
  if (config.productMode === 'BASIC' && config.oneLinkDeclared) throw new UserInputError('Basic mode does not use affiliate tracking or OneLink.');
  if (config.productMode === 'AFFILIATE') for (const m of config.marketplaces) {
    // Syntactic validation only; a suffix never proves approval in a country.
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,96}-\d{2}$/.test(config.tags[m] ?? '')) throw new UserInputError('Enter a real tracking ID for every selected marketplace. This is not an API key.');
  }
}
