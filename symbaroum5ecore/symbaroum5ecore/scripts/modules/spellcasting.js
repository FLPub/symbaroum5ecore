import { COMMON } from '../common.js'
import { logger } from '../logger.js';
import { SYB5E } from '../config.js'
import { SheetCommon } from './actor-sheet.js'

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
    this.hooks();
  }

  static patch() {
    this._patchItem();
    this._patchAbilityUseDialog();
  }

  static hooks() {
    Hooks.on('renderAbilityUseDialog', this._renderAbilityUseDialog);
  }

  static _patchItem() {
    COMMON.addGetter(COMMON.CLASSES.Item5e.prototype, 'corruption', function() {
      return Spellcasting._corruptionExpression(this.data);
    });

    /* isFavored getter */
    COMMON.addGetter(COMMON.CLASSES.Item5e.prototype, 'isFavored', function() {
      return Spellcasting._isFavored(this.data);
    });

    const __spellChatData = COMMON.CLASSES.Item5e.prototype._spellChatData;
    COMMON.CLASSES.Item5e.prototype._spellChatData = function(data, labels, props) {

      /* should insert 2 labels -- level and components */
      __spellChatData.call(this, data, labels, props);

      /* add ours right after if we are consuming corruption */
      if(SheetCommon.isSybActor(this.actor.data) && this.corruptionUse){
        /* cantrips and favored spells have a flat corruption value */
        const totalString = this.isFavored || (parseInt(this.data.data.level) === 0) ? '' : ` (${this.corruptionUse.total})`;
        props.push(`${this.corruptionUse.expression}${totalString}`);
      }
    }
  }

  static _patchAbilityUseDialog() {

    const __getSpellData = game.dnd5e.applications.AbilityUseDialog._getSpellData;

    game.dnd5e.applications.AbilityUseDialog._getSpellData = function(actorData, itemData, returnData) {
      __getSpellData.call(this, actorData, itemData, returnData);

      /* only modify the spell data if this is an syb actor */
      if (SheetCommon.isSybActor(returnData.item?.document?.actor?.data)){
        Spellcasting._getSpellData(actorData, itemData, returnData);
      }
     
      logger.debug("_getSpellData result:", returnData);
    }
  }

  static _renderAbilityUseDialog(app, html, data){

    /* only modify syb actors */
    if(!SheetCommon.isSybActor(app.item?.actor?.data)) return;

    /* only modify spell use dialogs */
    if(app.item?.type !== 'spell') return;

    const element = html.find('[name="consumeSlot"]');

    /* get all text elements */
    const textNodes = element.parent().contents().filter( function() {return this.nodeType === 3} )

    if(textNodes.length !== 1){
      logger.error(COMMON.localize('SYB5E.Error.HTMLParse'));
    }

    textNodes[0].textContent = COMMON.localize('SYB5E.Corruption.GainQuestion');

    return;
  }

  /* MECHANICS HELPERS */

  /* get max spell level based
   * on highest class progression
   * NOTE: this is probably excessive
   *   but since its a single display value
   *   we want to show the higest value
   * @param classData {array<classItemData>}
   */
  static maxSpellLevelByClass(classData) {
    
    const maxLevel = Object.values(classData).reduce( (acc, cls) => {

      const progression = cls.spellcasting.progression;
      const progressionArray = SYB5E.CONFIG.SPELL_PROGRESSION[progression] ?? false;
      if(progressionArray){
        const spellLevel = SYB5E.CONFIG.SPELL_PROGRESSION[progression][cls.levels] ?? 0;

        return spellLevel > acc.level ? {level: spellLevel, fullCaster: progression == 'full'} : acc;
      }

      /* nothing to accumulate */
      return acc;

    },{level: 0, fullCaster: false});

    const result = {
      level: maxLevel.level,
      label: SYB5E.CONFIG.LEVEL_SHORT[maxLevel.level],
      fullCaster: maxLevel.fullCaster
    }

    return result;
  }

  /* highest spell level for an NPC:
   * if a leveled caster, use that level as Full Caster
   * if not and spellcasting stat is != 'none', use CR as full caster
   * otherwise, no spellcasting
   *
   * @param actor5eData {Object} (i.e. actor.data.data)
   */
  static maxSpellLevelNPC(actor5eData){
    
    //const spellStat = actor5eData.spellcasting ?? '' === '' ? false : actor5eData.spellcasting;
    const casterLevel = actor5eData.details.spellLevel ?? 0;
    const cr = Math.max(actor5eData.details.cr, 1);

    /* has caster levels, assume full caster */
    let result = {
      level: 0,
      label: '',
      fullCaster: casterLevel > 0
    }

    /* modify max spell level if full caster or has a casting stat */
    if (result.fullCaster) {
      /* if we are a full caster, use our caster level */
      result.level = game.syb5e.CONFIG.SPELL_PROGRESSION.full[casterLevel]; 
    } else {
      /* if we are using spellcasting as our stat, but
       * dont have a caster level, assume cr = level
       */
      result.level = game.syb5e.CONFIG.SPELL_PROGRESSION.full[cr];
    } 

    result.label = game.syb5e.CONFIG.LEVEL_SHORT[result.level];

    return result;
  }

  static _isFavored(itemData) {
    const favored = getProperty(itemData, game.syb5e.CONFIG.PATHS.favored) ?? game.syb5e.CONFIG.DEFAULT_ITEM.favored;
    return favored;
  }

  static _generateCorruptionExpression(level, favored) {
    /* cantrips have a level of "0" (string) for some reason */
    level = parseInt(level);

    if(isNaN(level)){
      return false
    }

    if (favored) {
      /* favored cantrips cost 0, favored spells cost level */
      return level == 0 ? '0' : `${level}`
    }

    /* cantrips cost 1, leveled spells are 1d4+level */
    return level == 0 ? '1' : `1d4 + ${level}`;

  }

  static _corruptionExpression(itemData, level = itemData.data.level) {

    /* non-spells can't corrupt */
    if (itemData.type !== 'spell'){
      return
    }

    return Spellcasting._generateCorruptionExpression(level, Spellcasting._isFavored(itemData));
  
  }

  /** \MECHANICS HELPERS **/

  /** PATCH FUNCTIONS **/

  static _getSpellData(actorData, itemData, returnData) {
    
    let errors = [];
    /****************
     * Needed Info:
     * - spellLevels: {array} of {level: 1, label: '1st Level (0 Slots)', canCast: true, hasSlots: false}
     * - errors: {array<string>}: clear out spell slot error from base dnd5e, add our own.
     *     - exceeding max spell level
     * - consumeSpellSlot: {boolean}: always true (consume slot = add corruption)
     * - canUse: {boolean}: always true? exceeding max corruption is a choice
     */

    const maxLevel = actorData.details.cr == undefined ? Spellcasting.maxSpellLevelByClass(actorData.classes) : Spellcasting.maxSpellLevelNPC(actorData)
    let spellLevels = [];

    for(let level = itemData.level; level<=maxLevel.level; level++){
      spellLevels.push({
        level,
        label: COMMON.localize( `DND5E.SpellLevel${level}`)+` (${Spellcasting._corruptionExpression(returnData.item, level)})`,
        canCast: true,
        hasSlots: true
      })
    }
    
    if(spellLevels.length < 1){
      errors.push(COMMON.localize('SYB5E.Error.SpellLevelExceedsMax'))
    }

    /* generate current corruption status as a reminder */
    const {value, max} = returnData.item.document.actor.corruption;
    const note = COMMON.localize('SYB5E.Corruption.ShortDesc',{value, max});

    const sybData = {note, errors, spellLevels, consumeSpellSlot: true, canUse: true}
    mergeObject(returnData, sybData);
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
      if(!corruptionExpression) {
        /* for whatever reason, this item did not produce a valid corruption expression.
         * Assume it is because we cannot actually cast
         */
        logger.warning(true, COMMON.localize('SYB5E.Error.ItemInvalidCorruptionExpression'));
        return false;
      }
      const gainedCorruption = new Roll(corruptionExpression).evaluate({async:false}).total;

      /* store corruption info in item (temporary) */
      item.corruptionUse = {
        expression: corruptionExpression,
        total: gainedCorruption
      }

      /* field name shortcuts */
      const fieldKey = item.actor.type == 'character' ? 'temp' : 'permanent';

      /* get the current corruption values */
      let corruption = item.actor.corruption;

      /* add in our gained corruption to the temp corruption */
      corruption[fieldKey] = corruption[fieldKey] + gainedCorruption;

      /* insert this update into the actorUpdates */
      const corruptionFieldPath = `flags.${COMMON.DATA.name}.corruption.${fieldKey}`;
      actorUpdates[corruptionFieldPath] = corruption[fieldKey];
    }

    return {actorUpdates, itemUpdates, resourceUpdates};

  }

}
