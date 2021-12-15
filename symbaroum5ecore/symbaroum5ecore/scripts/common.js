import { logger } from './logger.js';

/* Common operations and utilities for all
 * core submodules
 */

const NAME = 'symbaroum-5e-core';
const TITLE = 'Symbaroum 5E Ruins of Symbaroum - Core System';
const PATH = `/modules/${NAME}`;

export class COMMON {
  static NAME = this.name;

  static register() {
    logger.info(COMMON.localize('SYB5E.Init.SubModule', {name: this.NAME}));
    COMMON.settings();
  }

  /* construct basic information about this module */
  static build() {

    COMMON.data = {
      name: NAME, path: PATH, title: TITLE
    };

  }

  static settings() {

  }

  static localize( stringId, data = {} ) {
    return game.i18n.format(stringId, data);
  }

  static applySettings(settingsData){
    Object.entries(settingsData).forEach(([key, data])=> {
      game.settings.register(
        MODULE.data.name, key, {
          name : MODULE.localize(`setting.${key}.name`),
          hint : MODULE.localize(`setting.${key}.hint`),
          ...data
        }
      );
    });
  }

}

