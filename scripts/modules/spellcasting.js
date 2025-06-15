import { COMMON } from '../common.js';
import { logger } from '../logger.js';
import { SYB5E } from '../config.js';

/* Casting a Spell:
 * To cast a spell you take an appropriate action and gain tem-
 * porary Corruption. A cantrip causes 1 point of temporary
 * Corruption while a leveled spell causes 1d4 plus the spell’s
 * level points of temporary Corruption.
 *
 * When you cast a favored cantrip you gain no Corruption, and
 * when you cast a leveled favored spell you gain Corruption
 * equal only to the level of the spell.
 */

export class Spellcasting {
	static NAME = 'Spellcasting';

	static register() {
		this.patch();
		this.hooks();
	}

	static patch() {
		this._patchAbilityUseDialog();
	}

	static hooks() {
		Hooks.on('renderAbilityUseDialog', this._renderAbilityUseDialog);
	}

	static _patchAbilityUseDialog() {
		const targetCls = dnd5e.applications.item.AbilityUseDialog;
		const targetPath = 'dnd5e.applications.item.AbilityUseDialog';

		const patch = {
			_getSpellData: {
				value: Spellcasting.getSpellData,
				mode: 'WRAPPER',
			},
		};

		// LIBWRAPPER_TARGET: dnd5e.applications.item.AbilityUseDialog.prototype._getSpellData (implicitly, as _getSpellData is an instance method)
		COMMON.patch(targetCls, targetPath, patch);
	}

	static async getSpellData(wrapped, actorData, itemData, returnData) {
		await wrapped(actorData, itemData, returnData);

		const actor = returnData.item?.actor;

		/* only modify the spell data if this is an syb actor */
		if (actor?.isSybActor() ?? false) {
			await Spellcasting._getSpellData(actor, itemData, returnData);
		}

		logger.debug('_getSpellData result:', returnData);
	}

	static _renderAbilityUseDialog(app, html /*, data*/) {
		const actor = app.item?.actor;

		/* only modify syb actors */
		if (!actor || !actor.isSybActor()) return;

		/* only modify spell use dialogs */
		if (app.item?.type !== 'spell') return;

		/* get all text elements */
		// DND5E_COMPATIBILITY_RISK DOM_SELECTOR: This selector is very fragile.
		// It assumes a specific DOM structure within the AbilityUseDialog for spell consumption.
		// `html[0].getElementsByTagName('input')?.consumeSpellSlot?.nextSibling` was the original.
		// Attempting a slightly more robust selection for the text node next to the "Consume Slot" checkbox.
		const consumeInput = html[0].querySelector('input[name="consumeSpellSlot"]');
		if (consumeInput && consumeInput.nextSibling && consumeInput.nextSibling.nodeType === Node.TEXT_NODE) {
			// This is the ideal case, directly found the text node.
			consumeInput.nextSibling.textContent = COMMON.localize('SYB5E.Corruption.GainQuestion');
		} else if (consumeInput && consumeInput.parentElement?.classList.contains('form-group')) {
			// Fallback: If the direct nextSibling isn't it, try to find a label within the same form-group or change the main label.
			// This part is more speculative as the exact structure might vary.
			// Option 1: Change the label of the checkbox itself if it's wrapped by one.
			const checkboxLabel = consumeInput.closest('label');
			if (checkboxLabel) {
				// This might replace the checkbox itself if not careful. Let's try to find a text part of the label.
				// For now, let's assume the text is after the input. If a more complex structure exists, this needs refinement.
				// This part is hard to make robust without live inspection.
				// logger.warn("Could not find the exact text node for 'Consume Slot', attempting to modify checkbox label if simple structure.");
			}
			// Option 2: Change the form-group's main label text (if one exists clearly associated).
			const formGroup = consumeInput.closest('.form-group');
			const groupLabel = formGroup?.querySelector('label');
			if (groupLabel && groupLabel !== checkboxLabel) { // Ensure it's not the checkbox's own label
				// This is also risky as it might be a generic label for the group.
				// groupLabel.textContent = COMMON.localize('SYB5E.Corruption.GainQuestion');
				// logger.warn("Could not find the exact text node, and checkbox label modification is complex. Consider manual review of AbilityUseDialog template.");
			}
			// As a last resort for the original attempt, if the structure was input -> text, but it's wrapped in a label:
			if (consumeInput?.parentElement?.nodeName === 'LABEL') {
				let sibling = consumeInput.nextSibling;
				while(sibling) {
					if (sibling.nodeType === Node.TEXT_NODE && sibling.textContent.trim().length > 0) {
						sibling.textContent = COMMON.localize('SYB5E.Corruption.GainQuestion');
						break;
					}
					sibling = sibling.nextSibling;
				}
			}
			// If none of the above worked, it means the structure is too different or complex.
			// The original code had: textNode.textContent = ...
			// We'll stick to trying to find the direct nextSibling text node primarily.
			// The original `logger.error` is commented out, but this indicates a point of failure.
			// logger.error(COMMON.localize('SYB5E.Error.HTMLParse') + " for AbilityUseDialog consumeSlot text.");
			// No change made if the structure is not recognized to avoid breaking the dialog.
      return; // Return if no safe modification can be made.
		} else {
			// logger.error(COMMON.localize('SYB5E.Error.HTMLParse') + " for AbilityUseDialog consumeSlot text (input not found or no nextSibling).");
			return;
		}

		return;
	}

