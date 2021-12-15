import { logger } from './logger.js';

/* DND5E Class Imports */
import { DND5E } from '../../../systems/dnd5e/module/config.js';
import ActorSheet5eCharacter from '../../../systems/dnd5e/module/actor/sheets/character.js'
import ActorSheet5eNPC from '../../../systems/dnd5e/module/actor/sheets/npc.js'
import Actor5e from '../../../systems/dnd5e/module/actor/entity.js'
/* Common operations and utilities for all
 * core submodules
 */

const NAME = 'symbaroum-5e-core';
const TITLE = 'Symbaroum 5E Ruins of Symbaroum - Core System';
const PATH = `/modules/${NAME}`;

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
    Actor5e
  };

  static NAME = this.name;
  /** \CONSTANTS **/

  /* runtime construction of basic information about this module */
  static build() {
    COMMON.hooks();
  }

  static register() {
    logger.info(COMMON.localize('SYB5E.Init.SubModule', {name: this.NAME}));
  }

  static hooks() {
    Hooks.on('init', COMMON._init);
  }

  static _init() {

    return loadTemplates([
      /* Actor partials */
      "modules/symbaroum-5e-core/templates/actors/parts/actor-corruption.html"
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

}

