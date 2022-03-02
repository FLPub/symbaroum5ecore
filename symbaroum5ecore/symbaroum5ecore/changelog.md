## 0.5.0
* Overhaul to item corruption generation system.
  * New item rollData field: `@item.corruption.total/expression/summary`
    * `total`: Final numerical result of the corruption generated from the use of this item.
    * `expression`: Final (string) expression that generated the total corruption generated.
    * `summary`: Display string showing the corruption expression and its result in `<expression> (<total>)` form.
  * This field is only updated when the item is rolled (either via the character sheet or `item.roll()`).
  * Simplified custom corruption expression display when upcasting a spell.
  * Non-spell items will still need to have an `OVERRIDE` corruption formula set. Spell items will use the default spell corruption scaling rules, which consider favored state and spell level, unless overriden or modified.
  * Non-spell items now only have an `OVERRIDE` corruption mode as they have no default corruption expression to modify via `ADD`/`MULTIPLY`

### Known Issues
  * "Thoroughly Corrupted" state is not implemented and currently represented with the NPC's corruption values being set to its computed maximum.

## 0.4.0
* Deep Impact weapon property now automatically considered when rolling critical damage
* Custom corruption expressions activated when the 'mode' is populated. Only overrides non-blank fields. Use-case: Spells/abilities that normally generate corruption instead generating zero corruption can be expressed as ` (blank) | MULTIPLY | 0 `
* Removed alignment field from SYB5E sheets.
* Merged in WIP system settings

## v0.3.1
* Fixed NPC sheet getData bug that was erasing 'manner' when sheet was closed.

## v0.3.0
* "Soulless" special trait added (used for Dwarves and Undead) which mirrors any corruption damage to max hp (and caps current HP accordingly).
* Corruption fields now accept +/- delta values
* All items now have a "Corruption" field in their details which allow them to modify the corruption the item normally generates or adds corruption on use to items (such as features) that do not normally cause corruption.
* Spell school "None" added primarily for Troll Singer Songs. They are treated as favored cantrips under the hood.

### Known Issues
* Non-leveled-spell items (cantrips, weapons, features, etc) that generate corruption (using the corruption override) will NOT present a ability use dialog to optionally ignore the corruption gain.

## v0.2.3
* dnd5e system patch: Weapons that use ammunition but use a save instead of an attack roll will now both consume and use its ammunition's damage on its damage roll. Ex. Firetube uses a cone AoE with a save, but its damage is determined entirely by its ammunition.
  * Note: As with attack roll ammo, the damage type of the ammunition is ignored. Use die labels (e.g. `1d10[fire]`) to include ammunition specific damage.
* Moved needed syb5e system initialization to system's `init` stage.
* Fixed stock short/long rest functionality.

### Known Issues
* Origins which suffer max HP damage instead of corruption are not fully supported. Adjustments can be made by hand, but casting spells will, currently, always add corruption.
* Certain spells and abilities modify how much corruption a spell generates or adds corruption damage to origin/class features. This is unsupported currently.
