import Service from '@ember/service';
import DarkReader from 'darkreader';

export default class LightControlService extends Service {  
  
  get isDark(){
    console.debug(DarkReader.isEnabled());
    return DarkReader.isEnabled();
  }

  // To turn on/of DarkReader:
  async toggleMode(status){    
    if(status){
      await DarkReader.enable({brightness: 100, contrast: 100, sepia: 0}, {disableStyleSheetsProxy: false});
    } else {
      await DarkReader.disable(); 
    }
  }

}
