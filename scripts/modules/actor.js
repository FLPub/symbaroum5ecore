import { COMMON } from '../common.js'
import { logger } from '../logger.js';
import { Spellcasting } from './spellcasting.js'
import { SybRestDialog } from './apps/syb-rest-dialog.js'
import { Resting } from './resting.js'

export class ActorSyb5e {

  static NAME = "ActorSyb5e";


  static register() {
    this.patch();
    this.hooks();
  }

  static patch() {

    const target = 'game.dnd5e.entities.Actor5e.prototype'

    const patches = {
      getRollData: {
        value: ActorSyb5e.getRollData,
        mode: 'WRAPPER'
      },
      prepareBaseData: {
        value: ActorSyb5e.prepareBaseData,
        mode: 'WRAPPER'
      },
      prepareDerivedData: {
        value: ActorSyb5e.prepareDerivedData,
        mode: 'WRAPPER'
      },
      longRest: {
        value: ActorSyb5e.longRest,
      },
      shortRest: {
        value: ActorSyb5e.shortRest,
      },
      convertSybCurrency: {
        value: ActorSyb5e.convertSybCurrency,
        enumerable: true,
      },
      isSybActor: {
        value: ActorSyb5e.isSybActor,
        enumerable: true,
      },
      extendedRest: {
        value: ActorSyb5e.extendedRest,
        enumerable: true,
      },
      corruption: {
        get: ActorSyb5e.getCorruption,
        enumerable: true,
      },
      shadow: {
        get: ActorSyb5e.getShadow,
        enumerable: true,
      },
      manner: {
        get: ActorSyb5e.getManner,
        enumerable: true,
      }
    }

    COMMON.patch(target, patches);
  }

  /* -------------------------------------------- */

  static hooks() {
    Hooks.on('preUpdateActor',ActorSyb5e._preUpdateActor);
  }

  /* -------------------------------------------- */

  /* @override */
  static getRollData(wrapped, ...args) {
    let data = wrapped(...args);

    if (this.isSybActor()) {
      data.attributes.corruption = this.corruption;
      data.details.shadow = this.shadow;
      data.details.manner = this.manner;
    }

    return data;

  }

  /* -------------------------------------------- */

  /* @override */
  static prepareBaseData(wrapped, ...args) {
    wrapped(...args);

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
  static prepareDerivedData(wrapped, ...args) {

    /* perform normal steps */
    wrapped(...args); 

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
  static async longRest(wrapped, {dialog=true, chat=true, newDay=true} = {}, ...args) {

    const initHd = this.data.data.attributes.hd;
    const initHp = this.data.data.attributes.hp.value;
    const initCorr = this.corruption.temp;

    if(!this.isSybActor()){
      return wrapped({dialog, chat, newDay}, ...args); 
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

  static async shortRest(wrapped, {dialog=true, chat=true, autoHD=false, autoHDThreshold=3} = {}, ...args) {

    const initHd = this.data.data.attributes.hd;
    const initHp = this.data.data.attributes.hp.value;
    const initCorr = this.corruption.temp;

    if(!this.isSybActor()){
      return wrapped({dialog, chat, autoHD, autoHDThreshold}, ...args);
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
    const currentBonus = actor._simplifyBonus((getProperty(actor.data, paths.corruption.bonus) ?? 0) + getProperty(actor, 'overrides.data.attributes.corruption.bonus') ?? 0);

    /* handle special cases */
    switch (corruptionAbility) {
      case 'custom': return currentMax;
      case 'thorough': return 0;
      case 'spellcasting': {
        /* if corruption is set to use spellcasting, ensure we have a spellcasting stat as well */
        corruptionAbility = !!actor.data.data.attributes.spellcasting ? corruptionAbility : defaultAbility;
      }
    }

    const usesSpellcasting = corruptionAbility === 'spellcasting';

    /* otherwise determine corruption calc -- full casters get a special one */
    const {fullCaster} = actor.type === 'character' ? Spellcasting._maxSpellLevelByClass(Object.values(actor.classes).map( item => item.data.data )) : Spellcasting._maxSpellLevelNPC(actor.data.data);

    const prof = actor.data.data.attributes.prof ?? actor.data.data.prof?.flat ?? currentMax;
    if (prof == null) {
      logger.error('SYB5E.Error.NoProf');
    }

    const corrAbility = usesSpellcasting ? actor.data.data.attributes.spellcasting : corruptionAbility;
    const corrMod = actor.data.data.abilities[corrAbility].mod;

    if (corrMod == null) {
      /* we havent prepped enough data; use the stored value */
      return currentMax
    }

    /* we can only apply a bonus to an automatically computed maximum (i.e. derived from attributes) */
    const rawMax = fullCaster ? (prof + corrMod) * 2 : Math.max( corrMod + prof * 2, 2 );
    
    return rawMax + currentBonus;
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

  /* handles the "soulless" trait */
  static _preUpdateActor(actor, update) {

    /* is corruption being modified? */
    const {temp, permanent} = getProperty(update, game.syb5e.CONFIG.PATHS.corruption.root) ?? {temp: null, permanent: null};

    /* if no corruption update, does not concern us */
    if(temp == null && permanent == null) return;

    /* compute the total change in corruption */
    const current = actor.corruption;
    const gainedCorruption = (temp ?? current.temp) - current.temp + (permanent ?? current.permanent) - current.permanent;

    /* If the current actor has the 'soulless' trait, mirror this damage to current/max health */
    const {scope, key} = game.syb5e.CONFIG.PATHS.sybSoulless;
    if(actor.getFlag(scope, key)) {
      logger.debug('Soulless Initial Values:', actor, update);
      const hpPath = 'data.attributes.hp';

      let {value: currentHp, tempmax: currentMaxDelta, max: currentMax} = getProperty(actor.data, hpPath);
      currentMaxDelta = (currentMaxDelta ?? 0) - gainedCorruption;

      /* clamp current HP between max HP and 0 */
      currentHp = Math.max( Math.min( currentHp, currentMax + currentMaxDelta ), 0);

      /* add in our hp changes to the update object */
      setProperty(update, hpPath, {value: currentHp, tempmax: currentMaxDelta});
      logger.debug('Soulless Update:', update);
    }
  }
}
