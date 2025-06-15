import { COMMON } from '../common.js';
import { logger } from '../logger.js';
import { Spellcasting } from './spellcasting.js';
import { SybRestDialog } from './apps/syb-rest-dialog.js';
import { Resting } from './resting.js';

export class ActorSyb5e {
	static NAME = 'ActorSyb5e';

	static register() {
		this.patch();
		this.hooks();
	}

	static patch() {
		const target = dnd5e.documents.Actor5e.prototype;
		const targetPath = 'dnd5e.documents.Actor5e.prototype';

		const patches = {
			getRollData: {
				value: ActorSyb5e.getRollData,
				mode: 'WRAPPER',
			},
			prepareBaseData: {
				value: ActorSyb5e.prepareBaseData,
				mode: 'WRAPPER',
			},
			prepareDerivedData: {
				value: ActorSyb5e.prepareDerivedData,
				mode: 'WRAPPER',
			},
			// LIBWRAPPER_TARGET: dnd5e.documents.Actor5e.prototype.longRest
			longRest: {
				value: ActorSyb5e.longRest,
				mode: 'WRAPPER', // Added mode: 'WRAPPER'
			},
			// LIBWRAPPER_TARGET: dnd5e.documents.Actor5e.prototype.shortRest
			shortRest: {
				value: ActorSyb5e.shortRest,
				mode: 'WRAPPER', // Added mode: 'WRAPPER'
			},
			convertSybCurrency: {
				value: ActorSyb5e.convertSybCurrency,
				enumerable: true,
			},
			isSybActor: {
				value: ActorSyb5e.isSybActor,
				enumerable: true,
			},
			extendedRest: {
				value: ActorSyb5e.extendedRest,
				enumerable: true,
			},
			corruption: {
				get: ActorSyb5e.getCorruption,
				enumerable: true,
			},
			shadow: {
				get: ActorSyb5e.getShadow,
				enumerable: true,
			},
			manner: {
				get: ActorSyb5e.getManner,
				enumerable: true,
			},
		};

		// LIBWRAPPER_TARGET: Patches for dnd5e.documents.Actor5e.prototype are registered below.
		// Targets include: getRollData, prepareBaseData, prepareDerivedData, longRest, shortRest.
		// Other properties are effectively new additions or direct overrides if they happen to exist.
		COMMON.patch(target, targetPath, patches);
	}

	/* -------------------------------------------- */

	static hooks() {
		Hooks.on('preUpdateActor', ActorSyb5e._preUpdateActor);
	}

	/* -------------------------------------------- */

	/* @override */
	static getRollData(wrapped, ...args) {
		let data = wrapped(...args);

		if (this.isSybActor()) {
			data.attributes.corruption = this.corruption;
			data.details.shadow = this.shadow;
			data.details.manner = this.manner;
		}

		return data;
	}

	/* -------------------------------------------- */

	/* @override */
	static prepareBaseData(wrapped, ...args) {
		wrapped?.(...args);

		if (this.isSybActor()) {
			ActorSyb5e._prepareCommonData(this);
			switch (this.type) {
				case 'character':
					break;
				case 'npc':
					ActorSyb5e._prepareNpcData(this);
					break;
			}
		}
	}

	/* -------------------------------------------- */

	/* @override */
	static prepareDerivedData(wrapped, ...args) {
		/* perform normal steps */
		wrapped(...args);

		if (this.isSybActor()) {
			logger.debug('core derived data:', this);

			/* prepare derived corruption data */
			foundry.utils.setProperty(this, game.syb5e.CONFIG.PATHS.corruption.root, this.corruption);

			/* check for half caster and "fix" for syb5e half-caster progression */
			Spellcasting._modifyDerivedProgression(this);
		}
	}

	/* -------------------------------------------- */

	/* @override */
	static async longRest(wrapped, { dialog = true, chat = true, newDay = true } = {}, ...args) {
		const initHd = this.system.attributes.hd;
		const initHp = this.system.attributes.hp.value;
		const initCorr = this.corruption.temp;

		if (!this.isSybActor()) {
			return wrapped({ dialog, chat, newDay }, ...args);
		}

		// Maybe present a confirmation dialog
		if (dialog) {
			try {
				newDay = await SybRestDialog.restDialog({ actor: this, type: game.syb5e.CONFIG.REST_TYPES.long });
			} catch (err) {
				if (err == 'cancelled') logger.debug('Rest dialog cancelled.');
				return false;
			}
		}

		//do long rest
		await Resting._sybRest(
			this,
			game.syb5e.CONFIG.REST_TYPES.long,
			chat,
			newDay,
			this.system.attributes.hd - initHd,
			this.system.attributes.hp.value - initHp,
			this.corruption.temp - initCorr
		);
	}

