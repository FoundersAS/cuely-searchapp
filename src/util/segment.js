import Analytics from 'analytics-node';
import { isBackendDevelopment } from './const.js';
import { Prefs } from './prefs.js';

class SegmentConnector {
  constructor(writeKey) {
    this.user = Prefs.getAll().account;
    this.analytics = new Analytics(writeKey);
  }

  identify() {
    if (!this.user.segmentIdentified) {
      const userid = isBackendDevelopment() ? 'developer' : this.user.userid;

      this.analytics.identify({
        userId: userid,
        traits: {
          name: this.user.name,
          email: this.user.email,
          company: this.user.email.split('@')[1]
        }
      });
      this.user.segmentIdentified = true;
      Prefs.saveAccount(this.user);
      console.log(`Segment identify sent: ${userid}, ${this.user.name}, ${this.user.email}`);
    }
  } 
}

let Segment;

function initSegment(writeKey) {
  if (!Segment) {
    Segment = new SegmentConnector(writeKey);
  }
  return Segment;
}

export { Segment, initSegment }
