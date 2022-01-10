import { COMMON } from '../common.js'
import { logger } from '../logger.js';
import { Spellcasting } from './spellcasting.js'

export class SheetCommon {

  static NAME = 'SheetCommon';

  /** SETUP **/

  /* -------------------------------------------- */

  static register() {
    this.patch();
    this.globals();
  }

  /* -------------------------------------------- */

  static patch() {
    this._patchActor();
  }

  /* -------------------------------------------- */

  static _patchActor() {

    COMMON.addGetter(COMMON.CLASSES.Actor5e.prototype, 'corruption', function() {
      /* current value */
      let corruption = this.getFlag(COMMON.DATA.name, 'corruption') ?? {};

      /* correct bad values and merge in needed defaults */
      const defaults = SheetCommon.DEFAULT_FLAGS.corruption;
      Object.keys(defaults).forEach( (key) => {
        corruption[key] = (typeof corruption[key] == typeof defaults[key]) ? corruption[key] : defaults[key];
      });

      corruption.value = corruption.temp + corruption.permanent;
      corruption.max = SheetCommon._calcMaxCorruption(this);
      return corruption;
    });

    COMMON.addGetter(COMMON.CLASSES.Actor5e.prototype, 'shadow', function() {
      const shadow = this.getFlag(COMMON.DATA.name, 'shadow') ?? SheetCommon.DEFAULT_FLAGS.shadow;
      return shadow;
    });

    COMMON.addGetter(COMMON.CLASSES.Actor5e.prototype, 'manner', function() {
      const manner = this.getFlag(COMMON.DATA.name, 'manner') ?? SheetCommon.DEFAULT_FLAGS.manner;
      return manner;
    });

  }

  /* -------------------------------------------- */

  static globals() {
    game.syb5e.debug.initActor = this.reInitActor
    game.syb5e.sheetClasses = [];
  }

  /** \SETUP **/

  /* -------------------------------------------- */

  /** DEFAULT DATA AND PATHS **/
  static get FLAG_KEY() {
    return game.syb5e.CONFIG.FLAG_KEY;
  }

  /* -------------------------------------------- */

  static get DEFAULT_FLAGS() {
    return game.syb5e.CONFIG.DEFAULT_FLAGS;
  }

  /* -------------------------------------------- */

  static get PATHS() {
    return game.syb5e.CONFIG.PATHS;
  }

  /* -------------------------------------------- */

  static defaults(sheetClass) {
    sheetClass['NAME'] = sheetClass.name;

    // TODO is this field in COMMON needed?
    COMMON[sheetClass.NAME] = {
      scope: 'dnd5e',
      sheetClass,
    }

    /* need to use our own defaults to set our defaults */
    COMMON[sheetClass.NAME].id = `${COMMON[sheetClass.NAME].scope}.${COMMON[sheetClass.NAME].sheetClass.name}`

    /* store this information in a better place */
    game.syb5e.sheetClasses.push(COMMON[sheetClass.NAME]);
  }

  /** \DEFAULTS **/

  /** SYB DATA SETUP **/

  /* -------------------------------------------- */

  /* @param actor : actor document to initialize
   * @param overwrite : force default values regardless of current flag data
   */
  //static _flagInitData(actor, overwrite = false) {

  //  /* get the default flag data */
  //  let defaultFlagData = duplicate(SheetCommon.DEFAULT_FLAGS);

  //  /* calculate the initial corruption threshold */
  //  defaultFlagData.corruption.max = SheetCommon._calcMaxCorruption(actor);

  //  /* if overwriting, force our default values, otherwise merge our new flag data into the actor's flags */
  //  const initializedFlags = overwrite ? defaultFlagData : mergeObject(actor.data.flags, defaultFlagData, {inplace: false});
  //  logger.debug(`Initializing ${actor.name} with default syb data:`, initializedFlags);

  //  return initializedFlags;
  //}

  /* -------------------------------------------- */

  /* Initializes SYB5E-specific data if this actor has not been initialized before */
  //static _initFlagData(actor, updateData) {

  //  /* gracefully merge */
  //  const initializedFlags = SheetCommon._flagInitData(actor, false);

  //  mergeObject(updateData.flags, initializedFlags);
  //}

  /* -------------------------------------------- */

  //static async reInitActor(actor, overwrite) {
  //  const initializedFlags = SheetCommon._flagInitData(actor, overwrite);
  //  
  //  /* clear out any old data */
  //  await actor.update({[`flags.-=${COMMON.DATA.name}`]: null});

  //  /* set our default data */
  //  await actor.update({flags: {[COMMON.DATA.name]: initializedFlags}});

  //  return actor.data.flags[COMMON.DATA.name];
  //}

  /** \SYB DATA SETUP **/ 

  /** COMMON SHEET OPS **/ 

  /* -------------------------------------------- */

