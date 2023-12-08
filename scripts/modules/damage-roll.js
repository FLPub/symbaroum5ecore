import { COMMON } from '../common.js'
//import { logger } from '../logger.js';

export class DamageRollSyb5e {

  static NAME = 'DamageRollSyb5e';

  static register() {
    this.patch()
    this.hooks();
  }

  static parent = {}

  static hooks() {
    Hooks.on('dnd5e.preRollDamage', (item, rollConfig) => {
      /* inject needed properties (deep impact) */
      foundry.utils.mergeObject(rollConfig.data.item, {properties: {dim: item.properties.dim}});
    });
  }

  static patch() {

    const target = CONFIG.Dice.DamageRoll.prototype
    const targetPath = 'CONFIG.Dice.DamageRoll.prototype'

    const patches = {
      configureDamage: {
        value: DamageRollSyb5e.configureDamage,
        mode: 'WRAPPER'
      },
    }

    COMMON.patch(target, targetPath, patches);
  }

  static configureDamage(wrapped, ...args) {

    /* if this is a deep impact weapon on a crit, add in an extra '@mod' term */
    if (this.isCritical && this.data.item?.properties?.dim) {
      this.terms.push(new OperatorTerm({operator: "+"}));
      this.terms.push(new NumericTerm({number: this.data.mod}, {flavor: COMMON.localize("SYB5E.Item.WeaponProps.DeepImpact")}));
      this.options.flavor += ` (${COMMON.localize('SYB5E.Item.WeaponProps.DeepImpact')})`
    }
    
    return wrapped(...args);
  }

}
