import { COMMON } from '../common.js';
import { logger } from '../logger.js';
import { Spellcasting } from './spellcasting.js';
import { ActorSyb5e } from './actor.js';

export class SheetCommon {
  static NAME = 'SheetCommon';

  /** SETUP **/

  /* -------------------------------------------- */

  static register() {
    this.globals();
  }

  /* -------------------------------------------- */

  static globals() {
    game.syb5e.sheetClasses = [];
  }

  /** \SETUP **/

  /* -------------------------------------------- */

  /** DEFAULT DATA AND PATHS **/

  /* -------------------------------------------- */

  static defaults(sheetClass) {
    sheetClass['NAME'] = sheetClass.name;

    // TODO is this field in COMMON needed?
    COMMON[sheetClass.NAME] = {
      scope: 'dnd5e',
      sheetClass,
    };

    /* need to use our own defaults to set our defaults */
    COMMON[sheetClass.NAME].id = `${COMMON[sheetClass.NAME].scope}.${COMMON[sheetClass.NAME].sheetClass.name}`;

    /* store this information in a better place */
    game.syb5e.sheetClasses.push(COMMON[sheetClass.NAME]);
  }

  /** \DEFAULTS **/

  /** SYB DATA SETUP **/

  /* -------------------------------------------- */

  static _getCorruptionAbilityData(actor, contextAbilities) {
    let defaultEntries = [];

    /* if this actor has any spellcasting, allow it to be selected as corruption stat */
    if (actor.data.data.attributes.spellcasting?.length > 0) {
      defaultEntries.push({ ability: 'spellcasting', label: COMMON.localize('DND5E.Spellcasting') });
    }

    defaultEntries.push({ ability: 'custom', label: COMMON.localize('SYB5E.Corruption.Custom') });

    const corruptionAbilities = Object.entries(contextAbilities).reduce((acc, [key, val]) => {
      acc.push({ ability: key, label: val.label });
      return acc;
    }, defaultEntries);

    let corruptionAbilityData = {
      path: game.syb5e.CONFIG.PATHS.corruption.ability,
      abilities: corruptionAbilities,
      current: actor.corruption.ability,
    };

    /* can only edit max corruption if using a custom value */
    corruptionAbilityData.disabled = corruptionAbilityData.current !== 'custom' ? 'disabled' : '';

    return corruptionAbilityData;
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
          corruption: actor.corruption,
        },
        details: {
          shadow: actor.shadow,
        },
      },
    };

    mergeObject(context, commonData);
  }

  static async renderCurrencyRow(actor) {
    const data = {
      currency: actor.data.data.currency,
      labels: game.syb5e.CONFIG.CURRENCY,
    };

    COMMON.translateObject(data.labels);

    const rendered = await renderTemplate(`${COMMON.DATA.path}/templates/actors/parts/actor-currency.html`, data);

    return rendered;
  }

  /* -------------------------------------------- */

  static async _render() {
    /* suppress spell slot display */
    this.element.find('.spell-slots').css('display', 'none');

    const currencyRow = await SheetCommon.renderCurrencyRow(this.actor);

    switch (this.actor.type) {
      case 'character':
        /* characters have a currency row already that we need to replace */
        this.element.find('.currency').replaceWith(currencyRow);
        break;

      /* NPCs have none and we want to put it at the top of features */
      case 'npc':
        this.element.find('.features .inventory-filters').prepend(currencyRow);
        break;
    }

    //if ( !this.isEditable ) return false;

    //currency conversion
    this.element.find('.currency-convert').click(SheetCommon._onSybCurrencyConvert.bind(this));
  }

  /** \COMMON **/

  /* -------------------------------------------- */

  static async _onSybCurrencyConvert(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.convertSybCurrency();
  }
}

export class Syb5eActorSheetCharacter extends COMMON.CLASSES.ActorSheet5eCharacter {
  static NAME = 'Syb5eActorSheetCharacter';

  /* -------------------------------------------- */

  static register() {
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

  /** OVERRIDES **/

  /* -------------------------------------------- */

  //TODO expand to other modes (like limited)
  get template() {
    return `${COMMON.DATA.path}/templates/actors/syb5e-character-sheet.html`;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['syb5e', 'dnd5e', 'sheet', 'actor', 'character'],
      width: 780,
      height: 749,
    });
  }

  /* -------------------------------------------- */

  getData() {
    let context = super.getData();

    SheetCommon._getCommonData(this.actor, context);

    logger.debug('getData#context:', context);
    return context;
  }

  /* -------------------------------------------- */

  /* supressing display of spell slot counts */
  async _render(...args) {
    await super._render(...args);

    /* call the common _render by binding (pretend its our own method) */
    const boundRender = await SheetCommon._render.bind(this);
    boundRender(...args);

    /* Inject the extended rest button and listener ( TODO should the whole sheet be injected like this?) */
    const footer = this.element.find('.hit-dice .attribute-footer');
    footer.append(`<a class="rest extended-rest" title="${COMMON.localize('SYB5E.Rest.ExtRest')}">${COMMON.localize('SYB5E.Rest.ExtendedAbbr')}</a>`);

    /* activate listener for Extended Rest Button */
    this.element.find('.extended-rest').click(this._onExtendedRest.bind(this));
  }

  /* -------------------------------------------- */

  async _onShortRest(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.shortRest();
  }

  /* -------------------------------------------- */

  async _onLongRest(event) {
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

  async _onExtendedRest(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.extendedRest();
  }

  /* -------------------------------------------- */
}

export class Syb5eActorSheetNPC extends COMMON.CLASSES.ActorSheet5eNPC {
  static NAME = 'Syb5eActorSheetNPC';

  /* -------------------------------------------- */

  static register() {
    this.defaults();

    /* register our sheet */
    Actors.registerSheet('dnd5e', Syb5eActorSheetNPC, {
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

  /** OVERRIDES **/

  /* -------------------------------------------- */

  //TODO expand to other modes (like limited)
  get template() {
    return `${COMMON.DATA.path}/templates/actors/syb5e-npc-sheet.html`;
  }

  /* -------------------------------------------- */

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['syb5e', 'dnd5e', 'sheet', 'actor', 'npc'],
      width: 625,
      height: 705,
    });
  }

  /* -------------------------------------------- */

  getData() {
    let context = super.getData();
    SheetCommon._getCommonData(this.actor, context);

    /* NPCS also have 'manner' */
    setProperty(context.data.details, 'manner', this.actor.manner);

    logger.debug('getData#context:', context);
    return context;
  }

  /* -------------------------------------------- */

  /* supressing display of spell slot counts */
  async _render(...args) {
    await super._render(...args);

    /* call the common _render by binding (pretend its our own method) */
    const boundRender = await SheetCommon._render.bind(this);
    boundRender(...args);
  }
}
