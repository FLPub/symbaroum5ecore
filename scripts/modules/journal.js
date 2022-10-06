export class SymbaroumJournalSheet extends JournalSheet {
    get journal() {
        return this.object;
    }

    _onConfigureSheet(event) {
        event.preventDefault();
        new DocumentSheetConfig(this.journal, {
            top: this.position.top + 40,
            left: this.position.left + ((this.position.width - 400) / 2)
        }).render(true);
    };
}

export class SymbaroumWide extends SymbaroumJournalSheet {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.width = 1268
        // edit below for a custom css class
        options.classes.push('symbaroum-dnd5e-mod');
        return options;
    }
}


// import { COMMON } from '../common.js';
// export class SymbaroumJournalSheet extends JournalSheet {
//     static NAME = 'SymbaroumJournalSheet';
//     get journal() {
//         return this.object;
//     }

//     static register() {
//         this.globals();
//         this.build();
//     }

//     static build() {
//         this.buildWideSheet(SymbaroumJournalSheet);
//     }

//     /* -------------------------------------------- */

//     static globals() {
//         // game.syb5e.journalClasses = [];
//         game.syb5e.journalClasses = [];

//     }

//     static defaults(journalClass) {
//         journalClass['NAME'] = journalClass.name;

//         // TODO is this field in COMMON needed?
//         COMMON[journalClass.NAME] = {
//             scope: 'syb5e',
//             journalClass,
//         };

//         /* need to use our own defaults to set our defaults */
//         COMMON[journalClass.NAME].id = `${COMMON[journalClass.NAME].scope}.${COMMON[journalClass.NAME].journalClass.name}`;

//         /* store this information in a better place */
//         game.syb5e.journalClasses.push(COMMON[journalClass.NAME]);
//     }



//     _onConfigureSheet(event) {
//         event.preventDefault();
//         new DocumentSheetConfig(this.journal, {
//             top: this.position.top + 40,
//             left: this.position.left + ((this.position.width - 400) / 2)
//         }).render(true);
//     };

//     static buildWideSheet(parentClass) {
//         class SymbaroumWide extends parentClass {
//             static NAME = 'SymbaroumWide';
//             static get defaultOptions() {
//                 const options = super.defaultOptions;
//                 options.width = 1268
//                 // edit below for a custom css class
//                 options.classes.push('symbaroum-dnd5e-mod');
//                 return options;
//             }

//             static register() {
//                 this.defaults();
//                 /* register our sheet */
//                 Journal.registerSheet('syb5e', SymbaroumWide, {
//                     makeDefault: false,
//                     label: COMMON.localize('SYB5E.journal.widejournal.name'),
//                 });
//             }

//             static defaults() {
//                 SymbaroumJournalSheet.defaults(this);
//             }
//         }
//         SymbaroumWide.register();

//     }
// }