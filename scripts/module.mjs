
/**
 * Main Module Organizational Tools
 */
//import { MyLogger } from './my-logger.js';

/**
 * Sub Modules
 */
//import { MyClass } from './modules/my-class.js'

/**
 * Sub Apps
 */
//import { MyDialog } from './apps/my-dialog.js';
export class MODULE {
  static SUB_MODULES = {
    //MyLogger,
    //MyClass
  };

  static SUB_APPS = {
    //MyDialog  
  }
  
  static build() {
    //all startup tasks needed before sub module initialization
  }
}



/*
  Initialize Module
*/
MODULE.build();

/*
  Initialize all Sub Modules
*/
Hooks.on(`setup`, () => {

  Object.values(MODULE.SUB_MODULES).forEach(cl => cl.register());

  //GlobalTesting (adds all imports to global scope)
  //Object.entries(MODULE.SUB_MODULES).forEach(([key, cl])=> window[key] = cl);
  //Object.entries(MODULE.SUB_APPS).forEach(([key, cl])=> window[key] = cl);
});



/*****Example Sub-Module Class******

export class MyClass {

  static register() {
    //all initialization tasks
  }
}

*/

