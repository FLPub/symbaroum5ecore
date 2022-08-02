import { COMMON } from '../common.js'
import { logger } from '../logger.js';
import { Spellcasting } from './spellcasting.js'

export class ItemSyb5e {

  static NAME = "ItemSyb5e";

  static register() {
    this.patch()
  }

  static parent = {}

  static patch() {

    const target = dnd5e.documents.Item5e.prototype
    const targetPath = 'dnd5e.documents.Item5e.prototype'

    const patches = {
      properties: {
        //value: ItemSyb5e.getProperties,
        get: ItemSyb5e.getProperties,
        //mode: 'WRAPPER'
      },
      getRollData: {
        value: ItemSyb5e.getRollData,
        mode: 'WRAPPER'
      },
      _getUsageUpdates: {
        value: ItemSyb5e._getUsageUpdates,
        mode: 'WRAPPER'
      },
      corruption: {
        get: ItemSyb5e.getCorruption
      },
      corruptionOverride: {
        get: ItemSyb5e.getCorruptionOverride
      },
      isFavored: {
        get: ItemSyb5e.getIsFavored
      },
      getChatData: {
        value: ItemSyb5e.getChatData,
        mode: 'WRAPPER'
      },
      hasDamage: {
        value: ItemSyb5e.hasDamage,
        mode: 'WRAPPER'
      }
    }

    COMMON.patch(target, targetPath, patches);
  }

  static getCorruption() {
    return Spellcasting._corruptionExpression(this);
  }

  static getCorruptionOverride() {
    const override = getProperty(this, game.syb5e.CONFIG.PATHS.corruptionOverride.root) ?? duplicate(game.syb5e.CONFIG.DEFAULT_ITEM.corruptionOverride);
    override.mode = parseInt(override.mode);
    return override;
  }
  
  static getIsFavored() {
    return Spellcasting._isFavored(this);
  }

  /* @override */
  static async getChatData(wrapped, ...args) {

    /* should insert 2 labels -- level and components */
    let data = await wrapped(...args);

    /* add ours right after if we are consuming corruption */
    const corruptionUse = getProperty(this, game.syb5e.CONFIG.PATHS.corruption.root);
    if(this.actor.isSybActor && corruptionUse && corruptionUse.total != 0){
      logger.debug('Retrieving last rolled corruption:', corruptionUse);
      data.properties.push(corruptionUse.summary);
    }

    return data;
    
  }

  static getProperties() {
    let props = {};
    /* Armor will also have item properties similar to Weapons */

    /* is armor type? return syb armor props or the default object
     * if no flag data exists yet */
    if (this.isArmor) {
      return mergeObject(props, this.getFlag(COMMON.DATA.name, 'armorProps') ?? game.syb5e.CONFIG.DEFAULT_ITEM.armorProps);
    }

    /* all others, fall back to core data */
    return props;
  }

  static getRollData(wrapped, ...args) {
    let data = wrapped(...args);

    /* Patch for core dnd5e - items without attacks do not get ammo damage added
     * -> insert needed information here. Resource reduction handled by above getUsageUpdates call
     */

    /* if this item is consuming ammo, but does not have an attack roll insert ammo info */
    const consumptionInfo = this.system.consume
    if (consumptionInfo?.type === 'ammo' && !this.hasAttack) {
      this._ammo = this.actor.items.get(consumptionInfo.target);
    }

    /* if owned by an SYB actor, insert our
     * SYB5E specific fields
     */
    if( 
      !!data && 
      (!this.parent || this.parent.isSybActor())
    ){
      data.item.properties = this.properties;
      data.item.favored = this.isFavored;
      data.item.type = this.type;

      /* populate most up to date corruption use information */
      const lastCorruptionField = game.syb5e.CONFIG.PATHS.corruption;
      const lastCorruptionData = getProperty(this, lastCorruptionField.root) ?? {expression: this.corruption.expression, total: 0, summary: '- (-)'};

      data.item.corruption = lastCorruptionData;
      
    }

    return data;
  }

  static hasDamage(wrapped, ...args) {
    /* core logic */
    //const coreHasDamage = !!(this.system.damage && this.system.damage.parts.length)
    const coreHasDamage = wrapped(...args);

    const consumesAmmo = this.system.consume?.type === 'ammo';
    const consumedItem = this.actor?.items.get(this.system.consume?.target);
    let consumedDamage = false;

    if(consumesAmmo && !!consumedItem && consumedItem?.id !== this.id ) consumedDamage = consumedItem.hasDamage;

    return coreHasDamage || consumedDamage;

  }

  static _getUsageUpdates(wrapped, usageInfo, ...args) {
    const sybActor = this.actor.isSybActor()

    /* if we are an syb, modify the current usage updates as to not
     * confuse the core spellcasting logic */
    if (sybActor) {

      /* if we are consuming a spell slot, treat it as adding corruption instead */
      /* Note: consumeSpellSlot only valid for _leveled_ spells. All others MUST add corruption if a valid expression */
      usageInfo.consumeCorruption = !!usageInfo.consumeSpellLevel || ((parseInt(this.system?.level ?? 0) < 1) && this.corruption.expression != game.syb5e.CONFIG.DEFAULT_ITEM.corruptionOverride.expression);

      /* We are _never_ consuming spell slots in syb5e */
      usageInfo.consumeSpellLevel = null;
    }

    let updates = wrapped(usageInfo, ...args);

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
