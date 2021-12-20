import { COMMON } from '../common.js'
import { logger } from '../logger.js';
import { SYB5E } from '../config.js'

export class SheetCommon {

  /** SETUP **/
  static register() {
    this.patch();
    this.globals();
  }

  static patch() {
    this._patchActor();
  }

  static _patchActor() {

    COMMON.addGetter(COMMON.CLASSES.Actor5e.prototype, 'corruption', function() {
      const keys = SheetCommon.FLAG_KEY.corruption;
      let corruption = this.getFlag(COMMON.DATA.name, keys.root) ?? SheetCommon.DEFAULT_FLAGS[keys.root]
      corruption.value = corruption[keys.temp] + corruption[keys.permanent];
      return corruption;
    });

    COMMON.addGetter(COMMON.CLASSES.Actor5e.prototype, 'shadow', function() {
      const shadow = this.getFlag(COMMON.DATA.name, SheetCommon.FLAG_KEY.shadow) ?? SheetCommon.DEFAULT_FLAGS[SheetCommon.FLAG_KEY.shadow];
      return shadow;
    });

    COMMON.addGetter(COMMON.CLASSES.Actor5e.prototype, 'manner', function() {
      const shadow = this.getFlag(COMMON.DATA.name, SheetCommon.FLAG_KEY.manner) ?? SheetCommon.DEFAULT_FLAGS[SheetCommon.FLAG_KEY.manner];
      return shadow;
    });

  }

  static globals() {
    game.syb5e.debug.initActor = this.reInitActor
  }

  /** \SETUP **/

  /** DEFAULT DATA AND PATHS **/
  static get FLAG_KEY() {
    return game.syb5e.CONFIG.FLAG_KEY;
  }

  static get DEFAULT_FLAGS() {
    return game.syb5e.CONFIG.DEFAULT_FLAGS;
  }

  static get PATHS() {
    return game.syb5e.CONFIG.PATHS;
  }

  static defaults(sheetClass) {
    sheetClass['NAME'] = sheetClass.name;

    COMMON[sheetClass.NAME] = {
      scope: 'dnd5e',
      sheetClass,
    }

    /* need to use our own defaults to set our defaults */
    COMMON[sheetClass.NAME].id = `${COMMON[sheetClass.NAME].scope}.${COMMON[sheetClass.NAME].sheetClass.name}`
  }

  /** \DEFAULTS **/

  /** SYB DATA SETUP **/

  /* @param actor : actor document to initialize
   * @param overwrite : force default values regardless of current flag data
   */
  static _flagInitData(actor, overwrite = false) {

    /* get the default flag data */
    let defaultFlagData = SheetCommon.DEFAULT_FLAGS;

    /* calculate the initial corruption threshold */
    defaultFlagData[COMMON.DATA.name][SheetCommon.FLAG_KEY.corruption.root].max = SheetCommon._calcMaxCorruption(actor);

    /* if overwriting, force our default values, otherwise merge our new flag data into the actor's flags */
    const initializedFlags = overwrite ? defaultFlagData : mergeObject(actor.data.flags, defaultFlagData, {inplace: false});
    logger.debug(`Initializing ${actor.name} with default syb data:`, initializedFlags);

    return initializedFlags;
  }

  /* Initializes SYB5E-specific data if this actor has not been initialized before */
  static _initFlagData(actor, updateData) {
    
    /* check if we have already been initialized */
    const needsInit = !(actor.getFlag(COMMON.DATA.name, SheetCommon.FLAG_KEY.initialized) ?? false)
    logger.debug(`${actor.name} needs syb init:`, needsInit);
    
    if (needsInit) {

      /* gracefully merge */
      const initializedFlags = SheetCommon._flagInitData(actor, false);

      mergeObject(updateData.flags, initializedFlags);
    }
  }

  static async reInitActor(actor, overwrite) {
    const initializedFlags = SheetCommon._flagInitData(actor, overwrite);
    
    /* clear out any old data */
    await actor.update({[`flags.-=${COMMON.DATA.name}`]: null});

    /* set our default data */
    await actor.update({flags: initializedFlags});

    return actor.data.flags[COMMON.DATA.name];
  }

  /** \SYB DATA SETUP **/ 

  /** COMMON SHEET OPS **/ 

  /* Common context data between characters and NPCs */
  static _getCommonData(actor) {

    /* Add in our corruption values in 'data.attributes' */
    return {
      sybPaths: SheetCommon.PATHS,
      data: {
        attributes: {
          corruption: actor.corruption
        },
        details: {
          shadow: actor.shadow
        }
      }
    }
  }

  static _render(){
    this.element.find('.spell-slots').css('display', 'none');
  }

  static _onItemRoll(event) {
    logger.debug('SYB Roll');
  }

  /** \COMMON **/

  /** HOOKS **/

