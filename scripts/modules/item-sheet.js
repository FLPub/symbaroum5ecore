import { COMMON } from '../common.js';
import { logger } from '../logger.js';
import { SYB5E } from '../config.js';

/* Initial attempt is via injection only */
export class Syb5eItemSheet {
	static NAME = 'Syb5eItemSheet';

	static register() {
		this.hooks();
	}

	static hooks() {
		Hooks.on('renderItemSheet5e', this._renderItemSheet5e);
	}

	/* Handles injection of new SYB5E properties that are NOT handled
	 * implicitly by a game.dnd5e.config object
	 */
	static async _renderItemSheet5e(sheet, html /*, options*/) {
		/* need to insert checkbox for favored and put a favored 'badge' on the description tab */
		const item = sheet.item;

		const commonData = {
			edit: sheet.isEditable ?? false ? '' : 'disabled',
		};
		/* if this is an owned item, owner needs to be a SYB sheet actor
		 * if this is an unowned item, show always
		 */
		if (item.parent && !item.parent.isSybActor()) {
			logger.debug(`Item [${item.id}] with parent actor [${item.parent.id}] is not an SYB5E item`);
			return;
		}

		/* only concerned with adding favored to sybactor owned spell type items */
		// DND5E_COMPATIBILITY: Accessing item.type.
		if (item.type == 'spell') {
			const data = {
				...commonData,
				// Uses custom getter ItemSyb5e.isFavored
				isFavored: item.isFavored,
				favoredPath: SYB5E.CONFIG.PATHS.favored, // Module-specific path
				favoredValue: foundry.utils.getProperty(item, SYB5E.CONFIG.PATHS.favored) ?? 0, // Module-specific path
				favoredStates: {
					[COMMON.localize('SYB5E.Spell.Favored')]: 1,
					[COMMON.localize('SYB5E.Spell.NotFavored')]: 0,
					[COMMON.localize('SYB5E.Spell.NeverFavored')]: -1,
				},
			};

			const favoredSelect = await renderTemplate(`${COMMON.DATA.path}/templates/items/parts/spell-favored.html`, data);
			const favoredBadge = await renderTemplate(`${COMMON.DATA.path}/templates/items/parts/spell-favored-badge.html`, data);

			/* adjust spell prep div style to <label style="max-width: fit-content;"> */
			// DND5E_SHEET_DOM: Targets 'label.checkbox.prepared', specific to dnd5e spell preparation.
			const preparedCheckbox = html.find('label.checkbox.prepared');
			// DND5E_SHEET_DOM: DOM traversal (parent(), prev()) is fragile.
			const prepModeLineLabel = preparedCheckbox.parent().prev();
			prepModeLineLabel.css('max-width', 'fit-content');

			/* insert our favored select menu */
			// DND5E_SHEET_DOM: Injecting HTML after the prepared checkbox.
			preparedCheckbox.after(favoredSelect);

			/* insert our favored badge */
			// DND5E_SHEET_DOM: Targets '.properties-list li', dnd5e specific structure.
			const itemPropBadges = html.find('.properties-list li');
			// DND5E_SHEET_DOM: Injecting HTML after the last property badge.
			itemPropBadges.last().after(favoredBadge);

			/* find the "Cost (GP)" label (if it exists) */
			// DND5E_SHEET_DOM: Targets label before input with name="system.materials.cost".
			// DND5E_COMPATIBILITY: Relies on item.system.materials.cost structure.
			const costLabel = html.find('[name="system.materials.cost"]').prev();
			if (costLabel.length > 0) {
				costLabel.text(COMMON.localize('SYB5E.Currency.CostThaler'));
			}
		}

		/* need to rename "subclass" to "approach" */
		// DND5E_COMPATIBILITY: Accessing item.type.
		if (item.type == 'subclass') {
			/* get the subclass text field entry */
			// DND5E_SHEET_DOM: Targets '.header-details .item-type', dnd5e specific.
			const subclassLabel = html.find('.header-details .item-type');
			if (subclassLabel.length > 0) {
				subclassLabel.text(COMMON.localize('SYB5E.Item.Class.Approach'));
			} else {
				logger.debug('Could not find subclass label field in class item render.');
			}

			/* remove spellcasting progression not in syb5e */
			// DND5E_COMPATIBILITY: Relies on item.system.spellcasting.progression structure and values.
			const filterList = Object.keys(game.syb5e.CONFIG.SPELL_PROGRESSION).reduce((acc, key) => { // Module-specific config
				if (acc.length == 0) {
					/* dont put the comma in front */
					acc += `[value="${key}"]`;
				} else {
					acc += `, [value="${key}"]`;
				}
				return acc;
			}, '');
			// DND5E_SHEET_DOM: Targets select with name="system.spellcasting.progression".
			const progressionSelect = html.find('[name="system.spellcasting.progression"]');
			// DND5E_SHEET_DOM: Removing options from a select element.
			progressionSelect.children().not(filterList).remove();
		}

		/* we want to add a custom corruption field if there is a general resource consumption field */
		// DND5E_SHEET_DOM: Targets '.form-group.consumption', dnd5e specific.
		const consumeGroup = html.find('.form-group.consumption');
		if (consumeGroup.length > 0) {
			// Uses custom getter ItemSyb5e.corruptionOverride
			const currentOverrides = item.corruptionOverride;
			let data = {
				corruptionType: {
					none: '',
					temp: COMMON.localize('SYB5E.Corruption.TemporaryFull'),
					permanent: COMMON.localize('SYB5E.Corruption.Permanent'),
				},
				corruptionModes: {
					'': CONST.ACTIVE_EFFECT_MODES.CUSTOM,
					ADD: CONST.ACTIVE_EFFECT_MODES.ADD,
					MULTIPLY: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
					OVERRIDE: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
				},
				overridePath: game.syb5e.CONFIG.PATHS.corruptionOverride.root,
				...currentOverrides,
			};

			/* non-spell items have no base corruption to modify, can only override with a custom value */
			if (item.type !== 'spell') {
				delete data.corruptionModes.ADD;
				delete data.corruptionModes.MULTIPLY;
			}

			const corruptionGroup = await renderTemplate(`${COMMON.DATA.path}/templates/items/parts/item-corruption.html`, data);
			consumeGroup.after(corruptionGroup);
		}
	}
}