	/* MECHANICS HELPERS */

	/* get max spell level based
	 * on highest class progression
	 * NOTE: this is probably excessive
	 *   but since its a single display value
	 *   we want to show the higest value
	 * @param classData {array<classItemData>}
	 */
	static _maxSpellLevelByClass(classData = []) {
		const maxLevel = classData.reduce(
			(acc, cls) => {
				// DND5E_COMPATIBILITY: cls.spellcasting.progression (e.g., "full", "half") from a class item.
				const progression = cls.spellcasting.progression;
				const progressionArray = SYB5E.CONFIG.SPELL_PROGRESSION[progression] ?? false;
				if (progressionArray) {
					// DND5E_COMPATIBILITY: cls.system.levels is the number of levels in this class.
					const spellLevel = SYB5E.CONFIG.SPELL_PROGRESSION[progression][cls.system.levels] ?? 0;

					return spellLevel > acc.level ? { level: spellLevel, fullCaster: progression == 'full' } : acc;
				}

				/* nothing to accumulate */
				return acc;
			},
			{ level: 0, fullCaster: false }
		);

		const result = {
			level: maxLevel.level,
			label: SYB5E.CONFIG.LEVEL_SHORT[maxLevel.level],
			fullCaster: maxLevel.fullCaster,
		};

		return result;
	}

	/* highest spell level for an NPC:
	 * if a leveled caster, use that level as Full Caster
	 * if not and spellcasting stat is != 'none', use CR as full caster
	 * otherwise, no spellcasting
	 *
	 * @param actor5eData {Object} (i.e. actor.system)
	 */
	static _maxSpellLevelNPC(actor5eData) {
		// DND5E_COMPATIBILITY: actor5eData.details.spellLevel is the NPC's caster level.
		const casterLevel = actor5eData.details.spellLevel ?? 0;

		/* has caster levels, assume full caster */
		let result = {
			level: 0,
			label: '',
			fullCaster: casterLevel > 0,
		};

		/* modify max spell level if full caster or has a casting stat */
		if (result.fullCaster) {
			/* if we are a full caster, use our caster level */
			result.level = game.syb5e.CONFIG.SPELL_PROGRESSION.full[casterLevel];
		}

		result.label = game.syb5e.CONFIG.LEVEL_SHORT[result.level];

		return result;
	}

	static _isFavored(itemData) {
		const favored = foundry.utils.getProperty(itemData, game.syb5e.CONFIG.PATHS.favored) ?? game.syb5e.CONFIG.DEFAULT_ITEM.favored;
		return favored > 0;
	}

	static spellProgression(actor5e) {
		const result =
			actor5e.type == 'character' ? Spellcasting._maxSpellLevelByClass(Object.values(actor5e.classes)) : Spellcasting._maxSpellLevelNPC(actor5e.system);

		return result;
	}

	static _modifyDerivedProgression(actor5e) {
		const progression = Spellcasting.spellProgression(actor5e);

		/* insert our maximum spell level into the spell object */
		// DND5E_COMPATIBILITY: Modifying actor5e.system.spells.maxLevel. Standard dnd5e might calculate this differently or not use this specific path.
		actor5e.system.spells.maxLevel = progression.level;

		/* ensure that all spell levels <= maxLevel have a non-zero max */
		// DND5E_COMPATIBILITY_RISK: This loop modifies actor5e.system.spells[slot].max.
		// Forcing slot max to be at least 1 if progression.level says so might conflict with how dnd5e
		// handles spell slots for certain classes (e.g., pact magic, or if a character shouldn't have slots for a level).
		// Standard dnd5e derives slot maximums based on class levels and specific spellcasting features.
		const levels = Array.from({ length: progression.level }, (_, index) => `spell${index + 1}`);

		for (const slot of levels) {
			// DND5E_COMPATIBILITY: Accessing actor5e.system.spells[slot].max.
			actor5e.system.spells[slot].max = Math.max(actor5e.system.spells[slot].max, 1);
		}
	}

	static _generateCorruptionExpression(level, favored, prepMode) {
		/* cantrips have a level of "0" (string) for some reason */
		level = parseInt(level);

		if (isNaN(level)) {
			return false;
		}

		switch (prepMode) {
			case 'atwill':
			case 'innate':
				return '0';
		}

		if (favored) {
			/* favored cantrips cost 0, favored spells cost level */
			return level == 0 ? '0' : `${level}`;
		}

		/* cantrips cost 1, leveled spells are 1d4+level */
		return level == 0 ? '1' : `1d4 + ${level}`;
	}