	/* -------------------------------------------- */

	static async shortRest(wrapped, { dialog = true, chat = true, autoHD = false, autoHDThreshold = 3 } = {}, ...args) {
		const initHd = this.system.attributes.hd;
		const initHp = this.system.attributes.hp.value;
		const initCorr = this.corruption.temp;

		if (!this.isSybActor()) {
			return wrapped({ dialog, chat, autoHD, autoHDThreshold }, ...args);
		}

		// Maybe present a confirmation dialog
		if (dialog) {
			try {
				await SybRestDialog.restDialog({ actor: this, type: game.syb5e.CONFIG.REST_TYPES.short });
			} catch (err) {
				if (err == 'cancelled') logger.debug('Rest dialog cancelled.');
				return false;
			}
		}

		//do extended rest
		await Resting._sybRest(
			this,
			game.syb5e.CONFIG.REST_TYPES.short,
			chat,
			false,
			this.system.attributes.hd - initHd,
			this.system.attributes.hp.value - initHp,
			this.corruption.temp - initCorr
		);
	}

	/* -------------------------------------------- */

	static _prepareCommonData(actor) {
		foundry.utils.setProperty(actor, game.syb5e.CONFIG.PATHS.shadow, actor.shadow);
	}

	/* -------------------------------------------- */

	static _prepareNpcData(actor) {
		foundry.utils.setProperty(actor, game.syb5e.CONFIG.PATHS.manner, actor.manner);
	}

	/* -------------------------------------------- */

	static getCorruption() {
		/* current value */
		let corruption = this.getFlag(COMMON.DATA.name, 'corruption') ?? {};

		/* correct bad values and merge in needed defaults */
		corruption = foundry.utils.mergeObject(game.syb5e.CONFIG.DEFAULT_FLAGS.corruption, corruption, { inplace: false });

		corruption.value = corruption.temp + corruption.permanent;
		corruption.max = ActorSyb5e._calcMaxCorruption(this);
		return corruption;
	}

	/* -------------------------------------------- */

	static getShadow() {
		const shadow = this.getFlag(COMMON.DATA.name, 'shadow') ?? game.syb5e.CONFIG.DEFAULT_FLAGS.shadow;
		return shadow;
	}

	static getManner() {
		const manner = this.getFlag(COMMON.DATA.name, 'manner') ?? game.syb5e.CONFIG.DEFAULT_FLAGS.manner;
		return manner;
	}

	/* -------------------------------------------- */

	/**
	 * Convert all carried currency to the highest possible denomination to reduce the number of raw coins being
	 * carried by an Actor.
	 * @returns {Promise<Actor5e>}
	 */
	static convertSybCurrency() {
		/* dont convert syb currency if not an syb actor */
		if (!this.isSybActor()) {
			logger.error(COMMON.localize('SYB5E.error.notSybActor'));
			return;
		}

		const conversion = Object.entries(game.syb5e.CONFIG.CURRENCY_CONVERSION);
		const current = foundry.utils.duplicate(this.system.currency);

		for (const [denom, data] of conversion) {
			/* get full coin conversion to next step */
			const denomUp = Math.floor(current[denom] / data.each);

			/* subtract converted coins and add converted coins */
			current[denom] -= denomUp * data.each;
			current[data.into] += denomUp;
		}

		return this.update({ 'data.currency': current });
	}

	/* -------------------------------------------- */

