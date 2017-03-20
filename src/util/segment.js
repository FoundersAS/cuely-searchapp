import Analytics from 'analytics-node';
import { isDevelopment } from './const.js';
import { Prefs } from './prefs.js';

class SegmentConnector {
  constructor(writeKey) {
    this.user = Prefs.getAll().account;
    this.analytics = new Analytics(writeKey);
  }

  _userId() {
    if (isDevelopment()) {
      return 'developer_' + this.user.email.split('@')[0];
    } else {
      // this weird hack of treating users below id 25 differently is because of Pipetop's Intercom account
      // ... users of old Pipetop were deleted from Intercom, but Intercom still keeps this information somewhere,
      // so ids of new users and old users become mixed up. Having realized this a bit late (after onboarding first
      // 24 users), we decided to bump DB id by 10000, except for first 24 users.
      return this.user.userid < 25 ? this.user.userid : this.user.userid + 10000;
    }
    return isDevelopment() ? 'developer_' + this.user.email.split('@')[0] : this.user.userid;
  }

  identify() {
    if (!this.user.segmentIdentified) {
      let userid = this._userId();

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
