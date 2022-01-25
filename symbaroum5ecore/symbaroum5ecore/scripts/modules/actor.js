import { COMMON } from '../common.js'
import { logger } from '../logger.js';
import { Spellcasting } from './spellcasting.js'
import { SybRestDialog } from './apps/syb-rest-dialog.js'

export class ActorSyb5e {

  static NAME = "ActorSyb5e";


  static register() {
    this.patch();
  }

  static parent = {};

  static patch() {

    /* original super function information */
    const superFn = {
      getRollData: {
        value: ActorSyb5e.getRollData
      },
      convertSybCurrency: {
        value: ActorSyb5e.convertSybCurrency
      },
      isSybActor: {
        value: ActorSyb5e.isSybActor
      },
      prepareBaseData: {
        value: ActorSyb5e.prepareBaseData
      },
      prepareDerivedData: {
        value: ActorSyb5e.prepareDerivedData
      },
      extendedRest: {
        value: ActorSyb5e.extendedRest
      },
      longRest: {
        value: ActorSyb5e.longRest
      },
      shortRest: {
        value: ActorSyb5e.shortRest
      },
      corruption: {
        get: ActorSyb5e.getCorruption
      },
      shadow: {
        get: ActorSyb5e.getShadow
      },
      manner: {
        get: ActorSyb5e.getManner
      }

    }

    Object.entries(superFn).forEach( ([fn, override]) => {

      /* get the current version */
      const original = Object.getOwnPropertyDescriptor(game.dnd5e.entities.Actor5e.prototype, fn)

      /* if our copy already has a value here, we dont want to overwrite */
      if ( original && !Object.hasOwn(this.parent, fn) ){ 
        Object.defineProperty(this.parent, fn, original);
      }

      /* set the replacement function */
      Object.defineProperty(game.dnd5e.entities.Actor5e.prototype, fn, mergeObject(original ?? {}, override));

    })
  }

  /* -------------------------------------------- */

  /* @override */
  static getRollData(...args) {
    let data = ActorSyb5e.parent.getRollData.call(this, ...args);

    if (this.isSybActor()) {
      data.attributes.corruption = this.corruption;
      data.details.shadow = this.shadow;
      data.details.manner = this.manner;
    }

    return data;

  }

  /* -------------------------------------------- */

  /* @override */
  static prepareBaseData(...args) {
    ActorSyb5e.parent.prepareBaseData.call(this, ...args);

    if (this.isSybActor()) {
      ActorSyb5e._prepareCommonData(this);
      switch (this.type) {
        case "character":
          break;
        case "npc":
          ActorSyb5e._prepareNpcData(this);
          break;
      }
    }
  }

  /* -------------------------------------------- */

  /* @override */
  static prepareDerivedData(...args) {

    /* perform normal steps */
    ActorSyb5e.parent.prepareDerivedData.call(this, ...args); 

    if (this.isSybActor()){
      logger.debug('core derived data:', this.data)

      /* prepare derived corruption data */
      setProperty(this.data, game.syb5e.CONFIG.PATHS.corruption.root,this.corruption);
      
      
      /* check for half caster and "fix" for syb5e half-caster progression */
      Spellcasting._modifyDerivedProgression(this.data);
    }
  }

  /* -------------------------------------------- */

  /* @override */
  static async longRest({dialog=true, chat=true, newDay=true} = {}) {

    const initHd = this.data.data.attributes.hd;
    const initHp = this.data.data.attributes.hp.value;
    const initCorr = this.corruption.temp;

    if(!this.isSybActor()){
      return _longRest.call(this, {dialog, chat, newDay}); 
    }

    // Maybe present a confirmation dialog
    if ( dialog ) {
      try {
        newDay = await SybRestDialog.restDialog({actor: this, type: game.syb5e.CONFIG.REST_TYPES.long});
      } catch(err) {
        return;
      }
    }

    //do long rest
    await Resting._sybRest(this, game.syb5e.CONFIG.REST_TYPES.long, chat, newDay, this.data.data.attributes.hd - initHd, this.data.data.attributes.hp.value - initHp, this.corruption.temp - initCorr)
  }

  /* -------------------------------------------- */

  static async shortRest({dialog=true, chat=true, autoHD=false, autoHDThreshold=3} = {}) {

    const initHd = this.data.data.attributes.hd;
    const initHp = this.data.data.attributes.hp.value;
    const initCorr = this.corruption.temp;

    if(!this.isSybActor()){
      return _shortRest.call(this, {dialog, chat, autoHD, autoHDThreshold}); 
    }

    // Maybe present a confirmation dialog
    if ( dialog ) {
      try {
        await SybRestDialog.restDialog({actor: this, type: game.syb5e.CONFIG.REST_TYPES.short});
      } catch(err) {
        return;
      }
    }

    //do extended rest
    await Resting._sybRest(this, game.syb5e.CONFIG.REST_TYPES.short, chat, false, this.data.data.attributes.hd - initHd, this.data.data.attributes.hp.value - initHp, this.corruption.temp - initCorr);
  }

