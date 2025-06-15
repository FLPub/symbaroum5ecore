import { COMMON } from '../common.js';
import { logger } from '../logger.js';

export class SheetCommon {
	static NAME = 'SheetCommon';

	/** SETUP **/

	/* -------------------------------------------- */

	static register() {
		this.globals();
		this.build();
	}

	/* -------------------------------------------- */

	static build() {
		const charSheet = dnd5e.applications.actor.ActorSheet5eCharacter;
		const npcSheet = dnd5e.applications.actor.ActorSheet5eNPC;

		this.buildCharSheet(charSheet);
		this.buildNpcSheet(npcSheet);
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
		const corruptionAbilities = Object.entries(contextAbilities).reduce((acc, [key, val]) => {
			acc.push({ ability: key, label: game.i18n.localize(`DND5E.Ability${key.capitalize()}`) });
			return acc;
		}, []);

		/* if this actor has any spellcasting, allow it to be selected as corruption stat */
		// DND5E_COMPATIBILITY: Verify actor.system.attributes.spellcasting path.
		if (actor.system.attributes.spellcasting?.length > 0) {
			corruptionAbilities.push({ ability: 'spellcasting', label: COMMON.localize('DND5E.Spellcasting') });
		}

		/* add in the 'custom' option */
		corruptionAbilities.push({ ability: 'custom', label: COMMON.localize('SYB5E.Corruption.Custom') });

		/* add in the 'thoroughly corrupt' option */
		corruptionAbilities.push({ ability: 'thorough', label: COMMON.localize('SYB5E.Corruption.ThoroughShort') });

		let corruptionAbilityData = {
			path: game.syb5e.CONFIG.PATHS.corruption.ability,
			abilities: corruptionAbilities,
			current: actor.corruption.ability,
			disabled: false,
			thorough: actor.corruption.ability === 'thorough',
		};

		/* can only edit max corruption if using a custom value */
		corruptionAbilityData.disabled = corruptionAbilityData.current !== 'custom' ? 'disabled' : '';

		/* can only show corruption totals if NOT thoroughly corrupted */

		return corruptionAbilityData;
	}

	/* -------------------------------------------- */

	/* Common context data between characters and NPCs */
	static async _getCommonData(actor, context) {
		/* Add in our corruption values in 'data.attributes' */
		// DND5E_COMPATIBILITY: actor.corruption and actor.shadow are custom data.
		// Ensure actor.js patches correctly add this data to the actor for dnd5e 4.3.6.
		const commonData = {
			sybPaths: game.syb5e.CONFIG.PATHS,
			corruptionAbilities: SheetCommon._getCorruptionAbilityData(actor, context.system.abilities),
			system: {
				attributes: {
					// These are custom properties expected to be on the actor object.
					corruption: actor.corruption,
				},
				details: {
					shadow: actor.shadow,
				},
			},
		};

		foundry.utils.mergeObject(context, commonData);
	}

	static async renderCurrencyRow(actor) {
		const data = {
			// DND5E_COMPATIBILITY: Verify actor.system.currency path.
			currency: actor.system.currency,
			labels: game.syb5e.CONFIG.CURRENCY,
		};

		COMMON.translateObject(data.labels);

		const rendered = await renderTemplate(`${COMMON.DATA.path}/templates/actors/parts/actor-currency.html`, data);

		return rendered;
	}

	/* -------------------------------------------- */

	static async _render() {
		// DND5E_COMPATIBILITY & APPLICATION_V2_REFACTOR_NOTE:
		// The following DOM manipulations are highly dependent on the dnd5e 4.3.6 sheet HTML structure.
		// These selectors may break if the underlying dnd5e templates change.
		// Consider data-driven approaches for visibility (e.g., modifying context in getData)
		// or more robust injection methods if ApplicationV2 provides them.

		/* suppress spell slot display */
		// High Risk: '.spell-slots' class might change or be removed in dnd5e 4.3.6.
		// A better approach might be to modify data in `getData` to prevent rendering,
		// or use a more specific selector if possible.
		this.element.find('.spell-slots')?.css('display', 'none'); // Added optional chaining for safety

		const currencyRow = await SheetCommon.renderCurrencyRow(this.actor);

		/* Replace the 'Prepared (N)' text with 'Favored (M)' */
		// High Risk: '[data-filter="prepared"]' selector is dnd5e-specific and might change.
		const preparedCounter = this.element.find('[data-filter="prepared"]');
		if (preparedCounter.length) { // Check if element exists
			preparedCounter.text(`${COMMON.localize('SYB5E.Spell.Favored')} (${this.options.numFavored})`);
		}
		// Note: Changing 'data-filter' attribute itself was commented out, which is good,
		// as that would likely break dnd5e's own filtering.

		switch (this.actor.type) {
			case 'character':
				/* characters have a currency row already that we need to replace */
				// High Risk: '.currency' class is dnd5e-specific.
				const currencyElem = this.element.find('.currency');
				if (currencyElem.length) currencyElem.replaceWith(currencyRow);
				break;

			/* NPCs have none and we want to put it at the top of features */
			case 'npc':
				// High Risk: '.features .inventory-filters' selectors are dnd5e-specific.
				const featuresInventoryFilters = this.element.find('.features .inventory-filters');
				if (featuresInventoryFilters.length) featuresInventoryFilters.prepend(currencyRow);
				break;
		}

		//if ( !this.isEditable ) return false;

		//currency conversion
		// Lower Risk: '.currency-convert' should be within this module's actor-currency.html template.
		// Ensure this listener is correctly managed if the currency row can be re-rendered multiple times.
		this.element.find('.currency-convert').off('click.symbaroum').on('click.symbaroum', SheetCommon._onSybCurrencyConvert.bind(this));
	}

