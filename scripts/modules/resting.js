/******************* SHORT REST ******************************
 * Short rests require one hour of light effort, no more than
 * sitting and talking, tending to wounds and the like. You gain
 * the following benefits when you complete a short rest:
 * • You can spend one or more Hit Dice to recover hit points,
 * up to the character’s maximum number of Hit Dice, which
 * is equal to your level. For each Hit Die spent in this way, you
 * roll the die and add your Constitution modifier to it. You
 * regain hit points equal to the total. You can decide to spend
 * an additional Hit Die after each roll. You regain spent Hit
 * Dice upon finishing an extended rest, as explained below.
 * • You reduce your temporary Corruption by your profi-
 * ciency bonus.
 * • You can spend a Hit Die in order to reduce your tempo-
 * rary Corruption by your proficiency bonus again. You can
 * continue to do this as long as you have Hit Dice to spend
 * and temporary Corruption to reduce.
 *************************************************************/

/****************** LONG REST *******************************
 * A long rest requires around eight hours, six of which must
 * be spent sleeping and the other two in light activity, such
 * as being on watch, reading, or conversing with others. You
 * gain the following benefits when you complete a long rest:
 * • You recover hit points equal to the maximum value of
 * your Hit Die (e.g. 8 for 1d8) plus your Constitution mod-
 * ifier. This does not count as using a Hit Die.
 * • You reduce your temporary Corruption by twice your
 * proficiency bonus.
 * • You can spend one or more Hit Dice to recover hit points,
 * up to the character’s maximum number of Hit Dice,
 * which is equal to your level. For each Hit Die spent in this
 * way, you roll the die and add your Constitution modifier
 * to it. You regain hit points equal to the total. You can
 * decide to spend an additional Hit Die after each roll. You
 * regain spent Hit Dice upon finishing an extended rest, as
 * explained below.
 * • You can spend a Hit Die in order to reduce your tempo-
 * rary Corruption by your proficiency bonus again. You can
 * continue to do this as long as you have Hit Dice to spend
 * and temporary Corruption to reduce.
 ***********************************************************/

/**************** EXTENDED REST **************************** 
 * An extended rest requires at least 24 hours in a safe place
 * where you can sleep, relax and tend to your wounds with-
 * out threat of interruption. Extended rests often mark the
 * end of an adventure, or at least a significant break in the
 * action. You gain the following benefits at the end of an
 * extended rest:
 * • You regain all of your hit points.
 * • You recover all of your Hit Dice.
 * • Your temporary Corruption becomes 0.
 ***********************************************************/

export class Resting {

  static register() {
  }

/* -------------------------------------------- */

  static _getCorruptionRecovery(actor, type) {
    const currCorr = actor.corruption.temp;
    const proficiency = actor.system.attributes.prof;

    const restTypes = game.syb5e.CONFIG.REST_TYPES;

    const recovery = {
      [restTypes.short]: proficiency,
      [restTypes.long]: 2*proficiency,
      [restTypes.extended]: currCorr
    }[type];

    return Math.min(recovery, currCorr);
  }


/* -------------------------------------------- */

  static async _sybRest(actor, type, chat=true, newDay=false, dHd = 0, dHp = 0, dco = 0) {

    const restTypes = game.syb5e.CONFIG.REST_TYPES;

    /* get the appropriate "free" healing */
    const {hitPointUpdates, hpGain} = Resting._getRestHitPointUpdate(actor, type);

    /* get hit die recovery (full recovery ONLY on extended rest) */
    const {updates: hitDiceUpdates, hitDiceRecovered} = type === restTypes.extended ? actor._getRestHitDiceRecovery({maxHitDice: actor.system.details.level}) : {updates: [], hitDiceRecovered: 0}

    /* get corruption recovery 1x, 2x, full (short, long, ext) */
    const recovery = Resting._getCorruptionRecovery(actor, type);
    const corruptionUpdate = Resting._corruptionHealUpdate(actor.corruption, recovery);

    /* get resource recovery */
    const resourceUpdates = actor._getRestResourceRecovery({recoverShortRestResources: type === restTypes.short, recoverLongRestResources: type !== restTypes.short});

    /* get item uses recovery */
    const itemUseUpdates = await actor._getRestItemUsesRecovery({recoverLongRestUses: type !== restTypes.short, recoverDailyUses: newDay});

    /* get extend rest item use recovery */
    const erItemUseUpdates = type === restTypes.extended ? Resting.getErItemUsesRecovery(actor.items) : [];

    const result = {
      dhp: dHp + hpGain,
      dhd: Math.abs(dHd + hitDiceRecovered),
      dco: dco + recovery,
      actorUpdates: {
        ...hitPointUpdates,
        ...resourceUpdates,
        ...corruptionUpdate,
      },
      itemUpdates: [
        ...hitDiceUpdates,
        ...itemUseUpdates,
        ...erItemUseUpdates,
      ],
      longRest: type === restTypes.long, //emulating core field here
      restType: type, //the actual syb rest type
      newDay
    };

    /* Perform updates */
    await actor.update(result.actorUpdates);
    await actor.updateEmbeddedDocuments("Item", result.itemUpdates);

    /* show chat message summarizing results, if requested */
    if ( chat ) await Resting._displayRestResultMessage(result, actor);

    // Call restCompleted hook so that modules can easily perform actions when actors finish a rest
    Hooks.callAll("restCompleted", actor, result);

    // Return data summarizing the rest effects
    return result;
  }

/* -------------------------------------------- */

