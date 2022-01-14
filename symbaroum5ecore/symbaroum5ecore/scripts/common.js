/* DND5E Class Imports */
import { DND5E } from '../../../systems/dnd5e/module/config.js';
import ActorSheet5eCharacter from '../../../systems/dnd5e/module/actor/sheets/character.js'
import ActorSheet5eNPC from '../../../systems/dnd5e/module/actor/sheets/npc.js'
import Item5e from '../../../systems/dnd5e/module/item/entity.js'

/* Common operations and utilities for all
 * core submodules
 */

const NAME = 'symbaroum5ecore';
const TITLE = 'Symbaroum 5E Ruins of Symbaroum - Core System';
const PATH = `modules/${NAME}`;

export class COMMON {

  /** CONSTANTS **/
  static DATA = {
    name: NAME,
    path: PATH,
    title: TITLE,
    dndPath: `${PATH}/../../systems/dnd5e`
  };

  static CLASSES = {
    DND5E,
    ActorSheet5eCharacter,
    ActorSheet5eNPC,
    Item5e,
  };

  static NAME = this.name;
  /** \CONSTANTS **/

  /* runtime construction of basic information about this module */
  static build() {

  }

  static register() {
    COMMON.globals();
  }

  static globals() {

    /* register our namespace */
    globalThis.game.syb5e = {
      debug: {},
    };
   
  }

  static _init() {

    return loadTemplates([
      /* Actor partials */
      `${COMMON.DATA.path}/templates/actors/parts/actor-corruption.html`,
      `${COMMON.DATA.path}/templates/actors/parts/actor-shadow.html`,
      `${COMMON.DATA.path}/templates/actors/parts/npc-manner.html`,
      `${COMMON.DATA.path}/templates/actors/parts/character-max-spell.html`,
      `${COMMON.DATA.path}/templates/items/parts/spell-favored.html`,
      `${COMMON.DATA.path}/templates/apps/rest.html`,
    ]);

  }

  /** HELPER FUNCTIONS **/
  static setting(key){
    return game.settings.get(COMMON.DATA.name, key);
  }

  static localize( stringId, data = {} ) {
    return game.i18n.format(stringId, data);
  }

  static applySettings(settingsData){
    Object.entries(settingsData).forEach(([key, data])=> {
      game.settings.register(
        COMMON.DATA.name, key, {
          name : COMMON.localize(`setting.${key}.name`),
          hint : COMMON.localize(`setting.${key}.hint`),
          ...data
        }
      );
    });
  }

  static addGetter(object, fieldName, fn) {
    Object.defineProperty(object, fieldName, {
      get: fn
    });
  }

  static translateObject(obj) {
    /* translate in place */
    Object.keys(obj).forEach( key => obj[key] = COMMON.localize(obj[key]));

    return obj;
  }

}