	/* -------------------------------------------- */

	static _filterForFavored(items) {
		/* now, add in our favored filter */
		const favored = items.filter((item) => {
			//Favored filter
			return foundry.utils.getProperty(item, game.syb5e.CONFIG.PATHS.favored) > 0;
		});

		return favored;
	}

	/* -------------------------------------------- */
	static _prepareItemToggleState(item, context) {
		if (item.type === 'spell') {
			const favoredState = foundry.utils.getProperty(item, game.syb5e.CONFIG.PATHS.favored) ?? -1;
			context.toggleClass = {
				1: 'active',
				0: '',
				'-1': 'fixed',
			}[favoredState];

			context.toggleTitle = {
				1: [COMMON.localize('SYB5E.Spell.Favored')],
				0: [COMMON.localize('SYB5E.Spell.NotFavored')],
				'-1': [COMMON.localize('SYB5E.Spell.NeverFavored')],
			}[favoredState];
		}
	}

	/* -------------------------------------------- */

	/* targets: data.spellbook, data.preparedSpells */
	static _prepareItems(data) {
		/* zero out prepared count and ignore */
		data.preparedSpells = 0;

		let favoredSpells = 0;
		data.spellbook.forEach((groupEntry) => {
			const prepMode = groupEntry.dataset['preparation.mode'];
			if (prepMode !== 'atwill' && prepMode !== 'innate' && prepMode !== 'pact') {
				/* valid group to be favored */
				groupEntry.canPrepare = this.actor.type == 'character';
				favoredSpells += groupEntry.spells.reduce((acc, spellData) => {
					const favored = foundry.utils.getProperty(spellData, game.syb5e.CONFIG.PATHS.favored);
					return favored > 0 ? acc + 1 : acc;
				}, 0);
			}
		});

		this.options.numFavored = favoredSpells;
	}

	/**
	 * Handle toggling the state of an Owned Item within the Actor.
	 * @param {Event} event        The triggering click event.
	 * @returns {Promise<Item5e>}  Item with the updates applied.
	 * @private
	 */
	static _onToggleItem(event) {
		event.preventDefault();
		const itemId = event.currentTarget.closest('.item').dataset.itemId;
		const item = this.actor.items.get(itemId);

		/* change from dnd5e source -- modifying FAVORED rather than prepared */
		if (item.type === 'spell') {
			if ((foundry.utils.getProperty(item, game.syb5e.CONFIG.PATHS.favored) ?? 0) < 0) {
				/* "never favored" items are "locked" */
				return;
			}
			return item.update({ [game.syb5e.CONFIG.PATHS.favored]: item.isFavored ? 0 : 1 });
		} else {
			const attr = 'system.equipped';
			return item.update({ [attr]: !foundry.utils.getProperty(item, attr) });
		}
	}

	/** \COMMON **/

	/* -------------------------------------------- */

	static async _onSybCurrencyConvert(event) {
		event.preventDefault();
		await this._onSubmit(event);
		return this.actor.convertSybCurrency();
	}

