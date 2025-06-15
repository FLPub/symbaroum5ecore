import { COMMON } from '../common.js';
import { Spellcasting } from './spellcasting.js';

export class ItemSyb5e {
	static NAME = 'ItemSyb5e';

	static register() {
		this.patch();
		this.hooks();
	}

	static parent = {};

	static hooks() {
		//Hooks.on('dnd5e.preDisplayCard', this.flagWithCorruption);
    Hooks.on('dnd5e.preItemUsageConsumption', this.swapCorruptionConsumption);
    Hooks.on('dnd5e.itemUsageConsumption', this.generateCorruptionUsage);
    Hooks.on('dnd5e.renderChatMessage', this.applyCorruption);
    //Hooks.on('renderChatLog', this.setChatListeners)
	}

	static patch() {
		const target = dnd5e.documents.Item5e.prototype;
		const targetPath = 'dnd5e.documents.Item5e.prototype';

		const patches = {
			properties: {
				get: ItemSyb5e.getProperties,
			},
			getRollData: {
				value: ItemSyb5e.getRollData,
				mode: 'WRAPPER',
			},
			corruption: {
				get: ItemSyb5e.getCorruption,
			},
			corruptionOverride: {
				get: ItemSyb5e.getCorruptionOverride,
			},
			isFavored: {
				get: ItemSyb5e.getIsFavored,
			},
			hasDamage: {
				value: ItemSyb5e.hasDamage,
				mode: 'WRAPPER',
			},
		};

		// LIBWRAPPER_TARGET: Patches for dnd5e.documents.Item5e.prototype are registered below.
		// Targets include: properties (getter override), getRollData (wrapper), hasDamage (wrapper).
		// Other properties (corruption, corruptionOverride, isFavored) are new custom getters.
		COMMON.patch(target, targetPath, patches);
	}

	static getCorruption() {
		return Spellcasting._corruptionExpression(this);
	}

	static getCorruptionOverride() {
		const override =
			foundry.utils.getProperty(this, game.syb5e.CONFIG.PATHS.corruptionOverride.root) ??
			foundry.utils.duplicate(game.syb5e.CONFIG.DEFAULT_ITEM.corruptionOverride);
		override.mode = parseInt(override.mode);
		return override;
	}

	static getIsFavored() {
		return Spellcasting._isFavored(this);
	}

