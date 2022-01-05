import { COMMON } from './common.js'

/* CONFIG class for syb5e data.
 * Stored in 'game.syb5e.CONFIG'
 */
export class SYB5E {

  static NAME = "SYB5E_CONFIG";

  static register() {
    this.globals();
  }

  static get CONFIG(){
    return globalThis.game.syb5e.CONFIG;
  }

  /* setting our global config data */
  static globals() {
    globalThis.game.syb5e.CONFIG = {};

    /* The keys for the syb5e data flags */
    globalThis.game.syb5e.CONFIG.FLAG_KEY = {
      initialized: 'initialized',
      corruption: {
        root: 'corruption',
        ability: 'ability',
        temp: 'temp',
        permanent: 'permanent',
        value: 'value',
        max: 'max'
      },
      manner: 'manner',
      shadow: 'shadow',
      favored: 'favored'
    };

    /* keys for spell progression */
    globalThis.game.syb5e.CONFIG.SPELL_PROG_KEY = {
      full: 'full',
      half: 'half'
    }

    /* The default values for syb5e actor data */
    const corr_name = this.CONFIG.FLAG_KEY.corruption;

    globalThis.game.syb5e.CONFIG.DEFAULT_FLAGS = {
      [COMMON.DATA.name]: {
        [this.CONFIG.FLAG_KEY.initialized]: true,
        [corr_name.root]: {
          [corr_name.ability]: 'cha',
          [corr_name.temp]: 0,
          [corr_name.permanent]: 0,
          [corr_name.value]: 0,
          [corr_name.max]: 0
        },
        [this.CONFIG.FLAG_KEY.manner]: '',
        [this.CONFIG.FLAG_KEY.shadow]: '',
      }
    }

    /* The default values for syb5e item data */
    globalThis.game.syb5e.CONFIG.DEFAULT_ITEM = {
      [COMMON.DATA.name]: {
        //[this.CONFIG.FLAG_KEY.initialized]: true,
        [this.CONFIG.FLAG_KEY.favored]: false
      }
    }

    /* paths for syb flag data */
    const key = this.CONFIG.FLAG_KEY;
    const root = `flags.${COMMON.DATA.name}`;

    globalThis.game.syb5e.CONFIG.PATHS = {
      [key.initialized]: `${root}.${key.initialized}`,
      [key.corruption.root]: {
        [key.corruption.ability]: `${root}.${key.corruption.root}.${key.corruption.ability}`,
        [key.corruption.temp]: `${root}.${key.corruption.root}.${key.corruption.temp}`,
        [key.corruption.permanent]: `${root}.${key.corruption.root}.${key.corruption.permanent}`,
        [key.corruption.value]: undefined, //getter only
        [key.corruption.max]: `${root}.${key.corruption.root}.${key.corruption.max}`,
      },
      [key.manner]: `${root}.${key.manner}`,
      [key.shadow]: `${root}.${key.shadow}`,
      [key.favored]: `${root}.${key.favored}`
    }

    /* spell progression (max spell level) */
    const keys = this.CONFIG.SPELL_PROG_KEY;

    globalThis.game.syb5e.CONFIG.SPELL_PROGRESSION = {
      [keys.full]: [0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,9,9],
      [keys.half]: [0,1,1,2,2,2,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4]
    }

    /* Spell Level translations (unfortunately dnd5e does not provide these) */
    globalThis.game.syb5e.CONFIG.LEVEL_SHORT = [
      'SYB5E.Level.Zeroth',
      'SYB5E.Level.First',
      'SYB5E.Level.Second',
      'SYB5E.Level.Third',
      'SYB5E.Level.Fourth',
      'SYB5E.Level.Fifth',
      'SYB5E.Level.Sixth',
      'SYB5E.Level.Seventh',
      'SYB5E.Level.Eighth',
      'SYB5E.Level.Nineth',
    ]

    globalThis.game.syb5e.CONFIG.REST_TYPES = {
      short: 'short',
      long: 'long',
      extended: 'ext'
    }

  }

}