  /* ensures we have the data needed for the symbaroum system when
   * the SYB sheet is chosen for the first time
   */
  static _preUpdateActor(actor, updateData /*, options, user */) {

    const sheetClass = COMMON[this.NAME].id;

    if (getProperty(updateData, 'flags.core.sheetClass') == sheetClass) {

      /* we are updating to OUR sheet. Ensure that we have the flag
       * data initialized
       */
      SheetCommon._initFlagData(actor, updateData);
    }

  }

  /** \HOOKS **/

  static commonListeners(html) {
    
  }

  /** MECHANICS HELPERS **/

  /* Corruption Threshold = (prof * 2) + charisma mod; minimum 2
   * Source: PGpg37
   */
  static _calcMaxCorruption(actor) {
    const prof = actor.data.data.prof.flat; 
    const chaMod = actor.data.data.abilities.cha.mod;

    return Math.max( chaMod + prof * 2, 2 );
  }

  /** \MECHANICS HELPERS **/
}

export class Syb5eActorSheetCharacter extends COMMON.CLASSES.ActorSheet5eCharacter {

  static register(){
    this.defaults();

    logger.info(COMMON.localize('SYB5E.Init.SubModule', {name: this.NAME}));

    /* register our sheet */ 
    Actors.registerSheet(COMMON[this.NAME].scope, COMMON[this.NAME].sheetClass, {
      types: ['character'],
      makeDefault: true,
      label: COMMON.localize('SYB5E.Sheet.Character.Label'),
    });

    this.hooks();
  }


  static defaults() {
    SheetCommon.defaults(this); 
  }

  static hooks() {
    Hooks.on('preUpdateActor', SheetCommon._preUpdateActor.bind(this));
  }

  /** OVERRIDES **/
  activateListeners(html) {
    super.activateListeners(html);

    SheetCommon.commonListeners.bind(this,html)();
  }

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

  /* TODO consider template injection like item-sheet */
  getData() {
    let context = super.getData();

    mergeObject(context, SheetCommon._getCommonData(this.actor));

    /* get max spell level based
     * on highest class progression
     * NOTE: this is probably excessive
     *   but since its a single display value
     *   we want to show the higest value
     */
    const maxLevel = Object.values(context.data.classes).reduce( (acc, cls) => {

      const progression = cls.spellcasting.progression;
      const spellLevel = SYB5E.CONFIG.SPELL_PROGRESSION[progression][cls.levels];
      
      return spellLevel > acc ? spellLevel : acc;
      
    },0);

    context.maxSpellLevel = {
      value: maxLevel,
      label: SYB5E.CONFIG.LEVEL_SHORT[maxLevel]
    }

    logger.debug('getData#context:', context);
    return context;
  }

  /* supressing display of spell slot counts */
  async _render(...args) {
    await super._render(...args);

    /* call the common _render by binding (pretend its our own method) */
    const boundRender = SheetCommon._render.bind(this);
    boundRender(...args);
  }

  _onItemRoll(event){
    const boundOnRoll = SheetCommon._onItemRoll.bind(this);

    boundOnRoll(event);

    return super._onItemRoll(event);
  }
}

export class Syb5eActorSheetNPC extends COMMON.CLASSES.ActorSheet5eNPC {

  static register(){
    this.defaults();

    logger.info(COMMON.localize('SYB5E.Init.SubModule', {name: this.NAME}));

    /* register our sheet */ 
    Actors.registerSheet("dnd5e", Syb5eActorSheetNPC, {
      types: ['npc'],
      makeDefault: true,
      label: COMMON.localize('SYB5E.Sheet.NPC.Label'),
    });

    this.hooks();
  }
  

  static defaults() {
    SheetCommon.defaults(this);
  }

  static hooks() {
    Hooks.on('preUpdateActor', SheetCommon._preUpdateActor.bind(this));
  }

  static _getNpcData(actor) {
    return {
      data: {
        details: {
          manner: actor.manner
        }
      }
    }
  }

  /** OVERRIDES **/
  activateListeners(html) {
    super.activateListeners(html);

    SheetCommon.commonListeners.bind(this,html)();
  }

  //TODO expand to other modes (like limited)
  get template() {
    return `${COMMON.DATA.path}/templates/actors/syb5e-npc-sheet.html`
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["syb5e", "dnd5e", "sheet", "actor", "npc"],
      //width: 720,
      //height: 680
    });
  }

  /* TODO consider template injection like item-sheet */
  getData() {
    let context = super.getData();
    mergeObject(context, SheetCommon._getCommonData(this.actor));

    /* NPCs also have a small 'manner' field describing how they generally act */
    mergeObject(context, Syb5eActorSheetNPC._getNpcData(this.actor));

    logger.debug('getData#context:', context);
    return context;
  }

  /* supressing display of spell slot counts */
  async _render(...args) {
    await super._render(...args);

    /* call the common _render by binding (pretend its our own method) */
    const boundRender = SheetCommon._render.bind(this);
    boundRender(...args);
  }

  _onItemRoll(event){
    const boundOnRoll = SheetCommon._onItemRoll.bind(this);

    boundOnRoll(event);

    return super._onItemRoll(event);
  }
}
