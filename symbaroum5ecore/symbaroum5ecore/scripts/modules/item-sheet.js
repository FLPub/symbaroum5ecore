import { COMMON } from '../common.js'
import { logger } from '../logger.js';
import { SYB5E } from '../config.js'

/* Initial attempt is via injection only */
export class Syb5eItemSheet {

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

    /* isFavored getter */
    Object.defineProperty(COMMON.CLASSES.Item5e.prototype, 'isFavored', {
      get: function() {
        const key = SYB5E.CONFIG.FLAG_KEY.favored;
        const favored = this.getFlag(COMMON.DATA.name, key) ?? SYB5E.CONFIG.DEFAULT_ITEM[COMMON.DATA.name][key]
        return favored;
      }
    });
  }

  static async _renderItemSheet5e(sheet, html, options) {
    /* need to insert checkbox for favored and put a favored 'badge' on the description tab */
    const item = sheet.item;

    /* only concerned with adding favored to spell type items */
    if (item.type !== 'spell') return;

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
