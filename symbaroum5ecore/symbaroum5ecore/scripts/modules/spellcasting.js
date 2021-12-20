import { COMMON } from '../common.js'
import { logger } from '../logger.js';
import { SYB5E } from '../config.js'

/* Casting a Spell:
 * To cast a spell you take an appropriate action and gain tem-
 * porary Corruption. A cantrip causes 1 point of temporary
 * Corruption while a leveled spell causes 1d4 plus the spell’s
 * level points of temporary Corruption.
 *
 * When you cast a favored cantrip you gain no Corruption, and
 * when you cast a leveled favored spell you gain Corruption
 * equal only to the level of the spell.
 */

export class Spellcasting {

  static register() {
    this.patch();
  }

  static patch() {
    this._patchItem();
  }

  static _patchItem() {
    COMMON.addGetter(COMMON.CLASSES.Item5e.prototype, 'corruption', function() {
        return Spellcasting._corruptionExpression(this);
    });
  }

  /* MECHANICS HELPERS */
  static _corruptionExpression(item) {

    /* non-spells can't corrupt */
    if (item.type !== 'spell'){
      return
    }

    const level = item.data.data.level;

    if (item.isFavored) {
      /* favored cantrips cost 0, favored spells cost level */
      return level == 0 ? '0' : `${level}`
    }

    /* cantrips cost 1, leveled spells are 1d4+level */
    return level == 0? '1' : `1d4 + ${level}`;

  }
}
