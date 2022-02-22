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
    this._patchAbilityUseDialog();
  }

  static hooks() {
    Hooks.on('renderAbilityUseDialog', this._renderAbilityUseDialog);
  }

  static _patchAbilityUseDialog() {

    const __getSpellData = game.dnd5e.applications.AbilityUseDialog._getSpellData;

    game.dnd5e.applications.AbilityUseDialog._getSpellData = function(actorData, itemData, returnData) {
      __getSpellData.call(this, actorData, itemData, returnData);

      const actor = returnData.item?.document?.actor;

      /* only modify the spell data if this is an syb actor */
      if (actor?.isSybActor() ?? false){
        Spellcasting._getSpellData(actorData, itemData, returnData);
      }
     
      logger.debug("_getSpellData result:", returnData);
    }
  }

  static _renderAbilityUseDialog(app, html, data){

    const actor = app.item?.actor

    /* only modify syb actors */
    if(!actor || !actor.isSybActor()) return;

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
  static _maxSpellLevelByClass(classData = []) {
    
    const maxLevel = classData.reduce( (acc, cls) => {

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
  static _maxSpellLevelNPC(actor5eData){
    
    const casterLevel = actor5eData.details.spellLevel ?? 0;

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
    } 

    result.label = game.syb5e.CONFIG.LEVEL_SHORT[result.level];

    return result;
  }

  static _isFavored(itemData) {
    const favored = getProperty(itemData, game.syb5e.CONFIG.PATHS.favored) ?? game.syb5e.CONFIG.DEFAULT_ITEM.favored;
    return favored > 0;
  }

  static spellProgression(actorData) {

    const result = actorData.type == 'character' ? Spellcasting._maxSpellLevelByClass(Object.values(actorData.data.classes)) : Spellcasting._maxSpellLevelNPC(actorData.data)

    return result;

  }

  static _modifyDerivedProgression(actorData) {

    const progression = Spellcasting.spellProgression(actorData);

    /* insert our maximum spell level into the spell object */
    actorData.data.spells.maxLevel = progression.level;

    /* ensure that all spell levels <= maxLevel have a non-zero max */
    const levels = Array.from({length:progression.level}, (_, index) => `spell${index+1}`)

    for( const slot of levels ){
      actorData.data.spells[slot].max = Math.max(actorData.data.spells[slot].max, 1)
    }
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

    /* get default expression */
    let expression = itemData.type === 'spell' ? Spellcasting._generateCorruptionExpression(level, Spellcasting._isFavored(itemData)) : '0';
    let type = 'temp'

    /* has custom corruption? */
    const custom = getProperty(itemData, game.syb5e.CONFIG.PATHS.corruptionOverride.root) ?? duplicate(game.syb5e.CONFIG.DEFAULT_ITEM.corruptionOverride);

    /* modify the expression (always round up) minimum 1 unless custom */
    if(custom.mode !== game.syb5e.CONFIG.DEFAULT_ITEM.corruptionOverride.mode){
      //has override
      switch (custom.mode) {
        case CONST.ACTIVE_EFFECT_MODES.ADD:
          expression = `max( ceil( (${expression}) + (${custom.value}) ), 1)`
          break;
        case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
          expression = `max( ceil( (${expression}) * (${custom.value}) ), 1)`
          break;
        case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
          expression = custom.value;
          break;
      }
    }

    /* modify the target (only works for PCs) */
    if (custom.type !== game.syb5e.CONFIG.DEFAULT_ITEM.corruptionOverride.type) {
      type = custom.type
    }

    /* after all modifications have been done, return the final expression */
    return {expression, type};
  
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

    const maxLevel = actorData.details.cr == undefined ? Spellcasting._maxSpellLevelByClass(Object.values(actorData.classes)) : Spellcasting._maxSpellLevelNPC(actorData)
    let spellLevels = [];

    const addSpellLevel = (level) => {
      spellLevels.push({
        level,
        label: COMMON.localize( `DND5E.SpellLevel${level}`)+` (${Spellcasting._corruptionExpression(returnData.item, level).expression})`,
        canCast: true,
        hasSlots: true
      });
    }

    for(let level = itemData.level; level<=maxLevel.level; level++){
      addSpellLevel(level);
    }
    
    
    if(spellLevels.length < 1){
      errors.push(COMMON.localize('SYB5E.Error.SpellLevelExceedsMax'))

      /* Add an entry for this spell in particular */
      addSpellLevel(itemData.level);
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

    if (consumeCorruption) {

      /* Does this item produce corruption? */
      const corruptionInfo = item.corruption;

      /* roll for corruption */
      const gainedCorruption = new Roll(corruptionInfo.expression, item.getRollData()).evaluate({async:false}).total;

      /* store corruption info in item (temporary) */
      item.corruptionUse = {
        expression: corruptionInfo.expression,
        type: corruptionInfo.type,
        total: gainedCorruption
      }

      /* field name shortcuts */
      const fieldKey = item.actor.type == 'character' ? corruptionInfo.type : 'permanent';

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