  static isSybActor(actorData = {}) {
    const sheetClassId = getProperty(actorData, 'flags.core.sheetClass'); 
    const found = game.syb5e.sheetClasses.find( classInfo => classInfo.id === sheetClassId );
    return !!found;
  }

  /* -------------------------------------------- */

  static _getCorruptionAbilityData(actor, contextAbilities) {

    let defaultEntries = [];

    /* if this actor has any spellcasting, allow it to be selected as corruption stat */
    if (actor.data.data.attributes.spellcasting?.length > 0) {
      defaultEntries.push({ability: 'spellcasting', label: COMMON.localize('DND5E.Spellcasting')});
    }

    defaultEntries.push({ability: 'custom', label: COMMON.localize('SYB5E.Corruption.Custom')});

    const corruptionAbilities = Object.entries(contextAbilities).reduce( (acc, [key, val]) => {
      acc.push({ability: key, label: val.label}) 
      return acc;
    },defaultEntries);

    let corruptionAbilityData = {
      path: game.syb5e.CONFIG.PATHS.corruption.ability,
      abilities: corruptionAbilities,
      current: getProperty(actor.data, game.syb5e.CONFIG.PATHS.corruption.ability)
    }

    /* can only edit max corruption if using a custom value */
    corruptionAbilityData.disabled = corruptionAbilityData.current !== 'custom' ? 'disabled' : '';

    return corruptionAbilityData
  }

  /* -------------------------------------------- */

  /* Common context data between characters and NPCs */
  static _getCommonData(actor, context) {
    
    /* Add in our corruption values in 'data.attributes' */
    const commonData = {
      sybPaths: game.syb5e.CONFIG.PATHS,
      corruptionAbilities: SheetCommon._getCorruptionAbilityData(actor, context.data.abilities),
      data: {
        attributes: {
          corruption: actor.corruption
        },
        details: {
          shadow: actor.shadow
        }
      }
    }

    mergeObject(context, commonData);
  }

  /* -------------------------------------------- */

  static _render(){
    /* suppress spell slot display */
    this.element.find('.spell-slots').css('display', 'none');
  }

  /** \COMMON **/

  /** HOOKS **/

  /* -------------------------------------------- */

  /* ensures we have the data needed for the symbaroum system when
   * the SYB sheet is chosen for the first time
   */
  //static _preUpdateActor(actor, updateData /*, options, user */) {

  //  const sheetClass = COMMON[this.NAME].id;

  //  if (getProperty(updateData, 'flags.core.sheetClass') == sheetClass) {

  //    /* we are updating to OUR sheet. Ensure that we have the flag
  //     * data initialized
  //     */
  //    SheetCommon._initFlagData(actor, updateData);
  //  }

  //}

  /** \HOOKS **/

  /* -------------------------------------------- */

  static commonListeners(html) {
    
  }

  /** MECHANICS HELPERS **/

  /* -------------------------------------------- */

  /* Corruption Threshold = (prof * 2) + charisma mod; minimum 2
   * Source: PGpg37
   * or if full caster (prof + spellcastingMod) * 2
   */
  static _calcMaxCorruption(actor) {
    
    const CONFIG = game.syb5e.CONFIG;
    const paths = CONFIG.PATHS;
    const defaultAbility = game.syb5e.CONFIG.DEFAULT_FLAGS.corruption.ability;
    let corruptionAbility = getProperty(actor.data, paths.corruption.ability) ?? defaultAbility;
    /* if we are in a custom max mode, just return the current stored max */
    if(corruptionAbility === 'custom'){
      return getProperty(actor.data, paths.corruption.max) ?? game.syb5e.CONFIG.DEFAULT_FLAGS.corruption.max;
    }

    /* if corruption is set to use spellcasting, ensure we have a spellcasting stat as well */
    corruptionAbility = corruptionAbility === 'spellcasting' && !actor.data.data.attributes.spellcasting ? defaultAbility : corruptionAbility;

    const usesSpellcasting = corruptionAbility === 'spellcasting' ? true : false;

    /* otherwise determine corruption calc -- full casters get a special one */
    const {fullCaster} = actor.type === 'character' ? Spellcasting.maxSpellLevelByClass(Object.values(actor.classes).map( item => item.data.data )) : Spellcasting.maxSpellLevelNPC(actor.data.data);

    const prof = actor.data.data.prof.flat; 

    const corrAbility = usesSpellcasting ? actor.data.data.attributes.spellcasting : corruptionAbility;
    const corrMod = actor.data.data.abilities[corrAbility].mod;

    if(fullCaster) {
      return (prof + corrMod) * 2;
    }

    return fullCaster ? (prof + corrMod) * 2 : Math.max( corrMod + prof * 2, 2 );
  }

  /* -------------------------------------------- */

  /** \MECHANICS HELPERS **/
}

export class Syb5eActorSheetCharacter extends COMMON.CLASSES.ActorSheet5eCharacter {

