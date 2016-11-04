import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import { API_ROOT } from './util/const.js';
require('../css/style-settings.scss');

export default class Login extends Component {
  handleClick(e) {
    e.preventDefault();
    ipcRenderer.send('close-login');
  }

  render() {
    return (
      <div>
        <div className="login_frame">
          <iframe src={API_ROOT} />
        </div>
        <div className="login_actions">
          <a href="#" onClick={this.handleClick}>Close</a>
        </div>
      </div>
    );
  }
}
