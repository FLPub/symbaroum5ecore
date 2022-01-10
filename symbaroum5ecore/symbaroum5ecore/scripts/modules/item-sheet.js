import { COMMON } from '../common.js'
import { logger } from '../logger.js';
import { SYB5E } from '../config.js'
import { Spellcasting } from './spellcasting.js'
import { SheetCommon } from './actor-sheet.js'

/* Initial attempt is via injection only */
export class Syb5eItemSheet {

  static NAME = "Syb5eItemSheet";

  static register() {
    this.patch();
    this.hooks();
  }

  static hooks() {
    Hooks.on('renderItemSheet5e', this._renderItemSheet5e);
  }

  static patch() {
    this._patchItem();
  }

  static _patchItem() {

    /* Armor will also have item properties similar to Weapons */
    COMMON.addGetter(COMMON.CLASSES.Item5e.prototype, 'properties', function() {

      /* is armor type? return syb armor props or the default object
       * if no flag data exists yet */
      if (Syb5eItemSheet.isArmor(this.data)) {
        return this.getFlag(COMMON.DATA.name, 'armorProps') ?? game.syb5e.CONFIG.DEFAULT_ITEM.armorProps
      }

      /* all others, fall back to core data */
      return this.data.data.properties ?? {}
    });

    const wrapped = COMMON.CLASSES.Item5e.prototype._getUsageUpdates;
    COMMON.CLASSES.Item5e.prototype._getUsageUpdates = function(usageInfo) {
      const sybActor = SheetCommon.isSybActor(this.actor.data)

      /* if we are an syb, modify the current usage updates as to not
       * confuse the core spellcasting logic */
      if (sybActor) {
      
        /* if we are consuming a spell slot, treat it as adding corruption instead */
        usageInfo.consumeCorruption = !!usageInfo.consumeSpellLevel || parseInt(this.data.data?.level) === 0;

        /* We are _never_ consuming spell slots in syb5e */
        usageInfo.consumeSpellLevel = null;
      }
      
      let updates = (wrapped.bind(this))(usageInfo)

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

  /* Handles injection of new SYB5E properties that are NOT handled
   * implicitly by a game.dnd5e.config object
   */
  static async _renderItemSheet5e(sheet, html/*, options*/) {
    /* need to insert checkbox for favored and put a favored 'badge' on the description tab */
    const item = sheet.item;

    /* if this is an owned item, owner needs to be a SYB sheet actor
     * if this is an unowned item, show always
     */
    if( item.parent && !SheetCommon.isSybActor(item.parent.data) ) {
      logger.debug(`Item [${item.id}] with parent actor [${item.parent.id}] is not an SYB5E item`);
      return;
    }

    /* only concerned with adding favored to sybactor owned spell type items */
    if (item.type == 'spell'){

      const data = {
        isFavored: item.isFavored,
        favoredPath: SYB5E.CONFIG.PATHS.favored
      }

      const favoredCheckbox = await renderTemplate(`${COMMON.DATA.path}/templates/items/parts/spell-favored.html`, data);
      const favoredBadge = await renderTemplate(`${COMMON.DATA.path}/templates/items/parts/spell-favored-badge.html`, data);

      /* insert our favored checkbox */
      const preparedCheckbox = html.find('label.checkbox.prepared');
      preparedCheckbox.before(favoredCheckbox);

      /* insert our favored badge */
      const itemPropBadges = html.find('.properties-list li');
      itemPropBadges.last().after(favoredBadge);
    }

    /* only concerned with adding armor props to armor type items */
    if (Syb5eItemSheet.isArmor(item.data)){
      const data = {
        armorProps: item.properties,
        propRoot: game.syb5e.CONFIG.PATHS.armorProps,
        propLabels: game.syb5e.CONFIG.ARMOR_PROPS
      }

      const propCheckboxes = await renderTemplate(`${COMMON.DATA.path}/templates/items/parts/armor-properties.html`, data);

      const equipmentDetails = html.find('[name="data.proficient"]').parents('.form-group').last();

      equipmentDetails.after(propCheckboxes);

    }
  }

  static isArmor(itemData) {

    return itemData.type == 'equipment' && game.dnd5e.config.armorTypes[itemData.data.armor?.type ?? ''];

  }
}
