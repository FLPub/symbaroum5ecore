import { COMMON } from '../common.js'
//import { logger } from '../logger.js';

export class DamageRollSyb5e {

  static NAME = 'DamageRollSyb5e';

  static register() {
    this.patch()
  }

  static parent = {}

  static patch() {

    const target = CONFIG.Dice.DamageRoll.prototype;

    const superFn = {
      configureDamage: {
        value: DamageRollSyb5e.configureDamage
      },
    }

    Object.entries(superFn).forEach( ([fn, override]) => {

      /* get the current version */
      const original = Object.getOwnPropertyDescriptor(target, fn)

      /* if our copy already has a value here, we dont want to overwrite */
      if ( original && !Object.hasOwn(this.parent, fn) ){ 
        Object.defineProperty(this.parent, fn, original);
      }

      /* set the replacement function */
      Object.defineProperty(target, fn, mergeObject(original ?? {}, override));

    })
     
  }

  static configureDamage() {
    /* if this is a deep impact weapon on a crit, add in an extra '@mod' term */
    if (this.isCritical && this.data.item?.properties?.dim) {
      this.terms.push(new OperatorTerm({operator: "+"}));
      this.terms.push(new NumericTerm({number: this.data.mod}, {flavor: COMMON.localize("SYB5E.Item.WeaponProps.DeepImpact")}));
      this.options.flavor += ` (${COMMON.localize('SYB5E.Item.WeaponProps.DeepImpact')})`
    }
    
    return DamageRollSyb5e.parent.configureDamage.call(this);
  }

}
