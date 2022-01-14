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
        source: 'getRollData', 
        value: ActorSyb5e.getRollData
      },
      convertSybCurrency: {
        source: 'convertSybCurrency',
        value: ActorSyb5e.convertSybCurrency
      },
      isSybActor: {
        source: 'isSybActor',
        value: ActorSyb5e.isSybActor
      },
      prepareDerivedData: {
        source: 'prepareDerivedData',
        value: ActorSyb5e.prepareDerivedData
      },
      extendedRest: {
        source: 'extendedRest',
        value: ActorSyb5e.extendedRest
      },
      longRest: {
        source: 'longRest',
        value: ActorSyb5e.longRest
      },
      shortRest: {
        source: 'shortRest',
        value: ActorSyb5e.shortRest
      },
      corruption: {
        source: 'corruption',
        get: ActorSyb5e.getCorruption
      },
      shadow: {
        source: 'shadow',
        get: ActorSyb5e.getShadow
      },
      manner: {
        source: 'manner',
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
  static prepareDerivedData(...args) {

    /* perform normal steps */
    ActorSyb5e.parent.prepareDerivedData.call(this, ...args); 

    if (this.isSybActor()){
      /* check for half caster and "fix" for syb5e half-caster progression */
      logger.debug('derived data:', this.data)
      
      //TODO 
      Spellcasting.modifyDerivedProgression(this.data);
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

  static getCorruption() {
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
  }

  /* -------------------------------------------- */

  static getShadow() {
    const shadow = this.getFlag(COMMON.DATA.name, 'shadow') ?? SheetCommon.DEFAULT_FLAGS.shadow;
    return shadow;
  }

  static getManner() {
    const manner = this.getFlag(COMMON.DATA.name, 'manner') ?? SheetCommon.DEFAULT_FLAGS.manner;
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

  static isSybActor() {
    
    const sheetClassId = getProperty(this.data, 'flags.core.sheetClass'); 
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
