import Service from '@ember/service';
import DarkReader from 'darkreader';

export default class LightControlService extends Service {
  
  get isDark(){
    console.log(DarkReader.isEnabled());
    return DarkReader.isEnabled();
  }

  // To turn on/of DarkReader:
  toggleMode(status){
    if(status){
      DarkReader.enable({
          brightness: 100,
          contrast: 100,
          sepia: 0
      });      
    } else {
      DarkReader.disable(); 
    }
  }

}