	static _corruptionExpression(itemData, level = itemData.system.level) {
		/* get default expression */
		let expression = itemData.type === 'spell' ? Spellcasting._generateCorruptionExpression(level, Spellcasting._isFavored(itemData)) : '0';
		let type = 'temp';

		/* has custom corruption? */
		const custom =
			foundry.utils.getProperty(itemData, game.syb5e.CONFIG.PATHS.corruptionOverride.root) ??
			foundry.utils.duplicate(game.syb5e.CONFIG.DEFAULT_ITEM.corruptionOverride);

		/* modify the expression (always round up) minimum 1 unless custom */
		if (custom.mode !== game.syb5e.CONFIG.DEFAULT_ITEM.corruptionOverride.mode) {
			//has override
			switch (custom.mode) {
				case CONST.ACTIVE_EFFECT_MODES.ADD:
					expression = `${expression} + (${custom.value})`;
					break;
				case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
					expression = `(${expression}) * (${custom.value})`;
					break;
				case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
					expression = custom.value;
					break;
			}
		}

		/* modify the target */
		if (custom.type !== game.syb5e.CONFIG.DEFAULT_ITEM.corruptionOverride.type) {
			type = custom.type;
		}

		/* after all modifications have been done, return the final expression */
		return { expression, type };
	}

	/** \MECHANICS HELPERS **/

	/** PATCH FUNCTIONS **/

	static async _getSpellData(actor5e, itemData, returnData) {
		let errors = [];
		/****************
		 * Needed Info:
		 * - spellLevels: {array} of {level: 1, label: '1st Level (0 Slots)', canCast: true, hasSlots: false}
		 * - errors: {array<string>}: clear out spell slot error from base dnd5e, add our own.
		 *     - exceeding max spell level
		 * - consumeSpellSlot: {boolean}: always true (consume slot = add corruption)
		 * - canUse: {boolean}: always true? exceeding max corruption is a choice
		 */

		// DND5E_COMPATIBILITY: actor5e.system.details.cr for NPC CR.
		// DND5E_COMPATIBILITY: actor5e.classes for character classes.
		const maxLevel =
			actor5e.system.details.cr == undefined
				? Spellcasting._maxSpellLevelByClass(Object.values(actor5e.classes))
				: Spellcasting._maxSpellLevelNPC(actor5e.system);
		let spellLevels = [];

		const addSpellLevel = (level) => {
			spellLevels.push({
				level,
				label: COMMON.localize(`DND5E.SpellLevel${level}`) + ` (${Spellcasting._corruptionExpression(returnData.item, level).expression})`,
				canCast: true,
				hasSlots: true,
			});
		};

		for (let level = itemData.level; level <= maxLevel.level; level++) {
			addSpellLevel(level);
		}

		if (spellLevels.length < 1) {
			errors.push(COMMON.localize('SYB5E.Error.SpellLevelExceedsMax'));

			/* Add an entry for this spell in particular */
			addSpellLevel(itemData.level);
		}

		/* generate current corruption status as a reminder */
		const { value, max } = actor5e.corruption;
		const note = COMMON.localize('SYB5E.Corruption.ShortDesc', { value, max });

		const sybData = { note, errors, spellLevels, consumeSpellSlot: true, canUse: true };
		foundry.utils.mergeObject(returnData, sybData);
	}

	static _getUsageUpdates(item, { consumeCorruption }, chatData) {
		/* mirror core dnd5e structure */
		//const actorUpdates = {};
		const itemUpdates = {};

		if (consumeCorruption) {
			/* Does this item produce corruption? */
			const corruptionInfo = item.corruption;

			/* Generate and simplify rolldata strings for final rollable formula post-render */
			const expression = new Roll(`${corruptionInfo.expression}`, item.getRollData()).evaluateSync({ strict: false, allowStrings: true }).formula;

			/* store this corruption expression */
			const lastCorruptionField = game.syb5e.CONFIG.PATHS.corruption.root + '.last';
      foundry.utils.setProperty(chatData, lastCorruptionField, {
				expression,
				type: corruptionInfo.type,
			});

			/* temporarily set the gained corruption in the item data for use in damage roll expressions */
			//foundry.utils.setProperty(item, lastCorruptionField, itemUpdates[lastCorruptionField]);

			logger.debug('Cached corruption roll:', chatData[lastCorruptionField]);

    } else {
			/* clear out the previously stored corruption results, if any */
			itemUpdates[game.syb5e.CONFIG.PATHS.delete.corruption] = null;
			//item.updateSource({ [game.syb5e.CONFIG.PATHS.delete.corruption]: null });
		}

		/* some "fake" items dont have an ID, try to handle this... */
		return { itemUpdates: !!item.id ? itemUpdates : {} };
	}
}
