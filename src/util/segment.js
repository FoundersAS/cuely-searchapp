import Analytics from 'analytics-node';
import { isDevelopment } from './const.js';
import { Prefs } from './prefs.js';

class SegmentConnector {
  constructor(writeKey) {
    this.user = Prefs.getAll().account;
    this.analytics = new Analytics(writeKey);
  }

  _userId(name) {
    return isDevelopment() ? 'developer_' + name : this.user.userid;
  }

  identify() {
    if (!this.user.segmentIdentified) {
      let name, company;
      [name, company] = this.user.email.split('@');
      const userid = this._userId(name);

      this.analytics.identify({
        userId: userid,
        traits: {
          name: this.user.name,
          email: this.user.email,
          company: company
        }
      });
      this.user.segmentIdentified = true;
      Prefs.saveAccount(this.user);
      console.log(`Segment identify sent: ${userid}, ${this.user.name}, ${this.user.email}`);
      return true;
    }
    return false;
  } 

  track(eventName, eventProps) {
    if (this.user.segmentIdentified) {
      this.analytics.track({
        userId: this._userId(),
        event: eventName,
        properties: eventProps
      });
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
