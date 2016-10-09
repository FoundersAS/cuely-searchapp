import React, { Component } from 'react';
import { API_ROOT } from './const.js';

export default class Login extends Component {
  render() {
    return (
      <div>
        <div className="login_frame">
          <iframe src={API_ROOT} />
        </div>
        <div className="login_actions">
        PINKO
        </div>
      </div>
    );
  }
}