	static getProperties() {
		// DND5E_COMPATIBILITY: Accessing item.system.properties.
		let props = this.system.properties ?? {};
		/* Armor will also have item properties similar to Weapons */

		/* is armor type? return syb armor props or the default object
		 * if no flag data exists yet */
		if (this.isArmor) {
			// FOUNDRY_API: Accessing item flags via this.getFlag().
			return foundry.utils.mergeObject(props, this.getFlag(COMMON.DATA.name, 'armorProps') ?? game.syb5e.CONFIG.DEFAULT_ITEM.armorProps);
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
		const consumptionInfo = this.system.consume;
		if (consumptionInfo?.type === 'ammo' && !this.hasAttack) {
			this._ammo = this.actor.items.get(consumptionInfo.target);
		}

		/* if owned by an SYB actor, insert our
		 * SYB5E specific fields
		 */
		if (!!data && (!this.parent || this.parent.isSybActor())) {
			data.item.properties = this.properties;
			data.item.favored = this.isFavored;
			data.item.type = this.type;

			/* populate most up to date corruption use information */
			const lastCorruptionField = game.syb5e.CONFIG.PATHS.corruption;
			const lastCorruptionData = foundry.utils.getProperty(this, lastCorruptionField.root) ?? {
				expression: this.corruption.expression,
				total: 0,
				summary: '- (-)',
			};

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

		if (consumesAmmo && !!consumedItem && consumedItem?.id !== this.id) consumedDamage = consumedItem.hasDamage;

		return coreHasDamage || consumedDamage;
	}

  static swapCorruptionConsumption(item, usage) {
		/* if we are a syb actor, modify the current usage updates as to not
		 * confuse the core spellcasting logic */
    if (item.actor.isSybActor()) {
      /* if we are consuming a spell slot, treat it as adding corruption instead */
			/* Note: consumeSpellSlot only valid for _leveled_ spells. All others MUST add corruption if a valid expression */
			usage.consumeCorruption = !!usage.consumeSpellSlot ||
				(parseInt(item.system?.level ?? 0) < 1 && item.corruption.expression != game.syb5e.CONFIG.DEFAULT_ITEM.corruptionOverride.expression);

			/* We are _never_ consuming spell slots in syb5e */
			usage.consumeSpellSlot = false;
    }
  }

	static generateCorruptionUsage(item, usage, chatData, updates) {
		/* if we are consuming corruption, the needed chatmessage data is inserted.
     * otherwise, we ensure there is no 'last consumption' field via item updates.
     */
    const sybUpdates = Spellcasting._getUsageUpdates(item, usage, chatData);
    foundry.utils.mergeObject(updates, sybUpdates);
	}

  // static _handleEventAction(ev) {
  //   const target = ev.target.closest('[data-action]');
  //   if (!target) return;

  //   ev.preventDefault();
  //   switch (target.dataset.action) {
  //     case 'undo':
  //       const {type = 'temp', total = 0} = target.dataset;
  //     default: break;
  //   }
  // }

  // static setChatListeners(app, [html]) {
  //   const chatContainers = html.querySelectorAll('#chat-log .symbaroum-dnd5e-mod');
  //   for( let container of chatContainers) container.addEventListener('click', this._handleEventAction);
  // }

  static async applyCorruption(message, html) {
    const corruption = foundry.utils.getProperty(message, game.syb5e.CONFIG.PATHS.corruption.root + '.last') ?? {};

    /* Do not re-eval previously rolled corruption values */
    // FOUNDRY_CHAT_DOM: This method directly manipulates the chat message HTML (html parameter).
    // Its robustness depends on the stability of the chat message structure.
    if ( message.author.isSelf 
      && ('expression' in corruption)
      && !('total' in corruption)) {

      // DND5E_COMPATIBILITY: Accessing message.getFlag('dnd5e', 'use') to get item UUID.
      // This flag structure is specific to how dnd5e handles item usage in chat messages.
      const {itemUuid = null} = message.getFlag('dnd5e','use'); 
      const item = await fromUuid(itemUuid);
      const actor = item.actor;

      const cRoll = new Roll(`ceil(${corruption.expression})`);
      await cRoll.evaluate();

      const gained = cRoll.total;

      /* only update actor if we actually gain corruption */
      if (gained != 0) {
        /* field name shortcuts */
        const fieldKey = corruption.type;

        /* get the current corruption values */
        let currentCorruption = item.actor.corruption;

        /* add in our gained corruption to the temp corruption */
        currentCorruption[fieldKey] = currentCorruption[fieldKey] + gained;

        /* insert this update into the actorUpdates */
        const acPath = game.syb5e.CONFIG.PATHS.corruption[fieldKey];
        await actor.update({[acPath]: currentCorruption[fieldKey]});
      }

      /* always set the item's last corruption data */
      const icPath = game.syb5e.CONFIG.PATHS.corruption.root + '.last';
      item.update({[icPath]: {
        ...corruption,
        total: gained,
      }});

      /* update the total on the chatcard for rendering */
      message.update({[icPath]: {
        ...corruption,
        total: gained,
      }});
    } else if ('total' in corruption) {
      /* inject previously rolled corruption results */
      const header = {
				temp: 'SYB5E.Corruption.TempDamage',
				permanent: 'SYB5E.Corruption.PermDamage',
			}[corruption.type];

      // <i class="fa-solid fa-backward-fast" data-action="undo" data-type="${corruption.type}" data-total="${corruption.total}"></i>
      const corruptionContent = `
<div class="symbaroum-dnd5e-mod chat">
  <h3>${game.i18n.localize(header)}</h3>
  <p class="roll-output" >
    <span class="roll-exp">
      <i class="fa-solid fa-dice"></i>${corruption.expression}
    </span>
    <i class="fa-solid fa-right-long"></i>
    <span class="roll-result">${corruption.total}</span>
  </p>
</div>`;
      // FOUNDRY_CHAT_DOM: Injecting custom HTML content into the chat message.
      html.insertAdjacentHTML('beforeend', corruptionContent);
    }
  
  }
}
