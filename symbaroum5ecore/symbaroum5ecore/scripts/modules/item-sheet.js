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



  static async _renderItemSheet5e(sheet, html/*, options*/) {
    /* need to insert checkbox for favored and put a favored 'badge' on the description tab */
    const item = sheet.item;

    /* only concerned with adding favored to sybactor owned spell type items */
    if (item.type !== 'spell' || !SheetCommon.isSybActor(item.actor?.data)) return;

    const data = {
      isFavored: item.isFavored,
      favoredPath: SYB5E.CONFIG.PATHS[SYB5E.CONFIG.FLAG_KEY.favored]
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
}