  static async _displayRestResultMessage(result, actor) {
    /***********************************
     * In large part based on 
     * Actor5e#_displayRestResultMessage
     **********************************/
    const { dhd, dhp, dco, newDay } = result;
    const diceRestored = dhd !== 0;
    const healthRestored = dhp !== 0;
    const corruptionRestored = dco !== 0

    let length = ''
    let restFlavor;
    let message = false;

    // Summarize the rest duration
    switch (result.restType) {
      case game.syb5e.CONFIG.REST_TYPES.short: 
        restFlavor = "DND5E.ShortRestNormal";
        length = "Short";
        break;
      case game.syb5e.CONFIG.REST_TYPES.long: 
        restFlavor = newDay ? "DND5E.LongRestOvernight" : "DND5E.LongRestNormal";
        length = "Long";
        break;
      case game.syb5e.CONFIG.REST_TYPES.extended: 
        restFlavor = newDay ? "SYB5E.Rest.Flavor.ExtendedRestOvernight" : "SYB5E.Rest.Flavor.ExtendedRestNormal";
        length = "Extended"
        break;
    }

    /* create the message based on if anything was spent or recovered */
    if ( diceRestored || healthRestored || corruptionRestored ) {
      message = `SYB5E.Rest.Results.${length}Full`
    } else {
      /* no hit die or health was restored for this rest */
      message = length !== "Extended" ? `DND5E.${length}RestResultShort` : "SYB5E.Rest.Results.ExtendedShort";
    }

    // Create a chat message
    let chatData = {
      user: game.user.id,
      speaker: {actor, alias: actor.name},
      flavor: game.i18n.localize(restFlavor),
      content: game.i18n.format(message, {
        name: actor.name,
        dhd,
        dhp,
        dco: Math.abs(dco)
      })
    };
    ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));
    return ChatMessage.create(chatData);
  }

/* -------------------------------------------- */

  static getErItemUsesRecovery(items) {
    /* collect any item with 'er' type recharge */
    const type = 'er';

    const erItems = items.filter( i => i.system.uses?.per === type );
    const updates = erItems.map( item => { return { _id: item.id, 'system.uses.value': item.system.uses.max } } );

    return updates;
  }

/* -------------------------------------------- */

  static _restHpGain( actor, type ) {

    const restTypes = game.syb5e.CONFIG.REST_TYPES;
    const actor5eData = actor.system;

    switch (type) {
      case restTypes.short:
        /* no auto gain on short */
        return 0;

      case restTypes.long:
        /* Now find largest Hit Die (tries to accomodate for multiclassing in SYB
         * despite the fact that none should exist)
         */
        const hitDieSize = actor.itemTypes.class.reduce( (acc, item) => {
          const dieSize = parseInt(item.system.hitDice.slice(1))
          return dieSize > acc ? dieSize : acc;
        }, 0);

        const hitPointsRecovered = hitDieSize + actor5eData.abilities.con.mod;

        return hitPointsRecovered;

      case restTypes.extended:
        /* Heal to full on extended */
        return actor5eData.attributes.hp.max;

    }

  }

/* -------------------------------------------- */

  static _getRestHitPointUpdate(actor, type) {

    const rawHpGain = Resting._restHpGain(actor, type);
    const clampedFinalHp = Math.min(rawHpGain + actor.system.attributes.hp.value, actor.system.attributes.hp.max);
    const hpGain = clampedFinalHp - actor.system.attributes.hp.value;

    const hitPointUpdates = {
      "system.attributes.hp.value": clampedFinalHp
    }

    return {hitPointUpdates, hpGain}
  }

/* -------------------------------------------- */

  static _corruptionHealUpdate(currentCorruption, amount) {

    const newTemp = Math.max(currentCorruption.temp - amount, 0)
    return {
      [game.syb5e.CONFIG.PATHS.corruption.temp]: newTemp
    }

  }

/* -------------------------------------------- */

  static async corruptionHeal(actor, amount) {
    
    const update = Resting._corruptionHealUpdate(actor.corruption, amount)

    await actor.update(update);
  }

/* -------------------------------------------- */

  static async expendHitDie(actor, denomination) {

    //FROM DND5E/entity.js#rollHitDie

    // If no denomination was provided, choose the first available
    let cls = null;
    if (!denomination) {
      cls = actor.itemTypes.class.find(c => c.system.hitDiceUsed < c.system.levels);
      if (!cls) return null;
      denomination = cls.system.hitDice;
    }

    // Otherwise locate a class (if any) which has an available hit die of the requested denomination
    else {
      cls = actor.items.find(i => {
        const d = i.system
        return (d.hitDice === denomination) && ((d.hitDiceUsed || 0) < (d.levels || 1));
      });
    }

    // If no class is available, display an error notification
    if (!cls) {
      ui.notifications.error(game.i18n.format("DND5E.HitDiceWarn", {
        name: actor.name,
        formula: denomination
      }));
      return null;
    }

    // Adjust actor data
    await cls.update({
      "system.hitDiceUsed": cls.system.hitDiceUsed + 1
    });
  }
}

