import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import { API_ROOT } from './util/const.js';
require('../css/style-settings.scss');

export default class Login extends Component {
  constructor(props){
    super();
    this.state = {
      edit: false
    }
  }

  componentDidMount() {
    ipcRenderer.on('login-edit', (event, arg) => {
      console.log('pinko');
      this.setState({
        edit: true
      });
    });
    ipcRenderer.send('login-load');
  }

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
        {this.state.edit ? (
        <div className="login_actions">
          <div className="button_section">
            <a href="#" onClick={this.handleClick}>Close</a>
          </div>
        </div>) : null}
      </div>
    );
  }
}
