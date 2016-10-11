!function() {

var WORKSHOP = 'iclc_workshop_2016'

var WorkshopStorage = {
  values: null,

  init: function() {
    Storage.prototype.setObject = function( key, value ) { 
      this.setItem( key, JSON.stringify( value ) ); 
    }

    Storage.prototype.getObject = function( key ) { 
      var value = this.getItem( key ); 
      return value && JSON.parse( value ); 
    }
    
    this.values = localStorage.getObject( WORKSHOP )

    if( this.values === null ) {
      this.values = {
        lastSavedtate: null,
        userFiles: {}
      }

      this.save()
    }   
  },

  save : function() {
    localStorage.setObject( WORKSHOP, this.values );
  },

  getLocalStorage: function() {
    return this.values
  },

  getFileWithName: function( name ) {
    return this.values.userFiles[ name ]
  },

  saveFileWithName: function( name, txt ) {
    this.values.userFiles[ name ] = txt
    this.save()
  },

  /* this file is saved after every keystroke(?). It represents the
   * current state of the editors, and is automatically restored upon
   * refresh.
   */

  saveDefaultFile: function() {

  },
}

window.WorkshopStorage = WorkshopStorage

})()