	/* Corruption Threshold = (prof * 2) + charisma mod; minimum 2
	 * Source: PGpg37
	 * or if full caster (prof + spellcastingMod) * 2
	 */
	static _calcMaxCorruption(actor) {
		const CONFIG = game.syb5e.CONFIG;
		const paths = CONFIG.PATHS;
		const defaultAbility = game.syb5e.CONFIG.DEFAULT_FLAGS.corruption.ability;
		let corruptionAbility = foundry.utils.getProperty(actor, paths.corruption.ability) ?? defaultAbility;
		/* if we are in a custom max mode, just return the current stored max */
		const currentMax = foundry.utils.getProperty(actor, paths.corruption.max) ?? game.syb5e.CONFIG.DEFAULT_FLAGS.corruption.max;
		const currentBonus = dnd5e.utils.simplifyBonus(
			(foundry.utils.getProperty(actor, paths.corruption.bonus) ?? 0)
		);

		/* handle special cases */
		switch (corruptionAbility) {
			case 'custom':
				return currentMax;
			case 'thorough':
				return 0;
			case 'spellcasting': {
				/* if corruption is set to use spellcasting, ensure we have a spellcasting stat as well */
				// DND5E_COMPATIBILITY: actor.system.attributes.spellcasting is the key for the primary spellcasting ability.
				corruptionAbility = !!actor.system.attributes.spellcasting ? corruptionAbility : defaultAbility;
			}
		}

		const usesSpellcasting = corruptionAbility === 'spellcasting';

		/* otherwise determine corruption calc -- full casters get a special one */
		// DND5E_COMPATIBILITY: actor.classes is used to determine character's spellcasting progression.
		// DND5E_COMPATIBILITY: actor.system (specifically actor.system.details.spellLevel for NPCs) is used.
		// Relies on Spellcasting._maxSpellLevelByClass and Spellcasting._maxSpellLevelNPC from spellcasting.js.
		const { fullCaster } =
			actor.type === 'character' ? Spellcasting._maxSpellLevelByClass(Object.values(actor.classes)) : Spellcasting._maxSpellLevelNPC(actor.system);

		// DND5E_COMPATIBILITY: actor.system.attributes.prof is the proficiency bonus.
		const prof = actor.system.attributes.prof ?? currentMax;
		if (prof == null) {
			logger.error('SYB5E.Error.NoProf');
		}

		// DND5E_COMPATIBILITY: actor.system.attributes.spellcasting (if used) or a specific ability key.
		const corrAbility = usesSpellcasting ? actor.system.attributes.spellcasting : corruptionAbility;
		// DND5E_COMPATIBILITY: actor.system.abilities[abilityKey].mod is the ability modifier.
		const corrMod = actor.system.abilities[corrAbility].mod ?? 0;

		/* we can only apply a bonus to an automatically computed maximum (i.e. derived from attributes) */
		const rawMax = fullCaster ? (prof + corrMod) * 2 : Math.max(corrMod + prof * 2, 2);

		return rawMax + currentBonus;
	}

	/* -------------------------------------------- */

	static isSybActor() {
		let sheetClassId = this.getFlag('core', 'sheetClass');
		if (!sheetClassId) {
			/* find the default sheet class */
			sheetClassId = Object.values(CONFIG.Actor.sheetClasses[this.type] ?? []).find((info) => info.default)?.id;
		}
		const found = game.syb5e.sheetClasses.find((classInfo) => classInfo.id === sheetClassId);
		return !!found;
	}

	/* -------------------------------------------- */

	static async extendedRest({ dialog = true, chat = true, newDay = true } = {}) {
		if (!this.isSybActor()) {
			return false;
		}

		// Maybe present a confirmation dialog
		if (dialog) {
			try {
				newDay = await SybRestDialog.restDialog({ actor: this, type: game.syb5e.CONFIG.REST_TYPES.extended });
			} catch (err) {
				if (err == 'cancelled') logger.debug('Rest dialog cancelled.');
				return false;
			}
		}

		//do extended rest
		await Resting._sybRest(this, game.syb5e.CONFIG.REST_TYPES.extended, chat, newDay);
	}

	/* handles the "soulless" trait */
	static _preUpdateActor(actor, update) {
		/* is corruption being modified? */
		const { temp, permanent } = foundry.utils.getProperty(update, game.syb5e.CONFIG.PATHS.corruption.root) ?? { temp: null, permanent: null };

		/* if no corruption update, does not concern us */
		if (temp == null && permanent == null) return;

		/* If the current actor has the 'soulless' trait, mirror this damage to current/max health */
		const { scope, key } = game.syb5e.CONFIG.PATHS.sybSoulless;
		if (actor.getFlag(scope, key)) {
			/* compute the total change in corruption */
			const current = actor.corruption;
			const gainedCorruption = (temp ?? current.temp) - current.temp + (permanent ?? current.permanent) - current.permanent;

			logger.debug('Soulless Initial Values:', actor, update);
			const hpPath = 'system.attributes.hp';

			let {
				value: currentHp,
				tempmax: currentMaxDelta,
				max: currentMax,
			} = foundry.utils.mergeObject(foundry.utils.getProperty(actor, hpPath), foundry.utils.getProperty(update, hpPath) ?? {}, { inplace: false });
			currentMaxDelta = (currentMaxDelta ?? 0) - gainedCorruption;

			/* clamp current HP between max HP and 0 */
			currentHp = Math.max(Math.min(currentHp, currentMax + currentMaxDelta), 0);

			/* add in our hp changes to the update object */
			foundry.utils.setProperty(update, hpPath, { value: currentHp, tempmax: currentMaxDelta });
			logger.debug('Soulless Update:', update);
		}
	}
}
