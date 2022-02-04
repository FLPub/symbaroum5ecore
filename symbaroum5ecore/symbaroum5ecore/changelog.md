## v0.2.3
* dnd5e system patch: Weapons that use ammunition but use a save instead of an attack roll will now both consume and use its ammunition's damage on its damage roll. Ex. Firetube uses a cone AoE with a save, but its damage is determined entirely by its ammunition.
  * Note: As with attack roll ammo, the damage type of the ammunition is ignored. Use die labels (e.g. `1d10[fire]`) to include ammunition specific damage.
* Moved needed syb5e system initialization to system's `init` stage.
* Fixed stock short/long rest functionality.

### Known Issues
* Origins which suffer max HP damage instead of corruption are not fully supported. Adjustments can be made by hand, but casting spells will, currently, always add corruption.
* Certain spells and abilities modify how much corruption a spell generates or adds corruption damage to origin/class features. This is unsupported currently.