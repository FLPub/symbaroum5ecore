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

  static NAME = "Spellcasting";

  static register() {
    this.patch();
  }

  static patch() {
    this._patchItem();
    this._patchAbilityUseDialog();
  }

  static _patchItem() {
    COMMON.addGetter(COMMON.CLASSES.Item5e.prototype, 'corruption', function() {
        return Spellcasting._corruptionExpression(this);
    });
  }

  static _patchAbilityUseDialog() {
    const wrapped = game.dnd5e.applications.AbilityUseDialog._getSpellData;

    game.dnd5e.applications.AbilityUseDialog._getSpellData = function(actorData, itemData, returnData) {
      logger.debug(actorData, itemData, returnData);
      wrapped.bind(this)(actorData, itemData, returnData);

      const sybResult = Spellcasting._getSpellData(actorData, itemData, returnData);
      mergeObject(returnData, sybResult);
      logger.debug("_getSpellData result:", returnData);
    }
  }

  /* MECHANICS HELPERS */
  static _getSpellData(actorData, itemData, returnData) {
    
    /****************
     * Needed Info:
     * - spellLevels: {array} of {level: 1, label: '1st Level (0 Slots)', canCast: true, hasSlots: false}
     * - errors: {array<string>}: clear out spell slot error from base dnd5e, add our own.
     *     - exceeding max spell level
     * - consumeSpellSlot: {boolean}: always true (consume slot = add corruption)
     * - canUse: {boolean}: always true? exceeding max corruption is a choice
     */

    return {note: 'Hello from SYB5E', errors: []}
  }

  static _getUsageUpdates(item, {consumeCorruption}) {

    /* mirror core dnd5e structure */
    const actorUpdates = {};
    const itemUpdates = {};
    const resourceUpdates = {};

    /* Does this casting produce corruption? */
    if (consumeCorruption) {

      /* roll for corruption */
      const corruptionExpression = item.corruption;
      const gainedCorruption = new Roll(corruptionExpression).evaluate({async:false}).total;

      /* field name shortcuts */
      const corruptionKey = SYB5E.CONFIG.FLAG_KEY.corruption;
      const tempKey = corruptionKey.temp;

      /* get the current corruption values */
      let corruption = item.actor.corruption;

      /* add in our gained corruption to the temp corruption */
      corruption[tempKey] = corruption[tempKey] + gainedCorruption;

      /* insert this update into the actorUpdates */
      const tempPath = `flags.${COMMON.DATA.name}.${corruptionKey.root}.${tempKey}`;
      actorUpdates[tempPath] = corruption[tempKey];
    }

    return {actorUpdates, itemUpdates, resourceUpdates};

  }

  static _corruptionExpression(item) {

    /* non-spells can't corrupt */
    if (item.type !== 'spell'){
      return
    }

    /* cantrips have a level of "0" (string) for some reason */
    const level = parseInt(item.data.data.level);

    if (item.isFavored) {
      /* favored cantrips cost 0, favored spells cost level */
      return level == 0 ? '0' : `${level}`
    }

    /* cantrips cost 1, leveled spells are 1d4+level */
    return level == 0? '1' : `1d4 + ${level}`;

  }


}