  static NAME = "Syb5eActorSheetCharacter"

  /* -------------------------------------------- */

  static register(){
    this.defaults();

    /* register our sheet */ 
    Actors.registerSheet(COMMON[this.NAME].scope, COMMON[this.NAME].sheetClass, {
      types: ['character'],
      makeDefault: true,
      label: COMMON.localize('SYB5E.Sheet.Character.Label'),
    });
  }

  /* -------------------------------------------- */

  static defaults() {
    SheetCommon.defaults(this); 
  }

  /* -------------------------------------------- */

  static _getCharacterData(actor, context) {

    /* handlebars should interpret a level of 0 as 'false' */
    context.maxSpellLevel = Spellcasting.maxSpellLevelByClass(context.data.classes);
  }

  /** OVERRIDES **/

  /* -------------------------------------------- */

  activateListeners(html) {
    super.activateListeners(html);

    SheetCommon.commonListeners.bind(this,html)();

  }

  /* -------------------------------------------- */

  //TODO expand to other modes (like limited)
  get template() {
    return `${COMMON.DATA.path}/templates/actors/syb5e-character-sheet.html`
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["syb5e", "dnd5e", "sheet", "actor", "character"],
      //width: 720,
      //height: 680
    });
  }

  /* -------------------------------------------- */

  /* TODO consider template injection like item-sheet */
  getData() {
    let context = super.getData();

    SheetCommon._getCommonData(this.actor, context);

    Syb5eActorSheetCharacter._getCharacterData(this.actor, context);

    logger.debug('getData#context:', context);
    return context;
  }

  /* -------------------------------------------- */

  /* supressing display of spell slot counts */
  async _render(...args) {
    await super._render(...args);

    /* call the common _render by binding (pretend its our own method) */
    const boundRender = SheetCommon._render.bind(this);
    boundRender(...args);

    /* Inject the extended rest button and listener ( TODO should the whole sheet be injected like this?) */
    const footer = this.element.find('.hit-dice .attribute-footer');
    footer.append(`<a class="rest extended-rest" title="${COMMON.localize('SYB5E.Rest.ExtRest')}">${COMMON.localize('SYB5E.Rest.ExtendedAbbr')}</a>`)

    /* activate listener for Extended Rest Button */
    this.element.find('.extended-rest').click(this._onExtendedRest.bind(this));
  }

  /* -------------------------------------------- */

  async _onShortRest(event){
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.shortRest();
  }

  /* -------------------------------------------- */

  async _onLongRest(event){
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.longRest();
  }

  /* -------------------------------------------- */

  async _onExtendedRest(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.extendedRest();
  }

  /* -------------------------------------------- */
  
}

export class Syb5eActorSheetNPC extends COMMON.CLASSES.ActorSheet5eNPC {

  static NAME = "Syb5eActorSheetNPC"

  /* -------------------------------------------- */

  static register(){
    this.defaults();

    /* register our sheet */ 
    Actors.registerSheet("dnd5e", Syb5eActorSheetNPC, {
      types: ['npc'],
      makeDefault: true,
      label: COMMON.localize('SYB5E.Sheet.NPC.Label'),
    });
  }

  /* -------------------------------------------- */
  

  static defaults() {
    SheetCommon.defaults(this);
  }

  /* -------------------------------------------- */

  static _getNpcData(actor, context) {
    const data = {
      data: {
        details: {
          manner: actor.manner
        }
      }
    }

    mergeObject(context, data);
  }

  /** OVERRIDES **/

  /* -------------------------------------------- */

  activateListeners(html) {
    super.activateListeners(html);

    SheetCommon.commonListeners.bind(this,html)();
  }

  /* -------------------------------------------- */

  //TODO expand to other modes (like limited)
  get template() {
    return `${COMMON.DATA.path}/templates/actors/syb5e-npc-sheet.html`
  }

  /* -------------------------------------------- */

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["syb5e", "dnd5e", "sheet", "actor", "npc"],
      //width: 720,
      //height: 680
    });
  }

  /* -------------------------------------------- */

  /* TODO consider template injection like item-sheet */
  getData() {
    let context = super.getData();
    SheetCommon._getCommonData(this.actor, context);

    /* NPCs also have a small 'manner' field describing how they generally act */
    Syb5eActorSheetNPC._getNpcData(this.actor, context);

    logger.debug('getData#context:', context);
    return context;
  }

  /* -------------------------------------------- */

  /* supressing display of spell slot counts */
  async _render(...args) {
    await super._render(...args);

    /* call the common _render by binding (pretend its our own method) */
    const boundRender = SheetCommon._render.bind(this);
    boundRender(...args);
  }

  /* -------------------------------------------- *

  _onItemRoll(event){
    const boundOnRoll = SheetCommon._onItemRoll.bind(this);

    boundOnRoll(event);

    return super._onItemRoll(event);
  }

  /* -------------------------------------------- */
}
