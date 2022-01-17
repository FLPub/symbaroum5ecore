import { COMMON } from '../common.js'
import { logger } from '../logger.js';

export class ItemSyb5e {

  static NAME = "ItemSyb5e";

  static register() {
    this.patch()
  }

  static parent = {}

  static patch() {

    const superFn = {
      properties: {
        get: ItemSyb5e.getProperties
      },
      getRollData: {
        value: ItemSyb5e.getRollData
      },
      _getUsageUpdates: {
        value: ItemSyb5e._getUsageUpdates
      },
    }

    Object.entries(superFn).forEach( ([fn, override]) => {

      /* get the current version */
      const original = Object.getOwnPropertyDescriptor(game.dnd5e.entities.Item5e.prototype, fn)

      /* if our copy already has a value here, we dont want to overwrite */
      if ( original && !Object.hasOwn(this.parent, fn) ){ 
        Object.defineProperty(this.parent, fn, original);
      }

      /* set the replacement function */
      Object.defineProperty(game.dnd5e.entities.Item5e.prototype, fn, mergeObject(original ?? {}, override));

    })
  }

  static getProperties() {
    /* Armor will also have item properties similar to Weapons */

    /* is armor type? return syb armor props or the default object
     * if no flag data exists yet */
    if (this.isArmor) {
      return this.getFlag(COMMON.DATA.name, 'armorProps') ?? game.syb5e.CONFIG.DEFAULT_ITEM.armorProps
    }

    /* all others, fall back to core data */
    return this.data.data.properties ?? {}
  }

  static getRollData() {
      const data = ItemSyb5e.parent.getRollData.call(this);
      
      /* if owned by an SYB actor, insert our
       * SYB5E specific fields
       */
      if( 
        !!data && 
        (!this.parent || this.parent.isSybActor())
      ){
        logger.debug('Item/rollData', this, data);
        data.item.properties = this.properties;
        data.item.favored = this.isFavored;
        data.item.type = this.type;
        if(this.type == 'spell') {
          /* add in corruption expression */
          COMMON.addGetter(data.item, 'corruption', function(){
             return Spellcasting._generateCorruptionExpression(this.level, this.favored)
          });
        }

      }

      return data;
  }

  static _getUsageUpdates(usageInfo) {
    const sybActor = this.actor.isSybActor()

    /* if we are an syb, modify the current usage updates as to not
     * confuse the core spellcasting logic */
    if (sybActor) {

      /* if we are consuming a spell slot, treat it as adding corruption instead */
      usageInfo.consumeCorruption = !!usageInfo.consumeSpellLevel || parseInt(this.data.data?.level) === 0;

      /* We are _never_ consuming spell slots in syb5e */
      usageInfo.consumeSpellLevel = null;
    }

    let updates = __getUsageUpdates.call(this,usageInfo);

    /* now insert our needed information into the changes to be made to the actor */
    if (sybActor) {
      const sybUpdates = Spellcasting._getUsageUpdates(this, usageInfo);
      if(!sybUpdates){
        /* this item cannot be used -- likely due to incorrect max spell level */
        logger.debug('Item cannot be used.');
        return false;
      }
      mergeObject(updates, sybUpdates);
    }

    logger.debug('Usage Info:', usageInfo, '_getUsageUpdates result:',updates, 'This item:', this);

    return updates;

  }

}