  /* -------------------------------------------- */

  static _prepareCommonData(actor) {
    setProperty(actor.data, game.syb5e.CONFIG.PATHS.shadow, actor.shadow);
  }

  /* -------------------------------------------- */

  static _prepareNpcData(actor) {
    setProperty(actor.data,game.syb5e.CONFIG.PATHS.manner,actor.manner);
  }

  /* -------------------------------------------- */

  static getCorruption() {
    /* current value */
    let corruption = this.getFlag(COMMON.DATA.name, 'corruption') ?? {};

    /* correct bad values and merge in needed defaults */
    corruption = mergeObject(game.syb5e.CONFIG.DEFAULT_FLAGS.corruption, corruption, {inplace: false});

    corruption.value = corruption.temp + corruption.permanent;
    corruption.max = ActorSyb5e._calcMaxCorruption(this);
    return corruption;
  }

  /* -------------------------------------------- */

  static getShadow() {
    const shadow = this.getFlag(COMMON.DATA.name, 'shadow') ?? game.syb5e.CONFIG.DEFAULT_FLAGS.shadow;
    return shadow;
  }

  static getManner() {
    const manner = this.getFlag(COMMON.DATA.name, 'manner') ?? game.syb5e.CONFIG.DEFAULT_FLAGS.manner;
    return manner;
  }

  /* -------------------------------------------- */

  /**
   * Convert all carried currency to the highest possible denomination to reduce the number of raw coins being
   * carried by an Actor.
   * @returns {Promise<Actor5e>}
   */
  static convertSybCurrency() {

    /* dont convert syb currency if not an syb actor */
    if (!this.isSybActor()) {
      logger.error(COMMON.localize("SYB5E.error.notSybActor"));
      return;
    }

    const conversion = Object.entries(game.syb5e.CONFIG.CURRENCY_CONVERSION);
    const current = duplicate(this.data.data.currency);

    for( const [denom, data] of conversion ) {

      /* get full coin conversion to next step */
      const denomUp = Math.floor(current[denom] / data.each);

      /* subtract converted coins and add converted coins */
      current[denom] -= (denomUp * data.each);
      current[data.into] += denomUp;
    }

    return this.update({'data.currency': current});
  }

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
    const currentMax = getProperty(actor.data, paths.corruption.max) ?? game.syb5e.CONFIG.DEFAULT_FLAGS.corruption.max
    if(corruptionAbility === 'custom'){
      return currentMax;
    }

    /* if corruption is set to use spellcasting, ensure we have a spellcasting stat as well */
    corruptionAbility = corruptionAbility === 'spellcasting' && !actor.data.data.attributes.spellcasting ? defaultAbility : corruptionAbility;

    const usesSpellcasting = corruptionAbility === 'spellcasting' ? true : false;

    /* otherwise determine corruption calc -- full casters get a special one */
    const {fullCaster} = actor.type === 'character' ? Spellcasting._maxSpellLevelByClass(Object.values(actor.classes).map( item => item.data.data )) : Spellcasting._maxSpellLevelNPC(actor.data.data);

    const prof = actor.data.data.attributes.prof ?? actor.data.data.prof?.flat ?? currentMax;
    if (prof == null) {
      logger.error('SYB5E.Error.NoProf');
    }

    const corrAbility = usesSpellcasting ? actor.data.data.attributes.spellcasting : corruptionAbility;
    const corrMod = actor.data.data.abilities[corrAbility].mod;

    if (corrMod == null) {
      /* we havent prepped enough data used the stored value */
      return currentMax
    }

    return fullCaster ? (prof + corrMod) * 2 : Math.max( corrMod + prof * 2, 2 );
  }

  /* -------------------------------------------- */

  static isSybActor() {
    
    let sheetClassId = getProperty(this.data, 'flags.core.sheetClass'); 
    if (!sheetClassId) {
      /* find the default sheet class */
      sheetClassId = Object.values(CONFIG.Actor.sheetClasses[this.type] ?? []).find( info => info.default )?.id;
    }
    const found = game.syb5e.sheetClasses.find( classInfo => classInfo.id === sheetClassId );
    return !!found;

  }

  /* -------------------------------------------- */

  static async extendedRest({dialog=true, chat=true, newDay=true} = {}) {

    if(!this.isSybActor()){
      return false;
    }

    // Maybe present a confirmation dialog
    if ( dialog ) {
      try {
        newDay = await SybRestDialog.restDialog({actor: this, type: game.syb5e.CONFIG.REST_TYPES.extended});
      } catch(err) {
        return;
      }
    }

    //do extended rest
    await Resting._sybRest(this, game.syb5e.CONFIG.REST_TYPES.extended, chat, newDay)

  }

}