	static buildCharSheet(parentClass) {
		class Syb5eActorSheetCharacter extends parentClass {
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

			_filterItems(items, filters) {
				if (filters.size == 1 && filters.has('prepared')) {
					const favored = SheetCommon._filterForFavored(items);

					/* if we are the only filter, return just us */
					return favored;
				}

				/* otherwise, ignored our hijacked filter and do normal stuff */
				filters.delete('prepared');
				const filtered = super._filterItems(items, filters);

				return filtered;
			}

			/* -------------------------------------------- */

			get template() {
				if (!game.user.isGM && this.actor.limited) return `${COMMON.DATA.path}/templates/actors/syb5e-limited-sheet.html`;
				return `${COMMON.DATA.path}/templates/actors/syb5e-character-sheet.html`;
			}

			/* -------------------------------------------- */

			get defaultOptions() {
				return foundry.utils.mergeObject(super.defaultOptions, {
					classes: ['syb5e', 'dnd5e', 'sheet', 'actor', 'character'],
					width: 768,
					height: 749,
					numFavored: 0, // hack: allows retrieval of data needed for replacement
				});
			}

			/* -------------------------------------------- */

			/** @override */
			async getData() {
				let context = await super.getData();

				SheetCommon._getCommonData(this.actor, context);

				context.enrichedBio = await TextEditor.enrichHTML(context.system.details.biography.value, { async: true, rollData: context.rollData });
				logger.debug('getData#context:', context);
				return context;
			}

			/* -------------------------------------------- */

			/* supressing display of spell slot counts */
			async _render(force = false, options = {}) {
				await super._render(force, options);

				// Note: DOM manipulations after super._render might need adjustment for ApplicationV2.
				// Consider using _replaceHTML or _injectHTML for more complex scenarios.
				await SheetCommon._render.call(this, force, options);

				/* Inject the extended rest button and listener */
				const footer = this.element.find('.hit-dice .attribute-footer');
				// Ensure button is not added multiple times on re-renders
				if (footer.length && !footer.find('.extended-rest').length) {
					const extendedRestButton = `<a class="rest extended-rest" title="${COMMON.localize('SYB5E.Rest.Extended')}">${COMMON.localize('SYB5E.Rest.ExtendedAbbr')}</a>`;
					footer.append(extendedRestButton);
				}

				/* activate listener for Extended Rest Button */
				this.element.find('.extended-rest').off('click').on('click', this._onExtendedRest.bind(this));
			}
			/* -------------------------------------------- */

			_prepareItemToggleState(item, context) {
				super._prepareItemToggleState(item, context);

				/* now modify toggle data related to spells */
				SheetCommon._prepareItemToggleState(item, context);
			}

			/* -------------------------------------------- */

			_prepareItems(data) {
				super._prepareItems(data);

				/* now modify spell information to replace 'prepared' with 'favored' */
				SheetCommon._prepareItems.call(this, data);
			}

			/* -------------------------------------------- */

			_onToggleItem(event) {
				/* purposefully not calling super */
				return SheetCommon._onToggleItem.call(this, event);
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
		}

		Syb5eActorSheetCharacter.register();
	}

	static buildNpcSheet(parentClass) {
		class Syb5eActorSheetNPC extends parentClass {
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

			_filterItems(items, filters) {
				if (filters.size == 1 && filters.has('prepared')) {
					const favored = SheetCommon._filterForFavored(items);

					/* if we are the only filter, return just us */
					return favored;
				}

				/* otherwise, ignored our hijacked filter and do normal stuff */
				filters.delete('prepared');
				const filtered = super._filterItems(items, filters);

				return filtered;
			}

			/* -------------------------------------------- */

			_prepareItemToggleState(item) {
				super._prepareItemToggleState(item);

				/* now modify data related to spells */
				SheetCommon._prepareItemToggleState.call(this, item);
			}

			/* -------------------------------------------- */

			_prepareItems(data) {
				super._prepareItems(data);

				/* now modify spell information to replace 'prepared' with 'favored' */
				SheetCommon._prepareItems.call(this, data);
			}

			/* -------------------------------------------- */

			_onToggleItem(event) {
				/* purposefully not calling super */
				return SheetCommon._onToggleItem.call(this, event);
			}

			/* -------------------------------------------- */

			get template() {
				if (!game.user.isGM && this.actor.limited) return `${COMMON.DATA.path}/templates/actors/syb5e-limited-sheet.html`;
				return `${COMMON.DATA.path}/templates/actors/syb5e-npc-sheet.html`;
			}

			/* -------------------------------------------- */

			get defaultOptions() {
				return foundry.utils.mergeObject(super.defaultOptions, {
					classes: ['syb5e', 'dnd5e', 'sheet', 'actor', 'npc'],
					width: 635,
					height: 705,
					numFavored: 0, // hack: allows retrieval of data needed for replacement
				});
			}

			/* -------------------------------------------- */

			async getData() {
				let context = await super.getData();
				SheetCommon._getCommonData(this.actor, context);

				/* NPCS also have 'manner' */
				foundry.utils.setProperty(context.system.details, 'manner', this.actor.manner);

				context.enrichedBio = await TextEditor.enrichHTML(context.system.details.biography.value, { async: true, rollData: context.rollData });
				logger.debug('getData#context:', context);
				return context;
			}

			/* -------------------------------------------- */

			/* supressing display of spell slot counts */
			async _render(force = false, options = {}) {
				await super._render(force, options);

				// Note: DOM manipulations after super._render might need adjustment for ApplicationV2.
				// Consider using _replaceHTML or _injectHTML for more complex scenarios.
				return SheetCommon._render.call(this, force, options);
			}
		}

		Syb5eActorSheetNPC.register();
	}
}
